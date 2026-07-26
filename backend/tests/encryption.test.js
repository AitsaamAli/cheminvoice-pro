// TC-E001 → TC-E010: Field-level encryption (lib/encryption.js, lib/prismaEncryption.js)
const { encryptField, decryptField, isEncrypted } = require('../src/lib/encryption');
const { decryptRecord, encryptWriteData } = require('../src/lib/prismaEncryption');

describe('encryption.js (TC-E001-E006)', () => {
  const OLD_ENV = process.env.ENCRYPTION_KEY;
  afterEach(() => { process.env.ENCRYPTION_KEY = OLD_ENV; });

  it('E-001: round-trips a value through encrypt then decrypt', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-jest-only';
    const encrypted = encryptField('1234567');
    expect(encrypted).not.toBe('1234567');
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decryptField(encrypted)).toBe('1234567');
  });

  it('E-002: two encryptions of the same value produce different ciphertext (random IV)', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-jest-only';
    const a = encryptField('1234567890123');
    const b = encryptField('1234567890123');
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe('1234567890123');
    expect(decryptField(b)).toBe('1234567890123');
  });

  it('E-003: without ENCRYPTION_KEY, encryptField is a no-op passthrough', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(encryptField('1234567')).toBe('1234567');
  });

  it('E-004: decryptField passes plaintext (non-encrypted) values through unchanged', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-jest-only';
    expect(decryptField('1234567')).toBe('1234567');
    expect(decryptField('3210987654321')).toBe('3210987654321');
  });

  it('E-005: null/empty values pass through both directions', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-jest-only';
    expect(encryptField(null)).toBe(null);
    expect(encryptField('')).toBe('');
    expect(decryptField(null)).toBe(null);
  });

  it('E-006: decrypting with the wrong key returns the ciphertext rather than throwing', () => {
    process.env.ENCRYPTION_KEY = 'key-one';
    const encrypted = encryptField('1234567');
    process.env.ENCRYPTION_KEY = 'key-two';
    expect(() => decryptField(encrypted)).not.toThrow();
    expect(decryptField(encrypted)).toBe(encrypted); // failed decrypt surfaces ciphertext, not a crash
  });
});

describe('prismaEncryption.js (TC-E007-E010)', () => {
  const OLD_ENV = process.env.ENCRYPTION_KEY;
  beforeEach(() => { process.env.ENCRYPTION_KEY = 'test-key-for-jest-only'; });
  afterEach(() => { process.env.ENCRYPTION_KEY = OLD_ENV; });

  it('E-007: encryptWriteData only touches the model\'s known encrypted fields', () => {
    const data = encryptWriteData('Customer', { businessName: 'Acme', ntn: '1234567', cnic: null, city: 'Lahore' });
    expect(data.businessName).toBe('Acme'); // untouched
    expect(data.city).toBe('Lahore'); // untouched
    expect(isEncrypted(data.ntn)).toBe(true);
    expect(data.cnic).toBe(null); // untouched (not a string)
  });

  it('E-008: encryptWriteData is a no-op for models with no encrypted fields (e.g. Product)', () => {
    const data = { productName: 'Chemical X', stockQuantity: 100 };
    expect(encryptWriteData('Product', data)).toEqual(data);
  });

  it('E-009: decryptRecord decrypts an Invoice\'s own denormalized fields', () => {
    const encryptedNtn = encryptField('1234567');
    const record = { id: 'inv-1', sellerNtn: encryptedNtn, buyerCnic: null, totalInvoiceAmount: 1000 };
    decryptRecord('Invoice', record);
    expect(record.sellerNtn).toBe('1234567');
    expect(record.totalInvoiceAmount).toBe(1000); // untouched
  });

  it('E-010: decryptRecord recursively decrypts nested company/customer includes', () => {
    const record = {
      id: 'inv-1',
      sellerNtn: encryptField('1234567'),
      company: { id: 'c1', ntn: encryptField('7654321'), strn: encryptField('1111111111111') },
      customer: { id: 'cust1', ntn: encryptField('9999999'), businessName: 'Buyer Co' },
    };
    decryptRecord('Invoice', record);
    expect(record.sellerNtn).toBe('1234567');
    expect(record.company.ntn).toBe('7654321');
    expect(record.company.strn).toBe('1111111111111');
    expect(record.customer.ntn).toBe('9999999');
    expect(record.customer.businessName).toBe('Buyer Co'); // untouched
  });
});
