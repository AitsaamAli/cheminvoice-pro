module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/envSetup.js'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/lib/migration.js',
    '!src/jobs/fbrRetryJob.js',
  ],
};
