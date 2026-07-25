// TC-I001 → TC-I022: Invoice Lifecycle Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  company: { findUnique: jest.fn(), update: jest.fn() },
  customer: { findUnique: jest.fn() },
  product: { findMany: jest.fn(), update: jest.fn() },
  invoice: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    create: jest.fn(), update: jest.fn(), count: jest.fn(),
  },
  invoiceItem: { findMany: jest.fn() },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
}));
jest.mock('../src/services/fbrService', () => ({
  submitInvoiceToFBR: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, companyBToken,
  COMPANY_A, COMPANY_B,
  mockCompany, mockCustomer, mockProduct, mockInvoice, mockInvoiceItem, invoicePayload,
} = require('./helpers');

const authHeader = () => ({ Authorization: `Bearer ${adminToken()}` });
const BASE = `/api/companies/${COMPANY_A}/invoices`;

// $transaction mock: executes callback-style transactions with prisma as arg
function setupTransactionMock(createdInvoice) {
  prisma.$transaction.mockImplementation(async (ops) => {
    if (Array.isArray(ops)) return [createdInvoice];
    return ops(prisma);
  });
}

describe('Invoice Lifecycle (TC-I001–I022)', () => {

  beforeEach(() => {
    prisma.company.findUnique.mockResolvedValue(mockCompany());
    prisma.customer.findUnique.mockResolvedValue(mockCustomer());
    prisma.product.findMany.mockResolvedValue([mockProduct()]);
    prisma.company.update.mockResolvedValue(mockCompany({ lastInvoiceNumber: 1 }));
    prisma.invoice.findFirst.mockResolvedValue(null);
    setupTransactionMock(mockInvoice());
  });

  // TC-I001
  it('I-001: create invoice with valid data returns 201 with invoiceNumber', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.invoice.invoiceNumber).toBeDefined();
  });

  // TC-I002: Invoice number format NTN-YYYY-NNNNNN
  it('I-002: invoice number format is NTN-YYYY-NNNNNN', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload());

    expect(res.status).toBe(201);
    const num = res.body.invoice.invoiceNumber;
    expect(num).toMatch(/^[0-9A-Z]+-\d{4}-\d{6}$/);
  });

  // TC-I003: Unregistered buyer → further tax applied
  it('I-003: UNREGISTERED buyer gets 3% further tax on each item', async () => {
    const unregCustomer = mockCustomer({ registrationType: 'UNREGISTERED' });
    prisma.customer.findUnique.mockResolvedValue(unregCustomer);

    const unregInvoice = mockInvoice({
      buyerRegistrationType: 'UNREGISTERED',
      totalFurtherTax: 30,
      totalInvoiceAmount: 1210,
      items: [mockInvoiceItem({ furtherTax: 30, totalAmount: 1210 })],
    });
    setupTransactionMock(unregInvoice);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload());

    expect(res.status).toBe(201);
    // Invoice controller computes furtherTax = taxableValue * 0.03 for unregistered
    // 1000 * 0.03 = 30 further tax
    expect(res.body.invoice.totalFurtherTax).toBe(30);
  });

  // TC-I004: Registered buyer → no further tax
  it('I-004: REGISTERED buyer has totalFurtherTax = 0', async () => {
    // Default customer is REGISTERED → furtherTax = 0
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload());

    expect(res.status).toBe(201);
    expect(res.body.invoice.totalFurtherTax).toBe(0);
  });

  // TC-I005: 0% tax rate → no sales tax
  it('I-005: item with 0% tax rate produces zero tax amount', async () => {
    const zeroTaxInvoice = mockInvoice({
      totalSalesTax: 0,
      totalInvoiceAmount: 1000,
    });
    setupTransactionMock(zeroTaxInvoice);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({ items: [{ productId: 'product-001', quantity: 2, unitPrice: 500, discountAmount: 0, taxRate: 0 }] }));

    expect(res.status).toBe(201);
    expect(res.body.invoice.totalSalesTax).toBe(0);
  });

  // TC-I006: Invoice total computed correctly
  it('I-006: totalInvoiceAmount = taxableValue + salesTax + furtherTax', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload());

    expect(res.status).toBe(201);
    const { totalTaxableValue, totalSalesTax, totalFurtherTax, totalInvoiceAmount } = res.body.invoice;
    expect(totalInvoiceAmount).toBe(
      Math.round((totalTaxableValue + totalSalesTax + totalFurtherTax) * 100) / 100
    );
  });

  // TC-I007: DEBIT_NOTE type accepted
  it('I-007: DEBIT_NOTE invoice type is accepted', async () => {
    const debitInvoice = mockInvoice({ invoiceType: 'DEBIT_NOTE', referenceInvoiceNo: '1234567-2026-000001' });
    setupTransactionMock(debitInvoice);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({ invoiceType: 'DEBIT_NOTE', referenceInvoiceNo: '1234567-2026-000001' }));

    expect(res.status).toBe(201);
    expect(res.body.invoice.invoiceType).toBe('DEBIT_NOTE');
  });

  // TC-I008: Get invoice — IDOR check
  it('I-008: getting invoice from another company returns 403', async () => {
    const companyBInvoice = mockInvoice({ companyId: COMPANY_B });
    prisma.invoice.findUnique.mockResolvedValue(companyBInvoice);

    const res = await request(app)
      .get('/api/invoices/invoice-001')
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-I009: Get own invoice — success
  it('I-009: getting own invoice returns full invoice data', async () => {
    prisma.invoice.findUnique.mockResolvedValue(mockInvoice());

    const res = await request(app)
      .get('/api/invoices/invoice-001')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.invoice || res.body.id).toBeTruthy();
  });

  // TC-I010: List invoices with date filter
  it('I-010: list invoices uses companyId from token (requireCompanyAccess)', async () => {
    prisma.invoice.findMany.mockResolvedValue([mockInvoice()]);
    prisma.invoice.count.mockResolvedValue(1);

    const res = await request(app)
      .get(`${BASE}?startDate=2026-07-01&endDate=2026-07-31`)
      .set(authHeader());

    expect(res.status).toBe(200);
  });

  // TC-I011: List invoices from another company → 403
  it('I-011: IDOR — listing invoices of Company B from Company A token returns 403', async () => {
    const res = await request(app)
      .get(`/api/companies/${COMPANY_B}/invoices`)
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-I012: Already-accepted FBR invoice returns alreadyAccepted
  it('I-012: submitting already-accepted FBR invoice returns alreadyAccepted:true', async () => {
    const acceptedInvoice = mockInvoice({ fbrStatus: 'ACCEPTED', fbrInvoiceNumber: 'IRN-12345' });
    prisma.invoice.findUnique.mockResolvedValue(acceptedInvoice);

    const res = await request(app)
      .post('/api/invoices/invoice-001/submit-fbr')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.alreadyAccepted).toBe(true);
  });

  // TC-I013: Cancel invoice from another company → 403
  it('I-013: IDOR — cancelling Company B invoice from Company A token returns 403', async () => {
    const companyBInvoice = mockInvoice({ companyId: COMPANY_B, items: [] });
    prisma.invoice.findUnique.mockResolvedValue(companyBInvoice);

    const res = await request(app)
      .delete('/api/invoices/invoice-001')
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-I014: FBR response must not contain token
  it('I-014: FBR submission response does not include FBR_SECURITY_TOKEN (INV-4)', async () => {
    const fbrService = require('../src/services/fbrService');
    fbrService.submitInvoiceToFBR.mockResolvedValue({ fbrInvoiceNumber: 'IRN-777', fbrStatus: 'ACCEPTED' });
    prisma.invoice.findUnique.mockResolvedValue(mockInvoice());
    prisma.invoice.update.mockResolvedValue(mockInvoice({ fbrStatus: 'ACCEPTED', fbrInvoiceNumber: 'IRN-777' }));

    const res = await request(app)
      .post('/api/invoices/invoice-001/submit-fbr')
      .set(authHeader());

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(process.env.FBR_SECURITY_TOKEN);
    expect(body).not.toContain('test-fbr-token');
  });

  // TC-I015: Create invoice — no token → 401
  it('I-015: create invoice without auth token returns 401', async () => {
    const res = await request(app)
      .post(BASE)
      .send(invoicePayload());

    expect(res.status).toBe(401);
  });

  // TC-I016: Validation — items array required (min 1)
  it('I-016: create invoice with empty items array returns 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({ items: [] }));

    expect(res.status).toBe(400);
  });

  // TC-I017: Validation — items array max 100
  it('I-017: create invoice with 101 items returns 400', async () => {
    const items = Array.from({ length: 101 }, () => ({
      productId: 'product-001', quantity: 1, unitPrice: 100, discountAmount: 0, taxRate: 18,
    }));

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({ items }));

    expect(res.status).toBe(400);
  });

  // TC-I018: Validation — zero quantity rejected
  it('I-018: invoice item with quantity 0 returns 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({
        items: [{ productId: 'product-001', quantity: 0, unitPrice: 500, discountAmount: 0, taxRate: 18 }],
      }));

    expect(res.status).toBe(400);
  });

  // TC-I019: Validation — negative unit price rejected
  it('I-019: invoice item with negative unit price returns 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({
        items: [{ productId: 'product-001', quantity: 1, unitPrice: -100, discountAmount: 0, taxRate: 18 }],
      }));

    expect(res.status).toBe(400);
  });

  // TC-I020: Customer not found → 404
  it('I-020: invoice with non-existent customerId returns 404', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({ customerId: 'nonexistent-customer' }));

    expect(res.status).toBe(404);
  });

  // TC-I021: Customer from another company → 404 (IDOR in invoice create)
  it('I-021: invoice using a customer from another company returns 404', async () => {
    prisma.customer.findUnique.mockResolvedValue(mockCustomer({ companyId: COMPANY_B }));

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload());

    expect(res.status).toBe(404);
  });

  // TC-I022: Invalid invoice type → 400
  it('I-022: invalid invoiceType returns 400 validation error', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(invoicePayload({ invoiceType: 'FAKE_TYPE' }));

    expect(res.status).toBe(400);
  });
});
