const prisma = require('../lib/prisma');
const fbrService = require('../services/fbrService');
const pdfService = require('../services/pdfService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const FBR = require('../config/fbr');

const MAX_TAKE = 50;

// ── Create invoice ───────────────────────────────────────────────────────────
const createInvoice = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { customerId, invoiceDate, invoiceType, items, paymentTerms, deliveryTerms, remarks, referenceInvoiceNo } = req.body;

  // ✅ FIX: N+1 — fetch all products in ONE query instead of one per item
  const productIds = [...new Set(items.map(i => i.productId))];
  const [company, customer, productsRaw] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } }),
  ]);

  if (!company) throw new AppError('Company not found', 404);
  if (!customer) throw new AppError('Customer not found', 404);

  // ✅ FIX: IDOR — customer must belong to same company
  if (customer.companyId !== companyId) throw new AppError('Customer not found', 404);

  const productMap = Object.fromEntries(productsRaw.map(p => [p.id, p]));
  const isUnregistered = customer.registrationType === 'UNREGISTERED';

  // ✅ FIX: floating-point safe calculation using integer math (multiply then divide)
  const invoiceItems = items.map(item => {
    const product = productMap[item.productId];
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);

    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    const discount = parseFloat(item.discountAmount || 0);
    const taxRate = parseFloat(item.taxRate);

    const taxableValue = Math.round((qty * price - discount) * 10000) / 10000;
    const taxAmount = Math.round(taxableValue * (taxRate / 100) * 10000) / 10000;
    // SN002: 3% further tax applies to all sales to unregistered buyers
    const furtherTax = isUnregistered ? Math.round(taxableValue * 0.03 * 10000) / 10000 : 0;
    const totalAmount = Math.round((taxableValue + taxAmount + furtherTax) * 10000) / 10000;

    // Third Schedule: tax is on MRP not transaction value
    const fixedNotifiedValueOrRetailPrice = product.isThirdSchedule ? (product.mrp || null) : null;

    // Determine saleType: if Third Schedule product → "Third Schedule", else from item/default
    let saleType = item.saleType || 'Goods';
    if (product.isThirdSchedule) saleType = 'Third Schedule';
    else if (taxRate === 0 && saleType === 'Goods') saleType = 'Zero-Rated';

    return {
      productId: item.productId,
      hsCode: product.hsCode,
      productCode: product.productCode,
      productDescription: product.productName,
      saleType,
      quantity: qty,
      unitOfMeasure: product.unitOfMeasure,
      unitPrice: price,
      discountAmount: discount,
      taxableValue,
      taxRate,
      taxAmount,
      furtherTax,
      salesTaxWithheldAtSource: parseFloat(item.salesTaxWithheldAtSource || 0),
      fedPayable: parseFloat(item.fedPayable || 0),
      fixedNotifiedValueOrRetailPrice,
      sroScheduleNo: product.sroScheduleNo || item.sroScheduleNo || null,
      sroItemSerialNo: product.sroItemSerialNo || item.sroItemSerialNo || null,
      totalAmount,
    };
  });

  // ✅ FIX: round totals to avoid float accumulation drift
  const totalTaxableValue = Math.round(invoiceItems.reduce((s, i) => s + i.taxableValue, 0) * 100) / 100;
  const totalSalesTax = Math.round(invoiceItems.reduce((s, i) => s + i.taxAmount, 0) * 100) / 100;
  const totalFurtherTax = Math.round(invoiceItems.reduce((s, i) => s + (i.furtherTax || 0), 0) * 100) / 100;
  const totalInvoiceAmount = Math.round((totalTaxableValue + totalSalesTax + totalFurtherTax) * 100) / 100;

  // Atomic counter — prevents duplicate invoice numbers under concurrency
  const updatedCompany = await prisma.company.update({
    where: { id: companyId },
    data: { lastInvoiceNumber: { increment: 1 } },
  });

  // FBR-compliant invoice number: NTN-YEAR-SEQUENCE (e.g. 1234567-2026-000001)
  const ntn = company.ntn && /^[0-9]{7}$/.test(company.ntn)
    ? company.ntn
    : companyId.slice(-6).toUpperCase();
  const invoiceNumber = `${ntn}-${new Date().getFullYear()}-${String(updatedCompany.lastInvoiceNumber).padStart(6, '0')}`;

  // For credit/debit notes — look up the original invoice's FBR-issued IRN
  let referenceInvoiceIRN = null;
  if (['DEBIT_NOTE', 'CREDIT_NOTE'].includes(invoiceType) && referenceInvoiceNo) {
    const originalInv = await prisma.invoice.findFirst({
      where: { invoiceNumber: referenceInvoiceNo, companyId },
      select: { fbrInvoiceNumber: true },
    });
    referenceInvoiceIRN = originalInv?.fbrInvoiceNumber || null;
  }

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      customerId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      invoiceType,
      referenceInvoiceNo: referenceInvoiceNo || null,
      referenceInvoiceIRN,
      sellerNtn: company.ntn || '',
      sellerStrn: company.strn || '',
      sellerBusinessName: company.businessName,
      sellerAddress: company.address || '',
      sellerProvince: company.province || '',
      buyerRegistrationType: customer.registrationType,
      buyerNtn: customer.ntn || null,
      buyerCnic: customer.cnic || null,
      buyerStrn: customer.strn || null,
      buyerBusinessName: customer.businessName,
      buyerAddress: customer.address || '',
      buyerProvince: customer.province || '',
      totalTaxableValue,
      totalSalesTax,
      totalFurtherTax,
      totalInvoiceAmount,
      status: 'DRAFT',
      paymentTerms: paymentTerms || null,
      deliveryTerms: deliveryTerms || null,
      remarks: remarks || null,
      createdByUserId: req.user.id,
      items: { create: invoiceItems },
    },
    include: { items: true },
  });

  res.status(201).json({ success: true, message: 'Invoice created successfully', invoice });
});

