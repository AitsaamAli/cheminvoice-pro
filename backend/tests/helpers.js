const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = process.env.JWT_SECRET;
const COMPANY_A = 'company-a-id-001';
const COMPANY_B = 'company-b-id-002';
const USER_A_ID = 'user-a-id-001';
const USER_B_ID = 'user-b-id-002';

function makeToken(overrides = {}) {
  const payload = {
    id: USER_A_ID,
    companyId: COMPANY_A,
    email: 'admin@companya.com',
    role: 'ADMIN',
    ...overrides,
  };
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

function adminToken(companyId = COMPANY_A) {
  return makeToken({ companyId, role: 'ADMIN' });
}

function staffToken(companyId = COMPANY_A) {
  return makeToken({ companyId, role: 'STAFF' });
}

function accountantToken(companyId = COMPANY_A) {
  return makeToken({ companyId, role: 'ACCOUNTANT' });
}

function companyBToken() {
  return makeToken({ id: USER_B_ID, companyId: COMPANY_B, email: 'admin@companyb.com' });
}

function expiredToken() {
  return jwt.sign({ id: USER_A_ID, companyId: COMPANY_A, role: 'ADMIN' }, TEST_JWT_SECRET, { expiresIn: -1 });
}

function tamperedToken() {
  const valid = adminToken();
  const [h, p, s] = valid.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  payload.role = 'SUPERADMIN';
  const tampered = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${h}.${tampered}.${s}`;
}

// ── Mock data factories ───────────────────────────────────────────────────────

function mockCompany(overrides = {}) {
  return {
    id: COMPANY_A,
    businessName: 'Test Chemicals Ltd',
    ntn: '1234567',
    strn: '1234567890123',
    address: '123 Industrial Area, Lahore',
    province: 'Punjab',
    city: 'Lahore',
    businessType: 'MANUFACTURER',
    lastInvoiceNumber: 0,
    lastQuotationNumber: 0,
    logoBase64: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function mockUser(overrides = {}) {
  return {
    id: USER_A_ID,
    email: 'admin@companya.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'ADMIN',
    companyId: COMPANY_A,
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2025-01-01'),
    password: '$2a$12$hashedpasswordhere',
    company: mockCompany(),
    ...overrides,
  };
}

function mockCustomer(overrides = {}) {
  return {
    id: 'customer-001',
    companyId: COMPANY_A,
    businessName: 'Test Buyer Pvt Ltd',
    ntn: '7654321',
    cnic: null,
    strn: '3210987654321',
    registrationType: 'REGISTERED',
    contactPerson: 'Ali Khan',
    contactPhone: '+92-300-1234567',
    contactEmail: 'buyer@test.com',
    address: '456 DHA, Karachi',
    province: 'Sindh',
    city: 'Karachi',
    isDeleted: false,
    createdAt: new Date('2025-01-15'),
    ...overrides,
  };
}

function mockProduct(overrides = {}) {
  return {
    id: 'product-001',
    companyId: COMPANY_A,
    productName: 'Chemical X',
    productCode: 'CHM-001',
    isService: false,
    hsCode: '29011000',
    description: 'Test chemical product',
    unitOfMeasure: 'KGM',
    defaultSalePrice: 500,
    defaultTaxRate: 18,
    isThirdSchedule: false,
    mrp: null,
    sroScheduleNo: null,
    sroItemSerialNo: null,
    trackStock: true,
    stockQuantity: 100,
    reorderLevel: 20,
    isActive: true,
    createdAt: new Date('2025-01-10'),
    ...overrides,
  };
}

function mockInvoice(overrides = {}) {
  return {
    id: 'invoice-001',
    companyId: COMPANY_A,
    customerId: 'customer-001',
    invoiceNumber: '1234567-2026-000001',
    invoiceDate: new Date('2026-07-01'),
    invoiceType: 'NORMAL_SALES_TAX_INVOICE',
    status: 'DRAFT',
    fbrStatus: 'PENDING',
    fbrInvoiceNumber: null,
    fbrQrCode: null,
    totalTaxableValue: 1000,
    totalSalesTax: 180,
    totalFurtherTax: 0,
    totalInvoiceAmount: 1180,
    paymentStatus: 'UNPAID',
    paidAmount: 0,
    paidAt: null,
    paymentMethod: 'CASH',
    sellerNtn: '1234567',
    sellerBusinessName: 'Test Chemicals Ltd',
    buyerBusinessName: 'Test Buyer Pvt Ltd',
    buyerRegistrationType: 'REGISTERED',
    createdAt: new Date('2026-07-01'),
    items: [mockInvoiceItem()],
    customer: mockCustomer(),
    company: mockCompany(),
    ...overrides,
  };
}

function mockInvoiceItem(overrides = {}) {
  return {
    id: 'item-001',
    invoiceId: 'invoice-001',
    productId: 'product-001',
    productCode: 'CHM-001',
    productDescription: 'Chemical X',
    hsCode: '29011000',
    saleType: 'Goods',
    quantity: 2,
    unitOfMeasure: 'KGM',
    unitPrice: 500,
    discountAmount: 0,
    taxableValue: 1000,
    taxRate: 18,
    taxAmount: 180,
    furtherTax: 0,
    totalAmount: 1180,
    ...overrides,
  };
}

function mockQuotation(overrides = {}) {
  return {
    id: 'quotation-001',
    companyId: COMPANY_A,
    customerId: 'customer-001',
    quotationNumber: 'QT-2026-07-000001',
    quotationDate: new Date('2026-07-01'),
    validUntil: new Date('2026-07-31'),
    status: 'DRAFT',
    notes: null,
    convertedToInvoiceId: null,
    totalTaxableValue: 1000,
    totalSalesTax: 180,
    totalInvoiceAmount: 1180,
    createdAt: new Date('2026-07-01'),
    items: [],
    customer: mockCustomer(),
    ...overrides,
  };
}

// Builds a valid createInvoice request body
function invoicePayload(overrides = {}) {
  return {
    customerId: 'customer-001',
    invoiceDate: '2026-07-01',
    invoiceType: 'NORMAL_SALES_TAX_INVOICE',
    items: [
      {
        productId: 'product-001',
        quantity: 2,
        unitPrice: 500,
        discountAmount: 0,
        taxRate: 18,
      },
    ],
    paymentMethod: 'CASH',
    ...overrides,
  };
}

// Builds a valid createCustomer request body
function customerPayload(overrides = {}) {
  return {
    businessName: 'New Customer Ltd',
    ntn: '9876543',
    registrationType: 'REGISTERED',
    contactPhone: '+92-21-111-222-333',
    ...overrides,
  };
}

// Builds a valid createProduct request body
function productPayload(overrides = {}) {
  return {
    productName: 'New Chemical',
    productCode: 'NC-001',
    hsCode: '29012000',
    unitOfMeasure: 'KGM',
    defaultSalePrice: 300,
    defaultTaxRate: 18,
    trackStock: false,
    ...overrides,
  };
}

function quotationPayload(overrides = {}) {
  return {
    customerId: 'customer-001',
    quotationDate: '2026-07-01',
    validUntil: '2026-07-31',
    items: [
      {
        productId: 'product-001',
        quantity: 1,
        unitPrice: 1000,
        discountAmount: 0,
        taxRate: 18,
      },
    ],
    ...overrides,
  };
}

module.exports = {
  COMPANY_A, COMPANY_B, USER_A_ID, USER_B_ID,
  adminToken, staffToken, accountantToken, companyBToken, expiredToken, tamperedToken,
  mockCompany, mockUser, mockCustomer, mockProduct, mockInvoice, mockInvoiceItem, mockQuotation,
  invoicePayload, customerPayload, productPayload, quotationPayload,
};
