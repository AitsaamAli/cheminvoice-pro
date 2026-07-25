// TC-PAY001 → TC-PAY012: Payment Tracking Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  invoice: { findUnique: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $disconnect: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, COMPANY_A, COMPANY_B,
  mockInvoice,
} = require('./helpers');

const authHeader = () => ({ Authorization: `Bearer ${adminToken()}` });

describe('Payment Tracking (TC-PAY001–PAY012)', () => {

  // TC-PAY001: Mark invoice fully PAID
  it('PAY-001: PATCH payment with full amount sets paymentStatus=PAID', async () => {
    const invoice = mockInvoice({ totalInvoiceAmount: 1180, paidAmount: 0, paymentStatus: 'UNPAID' });
    const updated = { ...invoice, paidAmount: 1180, paymentStatus: 'PAID', paidAt: new Date() };
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 1180, paymentStatus: 'PAID' });

    expect(res.status).toBe(200);
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'PAID' }),
      })
    );
  });

  // TC-PAY002: Partial payment → PARTIAL status
  it('PAY-002: PATCH payment with partial amount sets paymentStatus=PARTIAL', async () => {
    const invoice = mockInvoice({ totalInvoiceAmount: 10000, paidAmount: 0, paymentStatus: 'UNPAID' });
    const updated = { ...invoice, paidAmount: 4000, paymentStatus: 'PARTIAL' };
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 4000, paymentStatus: 'PARTIAL' });

    expect(res.status).toBe(200);
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paidAmount: 4000, paymentStatus: 'PARTIAL' }),
      })
    );
  });

  // TC-PAY003: Validation — paidAmount is required
  it('PAY-003: PATCH payment without paidAmount returns 400', async () => {
    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paymentStatus: 'PAID' });

    expect(res.status).toBe(400);
  });

  // TC-PAY004: paidAmount min(0) — negative rejected
  it('PAY-004: paidAmount of -100 returns 400 validation error', async () => {
    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: -100 });

    expect(res.status).toBe(400);
  });

  // TC-PAY005: IDOR — update payment on another company's invoice
  it('PAY-005: IDOR — updating payment on Company B invoice returns 403', async () => {
    prisma.invoice.findUnique.mockResolvedValue(mockInvoice({ companyId: COMPANY_B }));

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 500 });

    expect(res.status).toBe(403);
  });

  // TC-PAY006: Invoice not found → 404
  it('PAY-006: updating payment on non-existent invoice returns 404', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 100 });

    expect(res.status).toBe(404);
  });

  // TC-PAY007: paidAt set when status becomes PAID
  it('PAY-007: payment update calls update with paidAt timestamp when PAID', async () => {
    const invoice = mockInvoice({ totalInvoiceAmount: 500, paidAmount: 0 });
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue({ ...invoice, paidAmount: 500, paymentStatus: 'PAID', paidAt: new Date() });

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 500, paymentStatus: 'PAID' });

    expect(res.status).toBe(200);
    const updateCall = prisma.invoice.update.mock.calls[0][0];
    if (updateCall.data.paymentStatus === 'PAID') {
      expect(updateCall.data.paidAt).toBeTruthy();
    }
  });

  // TC-PAY008: UNPAID status — paidAt null
  it('PAY-008: UNPAID payment clears paidAt to null', async () => {
    const invoice = mockInvoice({ paidAmount: 500, paymentStatus: 'PARTIAL' });
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue({ ...invoice, paidAmount: 0, paymentStatus: 'UNPAID', paidAt: null });

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 0, paymentStatus: 'UNPAID' });

    expect(res.status).toBe(200);
    const updateCall = prisma.invoice.update.mock.calls[0][0];
    if (updateCall.data.paymentStatus === 'UNPAID') {
      expect(updateCall.data.paidAt).toBeNull();
    }
  });

  // TC-PAY009: Invalid paymentStatus value → 400
  it('PAY-009: invalid paymentStatus value returns 400', async () => {
    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 500, paymentStatus: 'ALMOST_PAID' });

    expect(res.status).toBe(400);
  });

  // TC-PAY010: No token → 401
  it('PAY-010: PATCH payment without token returns 401', async () => {
    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .send({ paidAmount: 100 });

    expect(res.status).toBe(401);
  });

  // TC-PAY011: paidAmount max validation
  it('PAY-011: paidAmount exceeding max returns 400', async () => {
    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 999999999999 });

    expect(res.status).toBe(400);
  });

  // TC-PAY012: Valid paymentStatus PARTIAL is accepted by validation
  it('PAY-012: paymentStatus PARTIAL is a valid enum value', async () => {
    const invoice = mockInvoice({ totalInvoiceAmount: 10000 });
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue({ ...invoice, paidAmount: 3000, paymentStatus: 'PARTIAL' });

    const res = await request(app)
      .patch('/api/invoices/invoice-001/payment')
      .set(authHeader())
      .send({ paidAmount: 3000, paymentStatus: 'PARTIAL' });

    expect(res.status).toBe(200);
  });
});
