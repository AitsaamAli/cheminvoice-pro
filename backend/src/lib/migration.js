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

  // Phase 5 — Universal business: businessType, isService, paymentMethod
  await runPhase(prisma, 'universal-business', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "businessType" TEXT NOT NULL DEFAULT 'MANUFACTURER'
  `);
  await runPhase(prisma, 'product-service', `
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "isService" BOOLEAN NOT NULL DEFAULT false,
      ALTER COLUMN "hsCode" SET DEFAULT ''
  `);
  await runPhase(prisma, 'invoice-payment-method', `
    ALTER TABLE "Invoice"
      ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CASH'
  `);

  // Phase 6 — Company logo + last quotation counter
  await runPhase(prisma, 'company-logo', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "logoBase64"          TEXT,
      ADD COLUMN IF NOT EXISTS "lastQuotationNumber" INTEGER NOT NULL DEFAULT 0
  `);

  // Phase 7 — Product stock tracking
  await runPhase(prisma, 'product-stock', `
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "trackStock"    BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "stockQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reorderLevel"  DOUBLE PRECISION NOT NULL DEFAULT 0
  `);

  // Phase 8 — Quotations table
  await runPhase(prisma, 'quotations-table', `
    CREATE TABLE IF NOT EXISTS "Quotation" (
      "id"                   TEXT NOT NULL PRIMARY KEY,
      "companyId"            TEXT NOT NULL,
      "customerId"           TEXT NOT NULL,
      "quotationNumber"      TEXT NOT NULL UNIQUE,
      "quotationDate"        TIMESTAMP(3) NOT NULL,
      "validUntil"           TIMESTAMP(3),
      "status"               TEXT NOT NULL DEFAULT 'DRAFT',
      "totalTaxableValue"    DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalSalesTax"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalAmount"          DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes"                TEXT,
      "convertedToInvoiceId" TEXT,
      "createdByUserId"      TEXT NOT NULL,
      "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Phase 9 — QuotationItems table
  await runPhase(prisma, 'quotation-items-table', `
    CREATE TABLE IF NOT EXISTS "QuotationItem" (
      "id"                 TEXT NOT NULL PRIMARY KEY,
      "quotationId"        TEXT NOT NULL,
      "productId"          TEXT NOT NULL,
      "productDescription" TEXT NOT NULL,
      "quantity"           DOUBLE PRECISION NOT NULL,
      "unitPrice"          DOUBLE PRECISION NOT NULL,
      "discountAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
      "taxRate"            DOUBLE PRECISION NOT NULL DEFAULT 18,
      "taxableValue"       DOUBLE PRECISION NOT NULL,
      "taxAmount"          DOUBLE PRECISION NOT NULL,
      "totalAmount"        DOUBLE PRECISION NOT NULL,
      "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Phase 10 — Customer soft-delete flag (replaces [DELETED] name hack)
  await runPhase(prisma, 'customer-isDeleted', `
    ALTER TABLE "Customer"
      ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false
  `);
  // Migrate existing [DELETED] customers to the proper flag
  await runPhase(prisma, 'customer-isDeleted-migrate', `
    UPDATE "Customer"
    SET "isDeleted" = true,
        "businessName" = REPLACE(REPLACE(REPLACE(REPLACE(
          "businessName",
          ' [DELETED]', ''), '[DELETED] ', ''), '[DELETED]', ''),
          '  ', ' ')
    WHERE "businessName" LIKE '%[DELETED]%'
  `);

  // Phase 11 — Subscription / trial fields on Company
  await runPhase(prisma, 'company-subscription-status', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL'
  `);
  await runPhase(prisma, 'company-trial-invoices-used', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "trialInvoicesUsed" INTEGER NOT NULL DEFAULT 0
  `);
  await runPhase(prisma, 'company-trial-invoice-limit', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "trialInvoiceLimit" INTEGER NOT NULL DEFAULT 5
  `);
  await runPhase(prisma, 'company-activated-at', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3)
  `);
  await runPhase(prisma, 'company-suspended-at', `
    ALTER TABLE "Company"
      ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3)
  `);
}

module.exports = { runMigrations };
