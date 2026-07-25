require('dotenv').config();

const { validateEnv } = require('./middleware/startupValidator');
validateEnv();

const app = require('./app');

const { runMigrations } = require('./lib/migration');
const prismaForMigration = require('./lib/prisma');
runMigrations(prismaForMigration);

const { startRetryJob } = require('./jobs/fbrRetryJob');
const retryJobTimer = startRetryJob();

const prisma = require('./lib/prisma');
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received — shutting down gracefully`);
  if (retryJobTimer) clearInterval(retryJobTimer);
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
