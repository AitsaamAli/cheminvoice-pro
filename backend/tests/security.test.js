// TC-SEC001 → TC-SEC010: Security & Penetration Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  company: { findUnique: jest.fn(), update: jest.fn() },
  customer: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  invoice: { findUnique: jest.fn(), update: jest.fn() },
  product: { findUnique: jest.fn(), findMany: jest.fn() },
  $disconnect: jest.fn(),
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, companyBToken,
  COMPANY_A, COMPANY_B, USER_A_ID,
  mockCustomer, mockInvoice, mockProduct, mockUser,
} = require('./helpers');

const authA = () => ({ Authorization: `Bearer ${adminToken()}` });
const authB = () => ({ Authorization: `Bearer ${companyBToken()}` });

describe('Security & Penetration Tests (TC-SEC001–SEC010)', () => {

  // TC-SEC001: IDOR — Company A cannot access Company B invoices via :companyId param
  it('SEC-001: requireCompanyAccess blocks cross-company invoice list (IDOR)', async () => {
    const res = await request(app)
      .get(`/api/companies/${COMPANY_B}/invoices`)
      .set(authA());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  // TC-SEC002: IDOR — Company A cannot edit Company B customer
  it('SEC-002: Company A cannot update Company B customer — IDOR controller check', async () => {
    const companyBCustomer = mockCustomer({ companyId: COMPANY_B });
    prisma.customer.findUnique.mockResolvedValue(companyBCustomer);

    const res = await request(app)
      .put(`/api/customers/${companyBCustomer.id}`)
      .set(authA())
      .send({ businessName: 'Hacked' });

    expect(res.status).toBe(403);
  });

  // TC-SEC003: IDOR — Company A cannot access Company B company profile
  it('SEC-003: Company A cannot GET Company B company profile', async () => {
    const res = await request(app)
      .get(`/api/companies/${COMPANY_B}`)
      .set(authA());

    expect(res.status).toBe(403);
  });

  // TC-SEC004: IDOR — Company A cannot update Company B invoice payment
  it('SEC-004: Company A cannot PATCH payment on Company B invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue(mockInvoice({ companyId: COMPANY_B }));

    const res = await request(app)
      .patch('/api/invoices/invoice-b-001/payment')
      .set(authA())
      .send({ paidAmount: 9999 });

    expect(res.status).toBe(403);
  });

  // TC-SEC005: IDOR — Company A cannot access Company B product
  it('SEC-005: Company A cannot GET Company B product', async () => {
    prisma.product.findUnique.mockResolvedValue(mockProduct({ companyId: COMPANY_B }));

    const res = await request(app)
      .get('/api/products/product-b-001')
      .set(authA());

    expect(res.status).toBe(403);
  });

  // TC-SEC006: XSS — script tag in business name stored as plain text (not executed)
  it('SEC-006: XSS payload in businessName is stored safely (no 500 error)', async () => {
    const xssCustomer = mockCustomer({ businessName: '<script>alert(1)</script>' });
    prisma.customer.create.mockResolvedValue(xssCustomer);

    const res = await request(app)
      .post(`/api/companies/${COMPANY_A}/customers`)
      .set(authA())
      .send({ businessName: '<script>alert(1)</script>', registrationType: 'UNREGISTERED' });

    // Should store (not execute) — no 500, returns 201
    expect(res.status).toBe(201);
    // The raw string is returned — frontend React handles escaping
    expect(res.body.customer.businessName).toBe('<script>alert(1)</script>');
  });

  // TC-SEC007: Body too large (over 5MB) → 413
  it('SEC-007: request body over 5MB returns 413 Entity Too Large', async () => {
    const oversized = 'x'.repeat(6 * 1024 * 1024); // 6MB

    const res = await request(app)
      .put(`/api/companies/${COMPANY_A}`)
      .set(authA())
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ businessName: 'Test', logoBase64: oversized }));

    expect(res.status).toBe(413);
  });

  // TC-SEC008: No auth header → 401 (not 500)
  it('SEC-008: all protected routes return 401 (not 500) without Authorization header', async () => {
    const routes = [
      () => request(app).get(`/api/companies/${COMPANY_A}/invoices`),
      () => request(app).get(`/api/companies/${COMPANY_A}/customers`),
      () => request(app).get(`/api/companies/${COMPANY_A}/products`),
      () => request(app).get('/api/auth/me'),
    ];

    for (const routeFn of routes) {
      const res = await routeFn();
      expect(res.status).toBe(401);
      expect(res.status).not.toBe(500);
    }
  });

  // TC-SEC009: FBR token never in API response body (INV-4)
  it('SEC-009: company GET response does not contain FBR_SECURITY_TOKEN (INV-4)', async () => {
    const company = { id: COMPANY_A, businessName: 'Test' };
    prisma.company.findUnique.mockResolvedValue(company);

    const res = await request(app)
      .get(`/api/companies/${COMPANY_A}`)
      .set(authA());

    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(process.env.FBR_SECURITY_TOKEN);
  });

  // TC-SEC010: Bearer token malformed → 401
  it('SEC-010: malformed Bearer token returns 401', async () => {
    const routes = [
      () => request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token'),
      () => request(app).get('/api/auth/me').set('Authorization', 'NotBearer something'),
    ];

    for (const routeFn of routes) {
      const res = await routeFn();
      expect(res.status).toBe(401);
    }
  });
});
