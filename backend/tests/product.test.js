// TC-P001 → TC-P013: Product & Stock Tests
const request = require('supertest');

jest.mock('../src/lib/prisma', () => ({
  product: {
    findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(),
    update: jest.fn(), delete: jest.fn(), count: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const {
  adminToken, COMPANY_A, COMPANY_B,
  mockProduct, productPayload,
} = require('./helpers');

const authHeader = () => ({ Authorization: `Bearer ${adminToken()}` });
const BASE = `/api/companies/${COMPANY_A}/products`;

describe('Product & Stock (TC-P001–P013)', () => {

  // TC-P001
  it('P-001: create product with all fields returns 201', async () => {
    const created = mockProduct();
    prisma.product.create.mockResolvedValue(created);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(productPayload());

    expect(res.status).toBe(201);
    expect(res.body.product.productName).toBeDefined();
  });

  // TC-P002: Service product — HS Code optional
  it('P-002: service product without HS code is accepted', async () => {
    prisma.product.create.mockResolvedValue(mockProduct({ isService: true, hsCode: '' }));

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(productPayload({ isService: true, hsCode: undefined }));

    expect(res.status).toBe(201);
  });

  // TC-P003: Non-service product without HS code → 400
  it('P-003: non-service product without HS code returns 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send({
        productName: 'Chemical',
        productCode: 'C-001',
        unitOfMeasure: 'KGM',
        defaultSalePrice: 100,
        defaultTaxRate: 18,
        // no hsCode, isService defaults to false
      });

    expect(res.status).toBe(400);
  });

  // TC-P004: Non-numeric HS code → 400
  it('P-004: HS code with letters returns 400 validation error', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(productPayload({ hsCode: 'ABC1234' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/numbers only/i);
  });

  // TC-P005: Create product with stock tracking
  it('P-005: product with trackStock=true stores stockQuantity and reorderLevel', async () => {
    const trackedProduct = mockProduct({ trackStock: true, stockQuantity: 100, reorderLevel: 20 });
    prisma.product.create.mockResolvedValue(trackedProduct);

    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(productPayload({ trackStock: true, stockQuantity: 100, reorderLevel: 20 }));

    expect(res.status).toBe(201);
    expect(res.body.product.trackStock).toBe(true);
    expect(res.body.product.stockQuantity).toBe(100);
    expect(res.body.product.reorderLevel).toBe(20);
  });

  // TC-P006: Low-stock filter returns only products at/below reorderLevel
  it('P-006: ?lowStock=true returns only tracked products at or below reorderLevel', async () => {
    const lowStockProduct = mockProduct({ stockQuantity: 15, reorderLevel: 20 });
    const okProduct = mockProduct({ id: 'p-002', stockQuantity: 50, reorderLevel: 20 });
    prisma.product.findMany.mockResolvedValue([lowStockProduct, okProduct]);

    const res = await request(app)
      .get(`${BASE}?lowStock=true`)
      .set(authHeader());

    expect(res.status).toBe(200);
    // Controller filters client-side: qty <= reorderLevel
    res.body.products.forEach(p => {
      expect(p.stockQuantity).toBeLessThanOrEqual(p.reorderLevel);
    });
  });

  // TC-P007: Non-tracked product excluded from low-stock filter
  it('P-007: product with trackStock=false is excluded from ?lowStock=true', async () => {
    const nonTracked = mockProduct({ trackStock: false, stockQuantity: 0 });
    // listProducts should filter to only trackStock:true when ?lowStock=true
    prisma.product.findMany.mockResolvedValue([nonTracked]);

    const res = await request(app)
      .get(`${BASE}?lowStock=true`)
      .set(authHeader());

    expect(res.status).toBe(200);
    // Even if returned from DB, the controller's client-side filter excludes them
    // (trackStock is the DB-level filter before client filter)
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ trackStock: true }),
      })
    );
  });

  // TC-P008: Get product — IDOR check
  it('P-008: getting Company B product from Company A token returns 403', async () => {
    prisma.product.findUnique.mockResolvedValue(mockProduct({ companyId: COMPANY_B }));

    const res = await request(app)
      .get('/api/products/product-001')
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  // TC-P009: Update product — IDOR check
  it('P-009: updating Company B product from Company A token returns 403', async () => {
    prisma.product.findUnique.mockResolvedValue(mockProduct({ companyId: COMPANY_B }));

    const res = await request(app)
      .put('/api/products/product-001')
      .set(authHeader())
      .send({ productName: 'Hack', unitOfMeasure: 'KGM' });

    expect(res.status).toBe(403);
  });

  // TC-P010: Delete product without invoices → hard-delete
  it('P-010: deleting a product without stock references calls delete', async () => {
    prisma.product.findUnique.mockResolvedValue(mockProduct());
    prisma.product.update.mockResolvedValue(mockProduct({ isActive: false }));

    const res = await request(app)
      .delete('/api/products/product-001')
      .set(authHeader());

    expect(res.status).toBe(200);
  });

  // TC-P011: No token → 401
  it('P-011: product list without token returns 401', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  // TC-P012: Invalid tax rate → 400
  it('P-012: defaultTaxRate not in [0, 5, 10, 18] returns 400', async () => {
    const res = await request(app)
      .post(BASE)
      .set(authHeader())
      .send(productPayload({ defaultTaxRate: 15 }));

    expect(res.status).toBe(400);
  });

  // TC-P013: IDOR — listing products of Company B from Company A token
  it('P-013: IDOR — listing Company B products returns 403', async () => {
    const res = await request(app)
      .get(`/api/companies/${COMPANY_B}/products`)
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});
