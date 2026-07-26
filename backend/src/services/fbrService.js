const axios = require('axios');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const FBR = require('../config/fbr');

class FBRService {

  async submitInvoiceToFBR(invoice, invoiceItems, company, customer) {
    try {
      // INV-1: Only submit if not already accepted — prevent double IRN
      if (invoice.fbrStatus === 'ACCEPTED' && invoice.fbrInvoiceNumber) {
        return { success: true, fbrInvoiceNumber: invoice.fbrInvoiceNumber, alreadyAccepted: true };
      }

      this.validateInvoiceForFBR(invoice, company, customer);
      const payload = this.buildFBRPayload(invoice, invoiceItems, company, customer);
      const payloadStr = JSON.stringify(payload);

      // Step 1: HTTP validate call — dry run, no IRN issued
      const validateResult = await this.validateWithFBR(payload);
      if (!validateResult.valid) {
        const msg = FBR.translateError(JSON.stringify(validateResult.error));
        throw new Error(`FBR Validate: ${msg}`);
      }

      // Step 2: Real submission — only after clean validate
      const response = await this.submitWithRetry(payloadStr, payload, invoice.id);

      if (response.success) {
        const fbrInvoiceNumber = response.data?.InvoiceNumber || response.data?.invoiceNumber;
        const qrCodeData = await this.generateQRCode(
          fbrInvoiceNumber, company.ntn,
          invoice.totalInvoiceAmount, invoice.invoiceDate
        );

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            fbrInvoiceNumber,
            fbrQrCode: qrCodeData,
            fbrStatus: 'ACCEPTED',
            status: 'ACCEPTED',
            submittedAt: new Date(),
          },
        });

        // Upsert — FBRSubmission @@unique([invoiceId]) prevents duplicate records (INV-2)
        await prisma.fBRSubmission.upsert({
          where: { invoiceId: invoice.id },
          create: {
            invoiceId: invoice.id,
            payload: payloadStr,
            response: JSON.stringify(response.data),
            fbrInvoiceNumber,
            qrCodeData,
            status: 'ACCEPTED',
            submittedAt: new Date(),
            acceptedAt: new Date(),
          },
          update: {
            response: JSON.stringify(response.data),
            fbrInvoiceNumber,
            qrCodeData,
            status: 'ACCEPTED',
            submittedAt: new Date(),
            acceptedAt: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: invoice.createdByUserId,
            action: 'FBR_SUBMIT_SUCCESS',
            entityType: 'Invoice',
            entityId: invoice.id,
            newValues: JSON.stringify({ fbrInvoiceNumber, status: 'ACCEPTED' }),
            description: `Invoice ${invoice.invoiceNumber} accepted by FBR — IRN: ${fbrInvoiceNumber}`,
          },
        }).catch(() => {});