// ── Submit to FBR ────────────────────────────────────────────────────────────
const submitToFBR = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, company: true, customer: true },
  });

  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  // INV-1 + INV-2: Already accepted — return existing IRN, no new submission
  if (invoice.fbrStatus === 'ACCEPTED' && invoice.fbrInvoiceNumber) {
    return res.json({
      success: true,
      message: 'Invoice already accepted by FBR',
      fbrInvoiceNumber: invoice.fbrInvoiceNumber,
      alreadyAccepted: true,
    });
  }

  const result = await fbrService.submitInvoiceToFBR(invoice, invoice.items, invoice.company, invoice.customer);
  res.json({ success: true, message: 'Invoice FBR ko submit ho gayi', fbrInvoiceNumber: result.fbrInvoiceNumber });
});

// ── Cancel invoice (INV-7: only within 72-hour window) ───────────────────────
const cancelInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Invoice nahi mili', 404);
  if (invoice.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  // Unsubmitted draft — can always cancel
  if (invoice.fbrStatus !== 'ACCEPTED') {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED', fbrStatus: 'CANCELLED' },
    });
    return res.json({ success: true, message: 'Invoice cancel ho gayi' });
  }

  // INV-7: Accepted invoice — check 72-hour window
  const submittedAt = invoice.submittedAt || invoice.createdAt;
  const ageHours = (Date.now() - new Date(submittedAt).getTime()) / 3600000;

  if (ageHours > FBR.cancelWindowHours) {
    throw new AppError(
      `Invoice cancel nahi ho sakti — FBR ka ${FBR.cancelWindowHours} ghante ka window guzar gaya hai (${Math.round(ageHours)} ghante ho gaye hain)`,
      400
    );
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'CANCELLED', fbrStatus: 'CANCELLED' },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'INVOICE_CANCEL',
      entityType: 'Invoice',
      entityId: invoiceId,
      description: `Invoice ${invoice.invoiceNumber} cancel ki gayi (${Math.round(ageHours)}h baad FBR submit se)`,
    },
  }).catch(() => {});

  res.json({ success: true, message: 'Invoice cancel ho gayi — FBR portal mein bhi cancel karein' });
});

// ── Get invoice ──────────────────────────────────────────────────────────────
const getInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, company: true, customer: true },
  });

  if (!invoice) throw new AppError('Invoice not found', 404);

  // ✅ FIX: IDOR — verify invoice belongs to user's company
  if (invoice.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  res.json(invoice);
});

// ── Generate PDF ─────────────────────────────────────────────────────────────
const generatePDF = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, company: true, customer: true },
  });

  if (!invoice) throw new AppError('Invoice not found', 404);

  // ✅ FIX: IDOR — verify PDF is for user's own company
  if (invoice.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  const invoiceData = {
    ...invoice,
    sellerBusinessName: invoice.company?.businessName || invoice.sellerBusinessName,
    sellerNtn: invoice.company?.ntn || invoice.sellerNtn,
    sellerStrn: invoice.company?.strn || invoice.sellerStrn,
    sellerAddress: invoice.company?.address || invoice.sellerAddress,
    sellerProvince: invoice.company?.province || invoice.sellerProvince,
    buyerBusinessName: invoice.customer?.businessName || invoice.buyerBusinessName,
    buyerAddress: invoice.customer?.address || invoice.buyerAddress,
    buyerProvince: invoice.customer?.province || invoice.buyerProvince,
    buyerNtn: invoice.customer?.ntn || invoice.buyerNtn,
  };

  const pdfBuffer = await pdfService.generateInvoicePDF(invoiceData);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
  res.send(pdfBuffer);
});

// ── List invoices ────────────────────────────────────────────────────────────
const listInvoices = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { status, startDate, endDate } = req.query;
  // ✅ FIX: clamp take
  const skip = Math.max(0, parseInt(req.query.skip) || 0);
  const take = Math.min(MAX_TAKE, Math.max(1, parseInt(req.query.take) || 20));

  const where = { companyId };
  if (status) where.status = status;
  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate.gte = new Date(startDate);
    if (endDate) where.invoiceDate.lte = new Date(endDate);
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true },
      orderBy: { invoiceDate: 'desc' },
      skip,
      take,
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({ invoices, pagination: { total, skip, take } });
});

// ── Update payment status ─────────────────────────────────────────────────────
const updatePayment = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const { paymentStatus, paidAmount } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Invoice nahi mili', 404);
  if (invoice.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  const paid = Math.min(parseFloat(paidAmount || 0), parseFloat(invoice.totalInvoiceAmount));
  const resolvedStatus = paid <= 0 ? 'UNPAID'
    : paid >= parseFloat(invoice.totalInvoiceAmount) ? 'PAID'
    : 'PARTIAL';

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: paymentStatus || resolvedStatus,
      paidAmount: paid,
      paidAt: resolvedStatus === 'PAID' ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'PAYMENT_UPDATE',
      entityType: 'Invoice',
      entityId: invoiceId,
      description: `Invoice ${invoice.invoiceNumber} — payment ${resolvedStatus}: PKR ${paid}`,
    },
  }).catch(() => {});

  res.json({ success: true, paymentStatus: updated.paymentStatus, paidAmount: updated.paidAmount });
});

module.exports = { createInvoice, submitToFBR, cancelInvoice, updatePayment, getInvoice, generatePDF, listInvoices };
