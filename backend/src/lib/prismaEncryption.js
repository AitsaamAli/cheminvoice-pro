/**
 * Prisma Client Extension — transparent field-level encryption.
 *
 * Encrypts NTN/CNIC/STRN on write, decrypts on read, for the three models
 * that store them: Company, Customer, and Invoice (which denormalizes
 * seller/buyer NTN/CNIC/STRN at creation time for FBR submission + PDFs).
 *
 * Nested includes of `company`/`customer` (e.g. invoiceController's
 * `include: { company: true, customer: true }` for FBR submission and PDF
 * generation) are decrypted too — those are the only two relations in this
 * codebase that carry encrypted fields.
 *
 * See lib/encryption.js for the backward-compatibility contract: existing
 * plaintext rows keep reading fine with no migration; encryption only
 * applies to values written after ENCRYPTION_KEY is configured.
 */

const { encryptField, decryptField } = require('./encryption');

const ENCRYPTED_FIELDS = {
  Company: ['ntn', 'strn'],
  Customer: ['ntn', 'cnic', 'strn'],
  Invoice: ['sellerNtn', 'sellerStrn', 'buyerNtn', 'buyerCnic', 'buyerStrn'],
};

// Relation keys that may appear on a decrypted record and themselves carry
// encrypted fields — only the ones actually used via `include`/`select` in
// this codebase.
const RELATION_MODELS = { company: 'Company', customer: 'Customer' };

function encryptWriteData(modelName, data) {
  const fields = ENCRYPTED_FIELDS[modelName];
  if (!fields || !data || typeof data !== 'object') return data;
  const out = { ...data };
  for (const f of fields) {
    if (typeof out[f] === 'string') out[f] = encryptField(out[f]);
  }
  return out;
}

function decryptRecord(modelName, record) {
  if (!record || typeof record !== 'object') return record;

  const fields = ENCRYPTED_FIELDS[modelName];
  if (fields) {
    for (const f of fields) {
      if (typeof record[f] === 'string') record[f] = decryptField(record[f]);
    }
  }

  for (const [relationKey, relatedModel] of Object.entries(RELATION_MODELS)) {
    if (record[relationKey] && typeof record[relationKey] === 'object') {
      decryptRecord(relatedModel, record[relationKey]);
    }
  }

  return record;
}

function decryptResult(modelName, result) {
  if (Array.isArray(result)) {
    result.forEach(r => decryptRecord(modelName, r));
    return result;
  }
  return decryptRecord(modelName, result);
}

function withFieldEncryption(prisma) {
  return prisma.$extends({
    name: 'field-encryption',
    query: {
      $allModels: {
        async create({ model, args, query }) {
          if (args.data) args.data = encryptWriteData(model, args.data);
          return decryptResult(model, await query(args));
        },
        async update({ model, args, query }) {
          if (args.data) args.data = encryptWriteData(model, args.data);
          return decryptResult(model, await query(args));
        },
        async upsert({ model, args, query }) {
          if (args.create) args.create = encryptWriteData(model, args.create);
          if (args.update) args.update = encryptWriteData(model, args.update);
          return decryptResult(model, await query(args));
        },
        async findUnique({ model, args, query }) {
          return decryptResult(model, await query(args));
        },
        async findFirst({ model, args, query }) {
          return decryptResult(model, await query(args));
        },
        async findMany({ model, args, query }) {
          return decryptResult(model, await query(args));
        },
      },
    },
  });
}

module.exports = { withFieldEncryption, ENCRYPTED_FIELDS, decryptRecord, encryptWriteData };
