const prisma = require('../lib/prisma');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const MAX_TAKE = 50;

// ── Create quotation ─────────────────────────────────────────────────────────
const createQuotation = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { customerId, quotationDate, validUntil, items, notes } = req.body;

  const productIds = [...new Set(items.map(i => i.productId))];
  const [company, customer, productsRaw] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } }),
  ]);

  if (!company) throw new AppError('Company not found', 404);
  if (!customer) throw new AppError('Customer not found', 404);
  if (customer.companyId !== companyId) throw new AppError('Customer not found', 404);

  const productMap = Object.fromEntries(productsRaw.map(p => [p.id, p]));

  const quotationItems = items.map(item => {
    const product = productMap[item.productId];
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);

    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    const discount = parseFloat(item.discountAmount || 0);
    const taxRate = parseFloat(item.taxRate);
    const taxableValue = Math.round((qty * price - discount) * 10000) / 10000;
    const taxAmount = Math.round(taxableValue * (taxRate / 100) * 10000) / 10000;
    const totalAmount = Math.round((taxableValue + taxAmount) * 10000) / 10000;

    return {
      productId: item.productId,
      productDescription: product.productName,
      quantity: qty,
      unitPrice: price,
      discountAmount: discount,
      taxRate,
      taxableValue,
      taxAmount,
      totalAmount,
    };
  });

  const totalTaxableValue = Math.round(quotationItems.reduce((s, i) => s + i.taxableValue, 0) * 100) / 100;
  const totalSalesTax = Math.round(quotationItems.reduce((s, i) => s + i.taxAmount, 0) * 100) / 100;
  const totalAmount = Math.round((totalTaxableValue + totalSalesTax) * 100) / 100;

  const updatedCompany = await prisma.company.update({
    where: { id: companyId },
    data: { lastQuotationNumber: { increment: 1 } },
  });

  const ntn = company.ntn && /^[0-9]{7}$/.test(company.ntn)
    ? company.ntn : companyId.slice(-6).toUpperCase();
  const quotationNumber = `QT-${ntn}-${new Date().getFullYear()}-${String(updatedCompany.lastQuotationNumber).padStart(5, '0')}`;

  const quotation = await prisma.quotation.create({
    data: {
      companyId,
      customerId,
      quotationNumber,
      quotationDate: new Date(quotationDate),
      validUntil: validUntil ? new Date(validUntil) : null,
      status: 'DRAFT',
      totalTaxableValue,
      totalSalesTax,
      totalAmount,
      notes: notes || null,
      createdByUserId: req.user.id,
      items: { create: quotationItems },
    },
    include: { items: true, customer: true },
  });

  res.status(201).json({ success: true, quotation });
});

// ── List quotations ──────────────────────────────────────────────────────────
const listQuotations = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { status } = req.query;
  const skip = Math.max(0, parseInt(req.query.skip) || 0);
  const take = Math.min(MAX_TAKE, Math.max(1, parseInt(req.query.take) || 20));

  const where = { companyId };
  if (status) where.status = status;

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { quotationDate: 'desc' },
      skip,
      take,
    }),
    prisma.quotation.count({ where }),
  ]);

  res.json({ quotations, pagination: { total, skip, take } });
});

// ── Get quotation ────────────────────────────────────────────────────────────
const getQuotation = asyncHandler(async (req, res) => {
  const { quotationId } = req.params;
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true, customer: true, company: true },
  });

  if (!quotation) throw new AppError('Quotation not found', 404);
  if (quotation.companyId !== req.user.companyId) throw new AppError('Access denied', 403);

  res.json(quotation);
});

// ── Update quotation status / notes ─────────────────────────────────────────
const updateQuotation = asyncHandler(async (req, res) => {
  const { quotationId } = req.params;
  const { status, notes, validUntil } = req.body;

  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) throw new AppError('Quotation not found', 404);
  if (quotation.companyId !== req.user.companyId) throw new AppError('Access denied', 403);
  if (quotation.status === 'CONVERTED') throw new AppError('Converted quotations cannot be edited', 400);

  const updated = await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      status: status || quotation.status,
      notes: notes !== undefined ? notes : quotation.notes,
      validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : quotation.validUntil,
    },
    include: { items: true, customer: true },
  });

  res.json({ success: true, quotation: updated });
});

