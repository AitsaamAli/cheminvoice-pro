const { PrismaClient } = require('@prisma/client');

// Singleton: one connection pool for the entire process
const prisma = global.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
