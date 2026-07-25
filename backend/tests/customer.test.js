// TC-C001 → TC-C012: Customer Management Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  customer: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, companyBToken,
  COMPANY_A, COMPANY_B,
  mockCustomer, customerPayload,
} = require('./helpers');

const authHeader = () => ({ Authorization: `Bearer ${adminToken()}` });
const BASE = `/api/companies/${COMPANY_A}/customers`;

describe('Customer Management (TC-C001–C012)', () => {

  // TC-C001
  it('C-001: create customer with valid data returns 201', async () => {
    const created = mockCustomer();
    prisma.customer.create.mockResolvedValue(created);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(customerPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.businessName).toBe(created.businessName);
  });

  // TC-C002: Invalid NTN (6 digits) → 400
  it('C-002: customer with 6-digit NTN returns 400 validation error', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(customerPayload({ ntn: '123456' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/7 digits/i);
  });

  // TC-C003: Invalid STRN (12 digits) → 400
  it('C-003: customer with 12-digit STRN returns 400 validation error', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(customerPayload({ strn: '123456789012' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/13 digits/i);
  });

  // TC-C004: List customers excludes isDeleted
  it('C-004: list customers only returns non-deleted (isDeleted: false)', async () => {
    const customers = [mockCustomer(), mockCustomer({ id: 'cust-002', businessName: 'Another Co' })];
    prisma.customer.findMany.mockResolvedValue(customers);
    prisma.customer.count.mockResolvedValue(2);

    const res = await request(app).get(BASE).set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(2);
    // Verify query used isDeleted: false (check mock was called with correct where)
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isDeleted: false }) })
    );
  });

  // TC-C005: Delete customer WITH invoices → soft-delete
  it('C-005: delete customer with invoices sets isDeleted=true (soft-delete)', async () => {
    const customerWithInvoices = mockCustomer({ _count: { invoices: 3 } });
    prisma.customer.findUnique.mockResolvedValue(customerWithInvoices);
    prisma.customer.update.mockResolvedValue({ ...customerWithInvoices, isDeleted: true });

    const res = await request(app)
      .delete(`/api/customers/${customerWithInvoices.id}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archived/i);
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDeleted: true } })
    );
    expect(prisma.customer.delete).not.toHaveBeenCalled();
  });

  // TC-C006: Delete customer WITHOUT invoices → hard-delete
  it('C-006: delete customer with no invoices performs hard-delete', async () => {
    const customerNoInvoices = mockCustomer({ _count: { invoices: 0 } });
    prisma.customer.findUnique.mockResolvedValue(customerNoInvoices);
    prisma.customer.delete.mockResolvedValue(customerNoInvoices);

    const res = await request(app)
      .delete(`/api/customers/${customerNoInvoices.id}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(prisma.customer.delete).toHaveBeenCalled();
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  // TC-C007: Get deleted customer → 404 (soft-deleted not shown)
  it('C-007: accessing a soft-deleted customer returns 404', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/customers/deleted-cust-id`)
      .set(authHeader());

    expect(res.status).toBe(404);
  });

  // TC-C008: IDOR — edit customer from Company B → 403
  it('C-008: IDOR — updating Company B customer from Company A token returns 403', async () => {
    const companyBCustomer = mockCustomer({ companyId: COMPANY_B });
    prisma.customer.findUnique.mockResolvedValue(companyBCustomer);

    const res = await request(app)
      .put(`/api/customers/${companyBCustomer.id}`)
      .set(authHeader())
      .send(customerPayload());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  // TC-C009: IDOR — get customer from Company B → 403
  it('C-009: IDOR — getting Company B customer from Company A token returns 403', async () => {
    const companyBCustomer = mockCustomer({ companyId: COMPANY_B });
    prisma.customer.findUnique.mockResolvedValue(companyBCustomer);

    const res = await request(app)
      .get(`/api/customers/${companyBCustomer.id}`)
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-C010: IDOR — requireCompanyAccess blocks cross-company list
  it('C-010: IDOR — listing Company B customers with Company A token returns 403', async () => {
    const res = await request(app)
      .get(`/api/companies/${COMPANY_B}/customers`)
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-C011: Phone 30 chars → accepted
  it('C-011: contactPhone of exactly 30 characters is accepted', async () => {
    prisma.customer.create.mockResolvedValue(mockCustomer());

    const phone30 = '+92-21-111-222-333-Extension30';  // exactly 30 chars
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(customerPayload({ contactPhone: phone30.slice(0, 30) }));

    expect(res.status).toBe(201);
  });

  // TC-C012: Phone 31 chars → 400
  it('C-012: contactPhone of 31 characters fails validation with 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(customerPayload({ contactPhone: 'A'.repeat(31) }));

    expect(res.status).toBe(400);
  });
});
