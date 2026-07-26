#!/usr/bin/env node
/**
 * Backfill CompanyMembership rows for every existing User.
 *
 * Multi-tenant login (one account -> many companies) is built on the new
 * CompanyMembership table. Any User created before this migration has no
 * membership row yet, so login() and the user-management endpoints fall
 * back to the legacy User.companyId/role fields for them. This script
 * brings every existing account up to date by giving it a membership row
 * for its current (home) company, matching its current role/isActive —
 * i.e. it changes nothing about who can access what, it just makes the
 * membership table complete.
 *
 * Safe to re-run: skipped users already have a matching membership
 * (unique on [userId, companyId]).
 *
 * Usage:
 *   cd backend
 *   node scripts/backfillCompanyMemberships.js
 */

require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, companyId: true, role: true, isActive: true },
  });

  console.log(`Found ${users.length} user(s). Backfilling CompanyMembership rows...\n`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = await prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: user.companyId } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.companyMembership.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        isActive: user.isActive,
      },
    });
    created++;
    console.log(`  + ${user.email} -> ${user.companyId} (${user.role})`);
  }

  console.log(`\nDone. Created ${created}, already up to date ${skipped}.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