        return { success: true, fbrInvoiceNumber, qrCode: qrCodeData };
      } else {
        throw new Error(response.error || 'FBR submission failed');
      }
    } catch (error) {
      const userMessage = FBR.translateError(error.message);
      console.error(`FBR Submission Error [${invoice.invoiceNumber}]:`, error.message);

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          fbrStatus: 'ERROR',
          fbrLastError: error.message.slice(0, 500),
          fbrRetryCount: { increment: 1 },
        },
      }).catch(() => {});

      await prisma.auditLog.create({
        data: {
          userId: invoice.createdByUserId,
          action: 'FBR_SUBMIT_ERROR',
          entityType: 'Invoice',
          entityId: invoice.id,
          description: `Invoice ${invoice.invoiceNumber} rejected — ${error.message.slice(0, 200)}`,
        },
      }).catch(() => {});

      const err = new Error(userMessage);
      err.fbrRawError = error.message;
      throw err;
    }
  }

  buildFBRPayload(invoice, invoiceItems, company, customer) {
    // Determine dominant tax rate for scenario resolution
    const dominantTaxRate = invoiceItems.length > 0 ? invoiceItems[0].taxRate : 18;
    const scenarioId = FBR.resolveScenarioId(invoice.invoiceType, dominantTaxRate);

    const items = invoiceItems.map(item => {
      const lineItem = {
        HSCode:             item.hsCode,
        ProductCode:        item.productCode,
        ProductDescription: item.productDescription,
        SaleType:           item.saleType || 'Goods',
        Quantity:           parseFloat(item.quantity),
        UoM:                this.mapUnitOfMeasure(item.unitOfMeasure),
        UnitPrice:          parseFloat(item.unitPrice),
        Discount:           parseFloat(item.discountAmount || 0),
        TaxableValue:       parseFloat(item.taxableValue),
        TaxRate:            parseFloat(item.taxRate),
        TaxAmount:          parseFloat(item.taxAmount),
        FurtherTax:         parseFloat(item.furtherTax || 0),
        SalesTaxWithheldAtSource: parseFloat(item.salesTaxWithheldAtSource || 0),
        FEDPayable:         parseFloat(item.fedPayable || 0),
        TotalAmount:        parseFloat(item.totalAmount),
      };

      // Third Schedule: tax is on MRP, not transaction value
      if (item.fixedNotifiedValueOrRetailPrice) {
        lineItem.FixedNotifiedValueOrRetailPrice = parseFloat(item.fixedNotifiedValueOrRetailPrice);
      }
      // SRO fields — only include if set (reduced/enhanced rates)
      if (item.sroScheduleNo) lineItem.SROScheduleNo = item.sroScheduleNo;
      if (item.sroItemSerialNo) lineItem.SROItemSerialNo = item.sroItemSerialNo;

      return lineItem;
    });

    const payload = {
      InvoiceType:           FBR.invoiceTypeMap[invoice.invoiceType] || 1,
      InvoiceDate:           new Date(invoice.invoiceDate).toISOString().split('T')[0],
      SellerBusinessName:    company.businessName,
      SellerProvince:        company.province,
      SellerNTNCNIC:         company.ntn,
      SellerAddress:         company.address,
      SellerSTRN:            company.strn,
      BuyerRegistrationType: customer.registrationType,
      BuyerNTNCNIC:          customer.ntn || customer.cnic || '',
      BuyerBusinessName:     customer.businessName,
      BuyerProvince:         customer.province || '',
      BuyerAddress:          customer.address || '',
      BuyerSTRN:             customer.strn || '',
      InvoiceRefNo:          invoice.invoiceNumber,
      ScenarioId:            scenarioId,
      Items:                 items,
    };

    // Credit/Debit Note must reference the original FBR-issued IRN (not local invoice number)
    if ((invoice.invoiceType === 'DEBIT_NOTE' || invoice.invoiceType === 'CREDIT_NOTE') && invoice.referenceInvoiceIRN) {
      payload.ReferenceInvoiceNo = invoice.referenceInvoiceIRN;
    }

    return payload;
  }

  async validateWithFBR(payload) {
    try {
      await axios.post(
        `${FBR.baseUrl}${FBR.endpoints.validate}`,
        payload,
        {
          headers: { 'Authorization': `Bearer ${FBR.token}`, 'Content-Type': 'application/json' },
          timeout: FBR.timeoutMs,
        }
      );
      return { valid: true };
    } catch (error) {
      if (error.response && error.response.status < 500) {
        return { valid: false, error: error.response.data };
      }
      // Network/5xx — don't block submission for FBR downtime
      console.warn('[FBR] Validate endpoint unreachable — proceeding to post:', error.message);
      return { valid: true };
    }
  }

  async submitWithRetry(payloadStr, payloadObj, invoiceId, attempt = 0) {
    try {
      // INV-4: token comes from config getter — never logged or stored
      const response = await axios.post(
        `${FBR.baseUrl}${FBR.endpoints.post}`,
        payloadObj,
        {
          headers: {
            'Authorization': `Bearer ${FBR.token}`,
            'Content-Type': 'application/json',
          },
          timeout: FBR.timeoutMs,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      const isRetryable = !error.response || error.response.status >= 500 || error.response.status === 429;
      if (isRetryable && attempt < FBR.maxRetries) {
        const delay = FBR.retryBaseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        return this.submitWithRetry(payloadStr, payloadObj, invoiceId, attempt + 1);
      }

      await prisma.fBRSubmission.upsert({
        where: { invoiceId },
        create: {
          invoiceId,
          payload: payloadStr,
          response: JSON.stringify(error.response?.data || null),
          status: 'ERROR',
          errorMessage: error.message.slice(0, 500),
          retryCount: attempt,
          lastRetryAt: new Date(),
        },
        update: {
          response: JSON.stringify(error.response?.data || null),
          status: 'ERROR',
          errorMessage: error.message.slice(0, 500),
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      }).catch(dbErr => console.error('Failed to save FBR error record:', dbErr.message));

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  }

  mapUnitOfMeasure(uom) {
    return FBR.uomCodes.includes(uom) ? uom : 'NUM';
  }

  /**
   * Real-time buyer registration check against FBR's reference API — does the
   * NTN/CNIC exist and is it REGISTERED or UNREGISTERED for sales tax.
   * [VERIFY] Endpoint path + response field names (see config/fbr.js) — this
   * is best-effort until confirmed against the live PRAL API, so callers must
   * treat a failed/unreachable check as "unknown," never as "invalid." It
   * never blocks invoice creation on its own — format validation (INV-6)
   * remains the hard gate.
   */
  async verifyRegistration(regNo) {
    if (!regNo || !/^([0-9]{7}|[0-9]{13})$/.test(regNo)) {
      return { verified: false, reason: 'NTN 7 digits ya CNIC 13 digits hona chahiye' };
    }
    try {
      const response = await axios.get(
        `${FBR.referenceBaseUrl}${FBR.referenceEndpoints.registrationType}`,
        {
          params: { REGNO: regNo },
          headers: { 'Authorization': `Bearer ${FBR.token}` },
          timeout: FBR.timeoutMs,
        }
      );
      const data = response.data || {};
      // [VERIFY] field names below — confirm against the live response shape.
      const statusStr = String(data.STATUS || data.status || data.REGISTRATION_TYPE || '').toUpperCase();
      const registrationType = statusStr.includes('UN') ? 'UNREGISTERED'
        : statusStr.includes('REG') ? 'REGISTERED'
        : null;

      return {
        verified: true,
        registrationType,
        businessName: data.NAME || data.businessName || data.REGISTERED_NAME || null,
        raw: data,
      };
    } catch (error) {
      console.warn('[FBR] Registration verify unreachable:', error.message);
      return { verified: false, reason: FBR.translateError(error.message) };
    }
  }

  validateInvoiceForFBR(invoice, company, customer) {
    const errors = [];

    // INV-6: Buyer registration — 7-digit NTN or 13-digit CNIC
    if (!company.ntn || !/^[0-9]{7}$/.test(company.ntn)) {
      errors.push('Company NTN 7 digits hona chahiye');
    }
    if (!company.strn || !/^[0-9]{13}$/.test(company.strn)) {
      errors.push('Company STRN 13 digits hona chahiye');
    }
    if (!customer.businessName) {
      errors.push('Customer ka business name zaroori hai');
    }
    if (customer.registrationType === 'REGISTERED') {
      if (!customer.ntn && !customer.cnic) {
        errors.push('Registered customer ka NTN ya CNIC zaroori hai');
      }
      if (customer.ntn && !/^[0-9]{7}$/.test(customer.ntn)) {
        errors.push('Customer NTN 7 digits hona chahiye');
      }
      if (customer.cnic && !/^[0-9]{13}$/.test(customer.cnic)) {
        errors.push('Customer CNIC 13 digits hona chahiye (bina dashes ke)');
      }
    }

    if (errors.length > 0) throw new Error(`FBR Validation: ${errors.join(', ')}`);
  }

  async generateQRCode(fbrInvoiceNumber, sellerNtn, totalAmount, invoiceDate) {
    const date = new Date(invoiceDate).toISOString().split('T')[0];
    const qrData = `${fbrInvoiceNumber}|${sellerNtn}|${totalAmount}|${date}`;
    return QRCode.toDataURL(qrData);
  }
}

module.exports = new FBRService();
