const { PrismaClient } = require('@prisma/client');
const { withFieldEncryption } = require('./prismaEncryption');

// Singleton: one connection pool for the entire process
const basePrisma = global.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = basePrisma;
}

// Transparent NTN/CNIC/STRN encryption at rest — see lib/prismaEncryption.js
const prisma = withFieldEncryption(basePrisma);

module.exports = prisma;
