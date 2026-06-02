const axios = require('axios');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class FBRService {
  constructor() {
    this.baseUrl = process.env.FBR_MODE === 'production'
      ? process.env.FBR_PRODUCTION_URL
      : process.env.FBR_SANDBOX_URL;
    this.token = process.env.FBR_SECURITY_TOKEN;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
  }

  // Main method to submit invoice to FBR
  async submitInvoiceToFBR(invoice, invoiceItems, company, customer) {
    try {
      // Validate required FBR fields
      this.validateInvoiceForFBR(invoice, company, customer);

      // Build FBR payload
      const payload = this.buildFBRPayload(invoice, invoiceItems, company, customer);

      // Submit to FBR with retry logic
      const response = await this.submitWithRetry(payload, invoice.id);

      if (response.success) {
        // Extract FBR invoice number and QR code
        const fbrInvoiceNumber = response.data?.InvoiceNumber || response.data?.invoiceNumber;
        const qrCodeData = await this.generateQRCode(fbrInvoiceNumber, company.ntn, invoice.totalInvoiceAmount, invoice.invoiceDate);

        // Update invoice with FBR submission details
        const updatedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            fbrInvoiceNumber,
            fbrQrCode: qrCodeData,
            fbrStatus: 'ACCEPTED',
            status: 'ACCEPTED',
            submittedAt: new Date(),
          },
        });

        // Save FBR submission record
        await prisma.fBRSubmission.create({
          data: {
            invoiceId: invoice.id,
            payload,
            response: response.data,
            fbrInvoiceNumber,
            qrCodeData,
            status: 'ACCEPTED',
            submittedAt: new Date(),
            acceptedAt: new Date(),
          },
        });

        return {
          success: true,
          message: 'Invoice submitted to FBR successfully',
          fbrInvoiceNumber,
          qrCode: qrCodeData,
          invoice: updatedInvoice,
        };
      } else {
        throw new Error(response.error || 'FBR submission failed');
      }
    } catch (error) {
      console.error('FBR Submission Error:', error);

      // Update invoice with error status
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          fbrStatus: 'ERROR',
          fbrLastError: error.message,
          status: 'ERROR',
        },
      });

      throw error;
    }
  }

  // Build FBR-compliant JSON payload
  buildFBRPayload(invoice, invoiceItems, company, customer) {
    const items = invoiceItems.map(item => ({
      HSCode: item.hsCode,
      ProductCode: item.productCode,
      ProductDescription: item.productDescription,
      Quantity: parseFloat(item.quantity),
      UoM: this.mapUnitOfMeasure(item.unitOfMeasure),
      UnitPrice: parseFloat(item.unitPrice),
      Discount: parseFloat(item.discountAmount),
      TaxableValue: parseFloat(item.taxableValue),
      TaxRate: parseFloat(item.taxRate),
      TaxAmount: parseFloat(item.taxAmount),
      TotalAmount: parseFloat(item.totalAmount),
    }));

    return {
      InvoiceType: this.mapInvoiceType(invoice.invoiceType),
      InvoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
      SellerBusinessName: company.businessName,
      SellerProvince: company.province,
      SellerNTNCNIC: company.ntn,
      SellerAddress: company.address,
      SellerSTRN: company.strn,
      BuyerRegistrationType: customer.registrationType,
      BuyerNTNCNIC: customer.ntn || customer.cnic || '',
      BuyerBusinessName: customer.businessName,
      BuyerProvince: customer.province,
      BuyerAddress: customer.address,
      BuyerSTRN: customer.strn || '',
      InvoiceRefNo: invoice.invoiceNumber,
      ScenarioId: 'SN001',
      Items: items,
    };
  }

  // Submit with exponential backoff retry logic
  async submitWithRetry(payload, invoiceId, attempt = 0) {
    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      const hasAttemptsLeft = attempt < this.maxRetries;

      if (isRetryable && hasAttemptsLeft) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`Retrying FBR submission (attempt ${attempt + 1}/${this.maxRetries}) after ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.submitWithRetry(payload, invoiceId, attempt + 1);
      }

      // Save failed submission
      await this.saveFBRSubmissionError(invoiceId, payload, error, attempt);

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  }

  // Save FBR submission error to database
  async saveFBRSubmissionError(invoiceId, payload, error, retryCount) {
    await prisma.fBRSubmission.create({
      data: {
        invoiceId,
        payload,
        response: error.response?.data || null,
        status: 'ERROR',
        errorMessage: error.message,
        retryCount,
        lastRetryAt: new Date(),
      },
    }).catch(err => console.error('Error saving FBR submission record:', err));
  }

  // Check if error is retryable (network, timeout, 5xx errors)
  isRetryableError(error) {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 408 || status === 429;
  }

  // Map Invoice Type enum to FBR format
  mapInvoiceType(invoiceType) {
    const typeMap = {
      NORMAL_SALES_TAX_INVOICE: 1,
      DEBIT_NOTE: 2,
      CREDIT_NOTE: 3,
      EXPORT_INVOICE: 4,
    };
    return typeMap[invoiceType] || 1;
  }

  // Map UnitOfMeasure enum to FBR format
  mapUnitOfMeasure(unitOfMeasure) {
    const measureMap = {
      KGM: 'KGM',
      LTR: 'LTR',
      TNE: 'TNE',
      DRM: 'DRM',
      BAG: 'BAG',
      NUM: 'NUM',
    };
    return measureMap[unitOfMeasure] || 'NUM';
  }

  // Validate invoice for FBR compliance
  validateInvoiceForFBR(invoice, company, customer) {
    const errors = [];

    // Validate NTN
    if (!company.ntn || company.ntn.length !== 7) {
      errors.push('Company NTN must be 7 digits');
    }

    // Validate STRN
    if (!company.strn || company.strn.length !== 13) {
      errors.push('Company STRN must be 13 digits');
    }

    // Validate customer info
    if (!customer.businessName) {
      errors.push('Customer business name is required');
    }

    // Validate invoice date (cannot be future date)
    if (invoice.invoiceDate > new Date()) {
      errors.push('Invoice date cannot be a future date');
    }

    // Validate registered buyer STRN
    if (customer.registrationType === 'REGISTERED' && !customer.strn) {
      errors.push('Registered customer must have STRN');
    }

    if (errors.length > 0) {
      throw new Error(`FBR Validation Error: ${errors.join(', ')}`);
    }
  }

  // Generate QR code
  async generateQRCode(fbrInvoiceNumber, sellerNtn, totalAmount, invoiceDate) {
    const qrData = `${fbrInvoiceNumber}|${sellerNtn}|${totalAmount}|${invoiceDate.toISOString().split('T')[0]}`;
    const qrCode = await QRCode.toDataURL(qrData);
    return qrCode;
  }

  // Queue invoice for submission if offline
  async queueInvoiceForSubmission(invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, company: true, customer: true },
    });

    if (!invoice) throw new Error('Invoice not found');

    // Create a pending FBR submission record
    await prisma.fBRSubmission.create({
      data: {
        invoiceId,
        payload: {}, // Will be filled on retry
        status: 'QUEUED',
      },
    });

    return { message: 'Invoice queued for submission', invoiceId };
  }

  // Retry queued/failed submissions
  async retryFailedSubmissions(companyId) {
    const failedSubmissions = await prisma.fBRSubmission.findMany({
      where: {
        status: { in: ['ERROR', 'QUEUED'] },
        retryCount: { lt: this.maxRetries },
      },
      include: {
        invoice: {
          include: {
            company: true,
            customer: true,
            items: true,
          },
        },
      },
    });

    const results = [];
    for (const submission of failedSubmissions) {
      try {
        const result = await this.submitInvoiceToFBR(
          submission.invoice,
          submission.invoice.items,
          submission.invoice.company,
          submission.invoice.customer
        );
        results.push({ invoiceId: submission.invoiceId, success: true, result });
      } catch (error) {
        results.push({ invoiceId: submission.invoiceId, success: false, error: error.message });
      }
    }

    return results;
  }

  // Check FBR submission status
  async checkSubmissionStatus(invoiceId) {
    const submission = await prisma.fBRSubmission.findUnique({
      where: { invoiceId },
    });

    if (!submission) {
      return { status: 'NOT_FOUND' };
    }

    return {
      status: submission.status,
      fbrInvoiceNumber: submission.fbrInvoiceNumber,
      submittedAt: submission.submittedAt,
      acceptedAt: submission.acceptedAt,
      errorMessage: submission.errorMessage,
      retryCount: submission.retryCount,
    };
  }
}

module.exports = new FBRService();
