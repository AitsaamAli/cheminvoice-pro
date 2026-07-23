async function runPhase(prisma, name, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`✅ Migration "${name}" OK`);
  } catch (err) {
    console.warn(`Migration "${name}" skipped:`, err.message?.slice(0, 120));
  }
}

async function runMigrations(prisma) {
  // Phase 1 — Invoice payment columns
  await runPhase(prisma, 'invoice-payment', `
    ALTER TABLE "Invoice"
      ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
      ADD COLUMN IF NOT EXISTS "paidAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "paidAt"        TIMESTAMP(3)
  `);

  // Phase 2 — FBR V1.12 reference IRN + further tax total
  await runPhase(prisma, 'invoice-fbr-v112', `
    ALTER TABLE "Invoice"
      ADD COLUMN IF NOT EXISTS "referenceInvoiceIRN" TEXT,
      ADD COLUMN IF NOT EXISTS "totalFurtherTax"     DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  // Phase 3 — Product: Third Schedule + SRO fields
  await runPhase(prisma, 'product-third-schedule', `
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "isThirdSchedule" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "mrp"             DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "sroScheduleNo"   TEXT,
      ADD COLUMN IF NOT EXISTS "sroItemSerialNo" TEXT
  `);

  // Phase 4 — InvoiceItem: all V1.12 fields
  await runPhase(prisma, 'invoice-item-v112', `
    ALTER TABLE "InvoiceItem"
      ADD COLUMN IF NOT EXISTS "saleType"                        TEXT NOT NULL DEFAULT 'Goods',
      ADD COLUMN IF NOT EXISTS "fixedNotifiedValueOrRetailPrice" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "furtherTax"                      DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "salesTaxWithheldAtSource"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "fedPayable"                      DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sroScheduleNo"                   TEXT,
      ADD COLUMN IF NOT EXISTS "sroItemSerialNo"                 TEXT
  `);
}

module.exports = { runMigrations };
