/**
 * Field-level encryption for at-rest sensitive data (NTN/CNIC/STRN).
 *
 * AES-256-GCM, key from ENCRYPTION_KEY (any string — hashed to 32 bytes via
 * SHA-256 so the env var doesn't have to be exactly 64 hex chars).
 *
 * Backward-compatible by design: encryptField() is a no-op passthrough when
 * ENCRYPTION_KEY isn't set (existing behavior, existing data untouched), and
 * decryptField() passes through any value that isn't in our own ciphertext
 * format unchanged. That means:
 *   - Existing plaintext rows (pre-dating this feature) keep reading fine —
 *     no migration required, no risk to already-live data.
 *   - Once ENCRYPTION_KEY is set, new writes get encrypted going forward.
 */

const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return null;
  return crypto.createHash('sha256').update(secret).digest();
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encryptField(value) {
  if (value == null || value === '') return value;
  const key = getKey();
  if (!key) return value; // ENCRYPTION_KEY not configured — graceful no-op, matches SendGrid/optional-config pattern
  if (isEncrypted(value)) return value; // already encrypted — don't double-wrap

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptField(value) {
  if (!isEncrypted(value)) return value; // plaintext (pre-existing data, or key not configured) — pass through
  const key = getKey();
  if (!key) return value; // can't decrypt without the key — surface ciphertext rather than throw mid-request

  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(dataB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (err) {
    console.error('[encryption] Failed to decrypt field — wrong ENCRYPTION_KEY?', err.message);
    return value;
  }
}

module.exports = { encryptField, decryptField, isEncrypted };
