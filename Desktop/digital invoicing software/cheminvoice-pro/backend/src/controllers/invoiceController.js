const { PrismaClient } = require('@prisma/client');
const fbrService = require('../services/fbrService');
const pdfService = require('../services/pdfService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// Create invoice
const createInvoice = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { customerId, invoiceDate, invoiceType, items, paymentTerms, deliveryTerms, remarks } = req.body;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!company || !customer) throw new AppError('Company or customer not found', 404);

  // Generate sequential invoice number
  const nextInvoiceNumber = company.lastInvoiceNumber + 1;
  const invoiceNumber = `CHEM-${new Date().getFullYear()}-${String(nextInvoiceNumber).padStart(5, '0')}`;

  // Fetch product details and calculate totals
  const invoiceItems = await Promise.all(
    items.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new AppError(`Product ${item.productId} not found`, 404);

      const taxableValue = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
      const taxAmount = taxableValue * (item.taxRate / 100);
      const totalAmount = taxableValue + taxAmount;

      return {
        productId: item.productId,
        hsCode: product.hsCode,
        productCode: product.productCode,
        productDescription: product.productName,
        quantity: item.quantity,
        unitOfMeasure: product.unitOfMeasure,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        taxableValue,
        taxRate: item.taxRate,
        taxAmount,
        totalAmount,
      };
    })
  );

  const totalTaxableValue = invoiceItems.reduce((sum, item) => sum + item.taxableValue, 0);
  const totalSalesTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalInvoiceAmount = totalTaxableValue + totalSalesTax;

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      customerId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      invoiceType,
      sellerNtn: company.ntn,
      sellerStrn: company.strn,
      sellerBusinessName: company.businessName,
      sellerAddress: company.address,
      sellerProvince: company.province,
      buyerRegistrationType: customer.registrationType,
      buyerNtn: customer.ntn,
      buyerCnic: customer.cnic,
      buyerStrn: customer.strn,
      buyerBusinessName: customer.businessName,
      buyerAddress: customer.address,
      buyerProvince: customer.province,
      totalTaxableValue,
      totalSalesTax,
      totalInvoiceAmount,
      status: 'DRAFT',
      paymentTerms,
      deliveryTerms,
      remarks,
      createdByUserId: req.user.id,
      items: {
        create: invoiceItems,
      },
    },
    include: { items: true },
  });

  // Update company last invoice number
  await prisma.company.update({
    where: { id: companyId },
    data: { lastInvoiceNumber: nextInvoiceNumber },
  });

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    invoice,
  });
});

// Submit invoice to FBR
const submitToFBR = asyncHandler(async (req, res) => {
  const { invoiceId, companyId } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, company: true, customer: true },
  });

  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.status === 'SUBMITTED') throw new AppError('Invoice already submitted', 409);

  const result = await fbrService.submitInvoiceToFBR(
    invoice,
    invoice.items,
    invoice.company,
    invoice.customer
  );

  res.json({
    success: true,
    message: 'Invoice submitted to FBR',
    fbrInvoiceNumber: result.fbrInvoiceNumber,
  });
});

// Get invoice with PDF
const getInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, company: true, customer: true },
  });

  if (!invoice) throw new AppError('Invoice not found', 404);

  res.json(invoice);
});

// Generate PDF
const generatePDF = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, company: true, customer: true },
  });

  if (!invoice) throw new AppError('Invoice not found', 404);

  const pdfPath = await pdfService.generateInvoicePDF(
    invoice,
    invoice.items,
    invoice.company,
    invoice.customer
  );

  res.download(pdfPath);
});

// List invoices
const listInvoices = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { status, startDate, endDate, skip = 0, take = 20 } = req.query;

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
      skip: parseInt(skip),
      take: parseInt(take),
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({
    invoices,
    pagination: { total, skip: parseInt(skip), take: parseInt(take) },
  });
});

module.exports = {
  createInvoice,
  submitToFBR,
  getInvoice,
  generatePDF,
  listInvoices,
};
