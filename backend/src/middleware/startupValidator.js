/**
 * Validates all required environment variables at startup.
 * Crashes with a clear list of missing vars rather than failing silently later.
 */
function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    // CORS_ORIGIN is optional — defaults to * (all origins) if not set
  ];

  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error('\n🔴 STARTUP FAILED — Missing required environment variables:');
    missing.forEach(k => console.error(`   ✗ ${k}`));
    console.error('\nSet these in your .env file or Vercel environment settings.\n');
    process.exit(1);
  }

  // Warn about weak JWT secret (less than 32 chars)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is shorter than 32 characters — use a longer random secret in production.');
  }
  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️  JWT_REFRESH_SECRET is shorter than 32 characters.');
  }

  // Warn if CORS_ORIGIN is wildcard
  if (process.env.CORS_ORIGIN === '*') {
    console.warn('⚠️  CORS_ORIGIN is set to wildcard (*) — restrict to your frontend domain in production.');
  }

  console.log('✅ Environment validated.');
}

module.exports = { validateEnv };
