// TC-A001 → TC-A012: Authentication & Session Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  company: { create: jest.fn() },
  companyMembership: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  $disconnect: jest.fn(),
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpw'),
  compare: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');
const { adminToken, expiredToken, tamperedToken, mockUser } = require('./helpers');

const VALID_USER = mockUser();

describe('Auth & Session (TC-A001–A012)', () => {

  beforeEach(() => {
    // Default: no membership row yet (pre-backfill account) — login() falls
    // back to the legacy User.role/isActive, matching pre-multi-tenant behavior.
    prisma.companyMembership.findUnique.mockResolvedValue(null);
    prisma.companyMembership.findMany.mockResolvedValue([]);
  });

  // TC-A001
  it('A-001: login with valid credentials returns tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    bcrypt.compare.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(VALID_USER);

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@companya.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.companyId).toBeDefined();
    // Security: password must NOT be in response
    expect(JSON.stringify(res.body)).not.toContain('hashedpw');
  });

  // TC-A002
  it('A-002: wrong password returns 401 — no token in response', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@companya.com',
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
  });

  // TC-A003: Non-existent email returns same 401 (no user enumeration)
  it('A-003: non-existent email returns 401, not 404 (no user enumeration)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@nowhere.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).not.toMatch(/not found/i);
    expect(res.body.error).not.toMatch(/email/i);
  });

  // TC-A004: Duplicate email on register returns 409
  it('A-004: register with duplicate email returns 409', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER);

    const res = await request(app).post('/api/auth/register').send({
      email: 'admin@companya.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(res.status).toBe(409);
  });

  // TC-A005: No token → 401
  it('A-005: protected route without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/No token/i);
  });

  // TC-A006: Expired token → 401 with "Token expired"
  it('A-006: expired token returns 401 with Token expired message', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  // TC-A007: Logout returns success
  it('A-007: logout with valid token returns success', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // TC-A008: GET /auth/me returns user with companyId — password must NOT be in response
  it('A-008: GET /auth/me returns user including companyId and company, password excluded', async () => {
    // Simulate what Prisma returns after the `select` (no password field)
    const { password: _, ...safeUser } = VALID_USER;
    prisma.user.findUnique.mockResolvedValue(safeUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.companyId).toBeDefined();
    expect(res.body.company).toBeDefined();
    expect(res.body.password).toBeUndefined();
  });

  // TC-A009: Register with short password → 400
  it('A-009: register with password < 8 chars returns 400 validation error', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new@user.com',
      password: 'short',
      firstName: 'New',
      lastName: 'User',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  // TC-A010: Register with invalid email → 400
  it('A-010: register with invalid email returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    });

    expect(res.status).toBe(400);
  });

  // TC-A011: Tampered JWT signature → 401
  it('A-011: tampered JWT payload returns 401 Invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tamperedToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid token/i);
  });

  // TC-A012: Deactivated user cannot login
  it('A-012: deactivated user login returns 403', async () => {
    const inactiveUser = mockUser({ isActive: false });
    prisma.user.findUnique.mockResolvedValue(inactiveUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@companya.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(403);
  });

  // TC-A013: Login uses the CompanyMembership role when one exists (multi-tenant)
  it('A-013: login resolves role from CompanyMembership over the legacy User.role', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER); // User.role = ADMIN
    bcrypt.compare.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(VALID_USER);
    prisma.companyMembership.findUnique.mockResolvedValue({ role: 'ACCOUNTANT', isActive: true });
    prisma.companyMembership.findMany.mockResolvedValue([
      { companyId: VALID_USER.companyId, role: 'ACCOUNTANT', company: { businessName: 'Test Chemicals Ltd' } },
    ]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@companya.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ACCOUNTANT');
    expect(res.body.companies).toHaveLength(1);
    expect(res.body.companies[0].isHome).toBe(true);
  });

  // TC-A014: Login blocked when the home-company membership itself is inactive
  it('A-014: login returns 403 when the CompanyMembership for the home company is inactive', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    bcrypt.compare.mockResolvedValue(true);
    prisma.companyMembership.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: false });

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@companya.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(403);
  });

  // TC-A015: switch-company succeeds for an active membership and returns new tokens
  it('A-015: switch-company returns a new token scoped to the target company', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.companyMembership.findUnique.mockResolvedValue({
      role: 'ACCOUNTANT', isActive: true, company: { subscriptionStatus: 'ACTIVE' },
    });

    const res = await request(app)
      .post('/api/auth/switch-company')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ companyId: 'company-c-id-003' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.companyId).toBe('company-c-id-003');
    expect(res.body.user.role).toBe('ACCOUNTANT');
  });

  // TC-A016: switch-company rejects a company the user isn't a member of
  it('A-016: switch-company returns 403 for a company with no membership', async () => {
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.companyMembership.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/switch-company')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ companyId: 'company-not-a-member-id' });

    expect(res.status).toBe(403);
  });

  // TC-A017: my-companies lists active memberships for the logged-in user
  it('A-017: my-companies returns the caller\'s active memberships', async () => {
    prisma.companyMembership.findMany.mockResolvedValue([
      { companyId: 'company-a-id-001', role: 'ADMIN', company: { businessName: 'Test Chemicals Ltd' } },
      { companyId: 'company-c-id-003', role: 'VIEWER', company: { businessName: 'Second Client Ltd' } },
    ]);

    const res = await request(app)
      .get('/api/auth/my-companies')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.companies).toHaveLength(2);
    expect(res.body.companies[0].isHome).toBe(true);
    expect(res.body.companies[1].isHome).toBe(false);
  });
});
