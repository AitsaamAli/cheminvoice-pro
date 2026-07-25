// TC-EC001 → TC-EC018: Edge Cases & Boundary Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  company: { findUnique: jest.fn(), update: jest.fn() },
  customer: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  product: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  invoice: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    create: jest.fn(), update: jest.fn(), count: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
}));
jest.mock('../src/services/fbrService', () => ({ submitInvoiceToFBR: jest.fn() }));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, COMPANY_A,
  mockCompany, mockCustomer, mockProduct, mockInvoice,
  invoicePayload, productPayload, customerPayload,
} = require('./helpers');

const authHeader = () => ({ Authorization: `Bearer ${adminToken()}` });
const INV_BASE = `/api/companies/${COMPANY_A}/invoices`;
const CUST_BASE = `/api/companies/${COMPANY_A}/customers`;
const PROD_BASE = `/api/companies/${COMPANY_A}/products`;

describe('Edge Cases & Boundary Tests (TC-EC001–EC018)', () => {

  beforeEach(() => {
    prisma.company.findUnique.mockResolvedValue(mockCompany());
    prisma.customer.findUnique.mockResolvedValue(mockCustomer());
    prisma.product.findMany.mockResolvedValue([mockProduct()]);
    prisma.company.update.mockResolvedValue(mockCompany({ lastInvoiceNumber: 1 }));
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (ops) =>
      Array.isArray(ops) ? [mockInvoice()] : ops(prisma)
    );
  });

  // TC-EC001: Zero quantity rejected
  it('EC-001: invoice item with quantity=0 returns 400 (positive() validation)', async () => {
    const res = await request(app)
      .post(INV_BASE)
      .set(authHeader())
      .send(invoicePayload({ items: [{ productId: 'product-001', quantity: 0, unitPrice: 500, discountAmount: 0, taxRate: 18 }] }));

    expect(res.status).toBe(400);
  });

  // TC-EC002: Negative unitPrice rejected
  it('EC-002: invoice item with unitPrice=-1 returns 400', async () => {
    const res = await request(app)
      .post(INV_BASE)
      .set(authHeader())
      .send(invoicePayload({ items: [{ productId: 'product-001', quantity: 1, unitPrice: -1, discountAmount: 0, taxRate: 18 }] }));

    expect(res.status).toBe(400);
  });

  // TC-EC003: Max 100 items in invoice
  it('EC-003: invoice with exactly 100 items is accepted by validation', async () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      productId: 'product-001',
      quantity: 1,
      unitPrice: 100,
      discountAmount: 0,
      taxRate: 18,
    }));

    // Validation passes (doesn't reach controller without proper mocks)
    const res = await request(app)
      .post(INV_BASE)
      .set(authHeader())
      .send(invoicePayload({ items }));

    // Joi validation allows 100 items; controller may 404 on repeated product IDs but that's ok
    expect(res.status).not.toBe(400);
  });

  // TC-EC004: Exactly 101 items rejected
  it('EC-004: invoice with 101 items returns 400', async () => {
    const items = Array.from({ length: 101 }, () => ({
      productId: 'product-001', quantity: 1, unitPrice: 100, discountAmount: 0, taxRate: 18,
    }));

    const res = await request(app)
      .post(INV_BASE)
      .set(authHeader())
      .send(invoicePayload({ items }));

    expect(res.status).toBe(400);
  });

  // TC-EC005: NTN empty string → accepted (optional)
  it('EC-005: customer with ntn empty string is accepted', async () => {
    prisma.customer.create.mockResolvedValue(mockCustomer({ ntn: null }));

    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ ntn: '' }));

    expect(res.status).toBe(201);
  });

  // TC-EC006: NTN exactly 7 digits → accepted
  it('EC-006: 7-digit NTN is accepted', async () => {
    prisma.customer.create.mockResolvedValue(mockCustomer());

    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ ntn: '1234567' }));

    expect(res.status).toBe(201);
  });

  // TC-EC007: NTN 8 digits → rejected
  it('EC-007: 8-digit NTN returns 400', async () => {
    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ ntn: '12345678' }));

    expect(res.status).toBe(400);
  });

  // TC-EC008: NTN with letters → rejected
  it('EC-008: NTN with letters returns 400', async () => {
    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ ntn: '123A567' }));

    expect(res.status).toBe(400);
  });

  // TC-EC009: STRN exactly 13 digits → accepted
  it('EC-009: 13-digit STRN is accepted', async () => {
    prisma.customer.create.mockResolvedValue(mockCustomer());

    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ strn: '1234567890123' }));

    expect(res.status).toBe(201);
  });

  // TC-EC010: STRN 12 digits → rejected
  it('EC-010: 12-digit STRN returns 400', async () => {
    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ strn: '123456789012' }));

    expect(res.status).toBe(400);
  });

  // TC-EC011: logoBase64 within 2MB → accepted by Joi
  it('EC-011: logoBase64 of 2,000,000 chars passes Joi max(2000000) validation', async () => {
    prisma.company.update.mockResolvedValue(mockCompany());

    const res = await request(app)
      .put(`/api/companies/${COMPANY_A}`)
      .set(authHeader())
      .send({ businessName: 'Test', logoBase64: 'A'.repeat(2000000) });

    // Joi allows up to 2,000,000 chars
    expect(res.status).not.toBe(400);
  });

  // TC-EC012: logoBase64 over 2MB → rejected by Joi
  it('EC-012: logoBase64 over 2,000,000 chars returns 400', async () => {
    const res = await request(app)
      .put(`/api/companies/${COMPANY_A}`)
      .set(authHeader())
      .send({ businessName: 'Test', logoBase64: 'A'.repeat(2000001) });

    expect(res.status).toBe(400);
  });

  // TC-EC013: Health endpoint requires no auth and returns 200
  it('EC-013: GET /health returns 200 without token', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // TC-EC014: 404 for unknown routes
  it('EC-014: unknown route returns 404 with structured error', async () => {
    const res = await request(app)
      .get('/api/nonexistent-endpoint')
      .set(authHeader());

    expect(res.status).toBe(404);
  });

  // TC-EC015: Product defaultSalePrice max(99999999) validation
  it('EC-015: product defaultSalePrice above max(99999999) returns 400', async () => {
    const res = await request(app)
      .post(PROD_BASE)
      .set(authHeader())
      .send(productPayload({ defaultSalePrice: 100000000 }));

    expect(res.status).toBe(400);
  });

  // TC-EC016: Product stockQuantity negative → rejected
  it('EC-016: product stockQuantity negative returns 400', async () => {
    const res = await request(app)
      .post(PROD_BASE)
      .set(authHeader())
      .send(productPayload({ trackStock: true, stockQuantity: -1 }));

    expect(res.status).toBe(400);
  });

  // TC-EC017: Invoice type EXPORT_INVOICE accepted
  it('EC-017: EXPORT_INVOICE invoice type is valid and accepted', async () => {
    const res = await request(app)
      .post(INV_BASE)
      .set(authHeader())
      .send(invoicePayload({ invoiceType: 'EXPORT_INVOICE' }));

    expect(res.status).not.toBe(400);
  });

  // TC-EC018: Special characters in businessName do not cause 500
  it('EC-018: businessName with special chars (& / ) stored without error', async () => {
    prisma.customer.create.mockResolvedValue(mockCustomer({ businessName: "M/s Ali & Sons (Pvt.) Ltd." }));

    const res = await request(app)
      .post(CUST_BASE)
      .set(authHeader())
      .send(customerPayload({ businessName: "M/s Ali & Sons (Pvt.) Ltd." }));

    expect(res.status).toBe(201);
    expect(res.body.customer.businessName).toBe("M/s Ali & Sons (Pvt.) Ltd.");
  });
});
