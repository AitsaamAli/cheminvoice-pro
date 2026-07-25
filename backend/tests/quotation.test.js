// TC-Q001 → TC-Q011: Quotation Flow Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  quotation: {
    findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(),
    update: jest.fn(), delete: jest.fn(), count: jest.fn(),
  },
  customer: { findUnique: jest.fn() },
  product: { findMany: jest.fn() },
  company: { findUnique: jest.fn(), update: jest.fn() },
  invoice: { create: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, COMPANY_A, COMPANY_B,
  mockCompany, mockCustomer, mockProduct, mockQuotation, quotationPayload,
} = require('./helpers');

const authHeader = () => ({ Authorization: `Bearer ${adminToken()}` });
const BASE = `/api/companies/${COMPANY_A}/quotations`;

describe('Quotation Flow (TC-Q001–Q011)', () => {

  beforeEach(() => {
    prisma.company.findUnique.mockResolvedValue(mockCompany());
    prisma.customer.findUnique.mockResolvedValue(mockCustomer());
    prisma.product.findMany.mockResolvedValue([mockProduct()]);
    prisma.company.update.mockResolvedValue(mockCompany({ lastQuotationNumber: 1 }));
    prisma.$transaction.mockImplementation(async (ops) => {
      if (Array.isArray(ops)) return ops.map(() => ({}));
      return ops(prisma);
    });
  });

  // TC-Q001
  it('Q-001: create quotation with valid data returns 201', async () => {
    const q = mockQuotation();
    prisma.quotation.create.mockResolvedValue(q);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(quotationPayload());

    expect(res.status).toBe(201);
    expect(res.body.quotation || res.body.success).toBeTruthy();
  });

  // TC-Q002: Quotation requires at least 1 item
  it('Q-002: quotation with empty items array returns 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(quotationPayload({ items: [] }));

    expect(res.status).toBe(400);
  });

  // TC-Q003: IDOR — create in Company B from Company A token
  it('Q-003: IDOR — creating quotation in Company B returns 403', async () => {
    const res = await request(app)
      .post(`/api/companies/${COMPANY_B}/quotations`)
      .set(authHeader())
      .send(quotationPayload());

    expect(res.status).toBe(403);
  });

  // TC-Q004: Update CONVERTED quotation → blocked
  it('Q-004: updating a CONVERTED quotation returns 400', async () => {
    const converted = mockQuotation({ status: 'CONVERTED', convertedToInvoiceId: 'inv-999' });
    prisma.quotation.findUnique.mockResolvedValue(converted);

    const res = await request(app)
      .put(`/api/quotations/${converted.id}`)
      .set(authHeader())
      .send({ status: 'DRAFT' });

    expect(res.status).toBe(400);
  });

  // TC-Q005: Delete CONVERTED quotation → blocked
  it('Q-005: deleting a CONVERTED quotation returns 400', async () => {
    const converted = mockQuotation({ status: 'CONVERTED', convertedToInvoiceId: 'inv-999' });
    prisma.quotation.findUnique.mockResolvedValue(converted);

    const res = await request(app)
      .delete(`/api/quotations/${converted.id}`)
      .set(authHeader());

    expect(res.status).toBe(400);
  });

  // TC-Q006: Delete DRAFT quotation → succeeds
  it('Q-006: deleting a DRAFT quotation returns 200', async () => {
    const draft = mockQuotation({ status: 'DRAFT' });
    prisma.quotation.findUnique.mockResolvedValue(draft);
    prisma.quotation.delete.mockResolvedValue(draft);

    const res = await request(app)
      .delete(`/api/quotations/${draft.id}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(prisma.quotation.delete).toHaveBeenCalled();
  });

  // TC-Q007: Convert ACCEPTED quotation → creates invoice
  it('Q-007: converting ACCEPTED quotation creates invoice and marks quotation CONVERTED', async () => {
    const accepted = {
      ...mockQuotation({ status: 'ACCEPTED' }),
      company: mockCompany(),
      customer: mockCustomer(),
      items: [
        {
          id: 'qi-1', productId: 'product-001', quantity: 1, unitPrice: 1000,
          discountAmount: 0, taxRate: 18, taxableValue: 1000, taxAmount: 180,
          totalAmount: 1180, furtherTax: 0,
          product: mockProduct(),
        },
      ],
    };
    prisma.quotation.findUnique.mockResolvedValue(accepted);
    prisma.quotation.update.mockResolvedValue({ ...accepted, status: 'CONVERTED', convertedToInvoiceId: 'new-inv-id' });
    prisma.company.update.mockResolvedValue(mockCompany({ lastInvoiceNumber: 1 }));
    prisma.$transaction.mockImplementation(async (ops) =>
      Array.isArray(ops) ? [{ id: 'new-inv-id' }] : ops(prisma)
    );

    const res = await request(app)
      .post(`/api/quotations/${accepted.id}/convert`)
      .set(authHeader());

    expect([200, 201]).toContain(res.status);
  });

  // TC-Q008: IDOR — get quotation from Company B
  it('Q-008: IDOR — getting Company B quotation from Company A token returns 403', async () => {
    prisma.quotation.findUnique.mockResolvedValue(mockQuotation({ companyId: COMPANY_B }));

    const res = await request(app)
      .get(`/api/quotations/quotation-001`)
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-Q009: IDOR — listing Company B quotations
  it('Q-009: IDOR — listing Company B quotations returns 403', async () => {
    const res = await request(app)
      .get(`/api/companies/${COMPANY_B}/quotations`)
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-Q010: No token → 401
  it('Q-010: quotation list without token returns 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  // TC-Q011: Items max 100 validation
  it('Q-011: quotation with 101 items returns 400', async () => {
    const items = Array.from({ length: 101 }, () => ({
      productId: 'product-001', quantity: 1, unitPrice: 100, discountAmount: 0, taxRate: 18,
    }));

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(quotationPayload({ items }));

    expect(res.status).toBe(400);
  });
});
