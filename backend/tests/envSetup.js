// Runs BEFORE any module is imported. Sets test env vars so validateEnv() passes.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long-here!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.CORS_ORIGIN = '*';
process.env.FBR_MODE = 'sandbox';
process.env.FBR_SECURITY_TOKEN = 'test-fbr-token';