// ── Convert quotation → invoice ──────────────────────────────────────────────
const convertToInvoice = asyncHandler(async (req, res) => {
  const { quotationId } = req.params;
  const { invoiceDate, paymentMethod, paymentTerms } = req.body;

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: { include: { product: true } }, customer: true, company: true },
  });

  if (!quotation) throw new AppError('Quotation not found', 404);
  if (quotation.companyId !== req.user.companyId) throw new AppError('Access denied', 403);
  if (quotation.status === 'CONVERTED') throw new AppError('Already converted to invoice', 400);
  if (quotation.status === 'REJECTED') throw new AppError('Rejected quotation cannot be converted', 400);

  const { company, customer } = quotation;
  const isUnregistered = customer.registrationType === 'UNREGISTERED';

  const invoiceItems = quotation.items.map(item => {
    const product = item.product;
    const furtherTax = isUnregistered ? Math.round(item.taxableValue * 0.03 * 10000) / 10000 : 0;
    const totalAmount = Math.round((item.taxableValue + item.taxAmount + furtherTax) * 10000) / 10000;

    let saleType = 'Goods';
    if (product?.isThirdSchedule) saleType = 'Third Schedule';
    else if (product?.isService) saleType = 'Services';
    else if (item.taxRate === 0) saleType = 'Zero-Rated';

    return {
      productId: item.productId,
      hsCode: product?.hsCode || '',
      productCode: product?.productCode || '',
      productDescription: item.productDescription,
      saleType,
      quantity: item.quantity,
      unitOfMeasure: product?.unitOfMeasure || 'NUM',
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      taxableValue: item.taxableValue,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      furtherTax,
      salesTaxWithheldAtSource: 0,
      fedPayable: 0,
      fixedNotifiedValueOrRetailPrice: product?.isThirdSchedule ? (product?.mrp || null) : null,
      sroScheduleNo: product?.sroScheduleNo || null,
      sroItemSerialNo: product?.sroItemSerialNo || null,
      totalAmount,
    };
  });

  const totalTaxableValue = Math.round(invoiceItems.reduce((s, i) => s + i.taxableValue, 0) * 100) / 100;
  const totalSalesTax = Math.round(invoiceItems.reduce((s, i) => s + i.taxAmount, 0) * 100) / 100;
  const totalFurtherTax = Math.round(invoiceItems.reduce((s, i) => s + (i.furtherTax || 0), 0) * 100) / 100;
  const totalInvoiceAmount = Math.round((totalTaxableValue + totalSalesTax + totalFurtherTax) * 100) / 100;

  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: { lastInvoiceNumber: { increment: 1 } },
  });

  const ntn = company.ntn && /^[0-9]{7}$/.test(company.ntn)
    ? company.ntn : company.id.slice(-6).toUpperCase();
  const invoiceNumber = `${ntn}-${new Date().getFullYear()}-${String(updatedCompany.lastInvoiceNumber).padStart(6, '0')}`;

  const [invoice] = await prisma.$transaction([
    prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        invoiceType: 'NORMAL_SALES_TAX_INVOICE',
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
        paymentMethod: paymentMethod || 'CASH',
        paymentTerms: paymentTerms || null,
        remarks: `Quotation ${quotation.quotationNumber} se convert ki gayi`,
        createdByUserId: req.user.id,
        items: { create: invoiceItems },
      },
      include: { items: true },
    }),
    prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'CONVERTED', convertedToInvoiceId: invoiceNumber },
    }),
  ]);

  res.status(201).json({ success: true, invoice, message: `Invoice ${invoiceNumber} ban gayi` });
});

// ── Delete quotation ─────────────────────────────────────────────────────────
const deleteQuotation = asyncHandler(async (req, res) => {
  const { quotationId } = req.params;
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) throw new AppError('Quotation not found', 404);
  if (quotation.companyId !== req.user.companyId) throw new AppError('Access denied', 403);
  if (quotation.status === 'CONVERTED') throw new AppError('Converted quotation delete nahi ho sakti', 400);

  await prisma.quotation.delete({ where: { id: quotationId } });
  res.json({ success: true });
});

module.exports = { createQuotation, listQuotations, getQuotation, updateQuotation, convertToInvoice, deleteQuotation };
