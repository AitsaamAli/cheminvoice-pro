#!/usr/bin/env node
/**
 * FBR Sandbox Scenario Harness — Phase E
 *
 * Runs all standard scenario families through FBR validate + post endpoints
 * against the sandbox token. Outputs a pass/fail matrix.
 *
 * Usage:
 *   cd backend
 *   node scripts/fbrScenarioHarness.js
 *
 * Requires:
 *   FBR_SANDBOX_URL, FBR_SECURITY_TOKEN, FBR_MODE=sandbox in .env
 *
 * Each scenario is run through validateinvoicedata first, then postinvoicedata.
 * [VERIFY] ScenarioId values against your assigned IRIS sandbox portal scenarios.
 */

require('dotenv').config();
const axios = require('axios');
const FBR = require('../src/config/fbr');

// ── Shared seller / buyer fixtures ───────────────────────────────────────────
// [VERIFY] Use your actual NTN/STRN from IRIS sandbox registration
const SELLER = {
  businessName:  process.env.TEST_SELLER_NAME   || 'Chenab Chemicals Pvt Ltd',
  ntn:           process.env.TEST_SELLER_NTN    || '1234567',     // [VERIFY]
  strn:          process.env.TEST_SELLER_STRN   || '1234567890123', // [VERIFY]
  address:       'Plot 15 SITE Industrial Area Karachi',
  province:      'Sindh',
};

const BUYER_REGISTERED = {
  registrationType: 'REGISTERED',
  ntn:              '7654321',
  businessName:     'National Fertilizer Corp',
  province:         'Punjab',
  address:          'Fatima Jinnah Road Lahore',
  strn:             '9876543210123',
};

const BUYER_UNREGISTERED = {
  registrationType: 'UNREGISTERED',
  ntn:              '',
  businessName:     'Al-Rehman Trading',
  province:         'KPK',
  address:          'Saddar Peshawar',
  strn:             '',
};

// ── Scenario definitions ──────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'SN001',
    name: 'Standard Rate 18% — Sulfuric Acid',
    invoiceType: 1,
    buyer: BUYER_REGISTERED,
    items: [{
      HSCode: '28070010',        // [VERIFY] Sulfuric Acid HS Code
      ProductCode: 'SA-98',
      ProductDescription: 'Sulfuric Acid 98%',
      Quantity: 1000,
      UoM: 'KGM',
      UnitPrice: 460,
      Discount: 0,
      TaxableValue: 460000,
      TaxRate: 18,
      TaxAmount: 82800,
      TotalAmount: 542800,
    }],
    totalTaxable: 460000,
    totalTax: 82800,
    total: 542800,
  },
  {
    id: 'SN002',
    name: 'Reduced Rate 10% — [VERIFY correct rate/product]',
    invoiceType: 1,
    buyer: BUYER_REGISTERED,
    items: [{
      HSCode: '28112100',        // [VERIFY]
      ProductCode: 'CO2-99',
      ProductDescription: 'Carbon Dioxide 99%',
      Quantity: 500,
      UoM: 'KGM',
      UnitPrice: 120,
      Discount: 0,
      TaxableValue: 60000,
      TaxRate: 10,
      TaxAmount: 6000,
      TotalAmount: 66000,
    }],
    totalTaxable: 60000,
    totalTax: 6000,
    total: 66000,
  },
  {
    id: 'SN003',
    name: 'Reduced Rate 5% — [VERIFY correct rate/product]',
    invoiceType: 1,
    buyer: BUYER_REGISTERED,
    items: [{
      HSCode: '28030010',        // [VERIFY]
      ProductCode: 'CARBON-B',
      ProductDescription: 'Carbon Black Industrial',
      Quantity: 200,
      UoM: 'KGM',
      UnitPrice: 350,
      Discount: 0,
      TaxableValue: 70000,
      TaxRate: 5,
      TaxAmount: 3500,
      TotalAmount: 73500,
    }],
    totalTaxable: 70000,
    totalTax: 3500,
    total: 73500,
  },
  {
    id: 'SN004',
    name: 'Zero-Rated — Agricultural Urea',
    invoiceType: 1,
    buyer: BUYER_UNREGISTERED,
    items: [{
      HSCode: '31021000',        // [VERIFY] Urea HS Code
      ProductCode: 'UREA-46',
      ProductDescription: 'Agricultural Urea 46%',
      Quantity: 100,
      UoM: 'BAG',
      UnitPrice: 8500,
      Discount: 0,
      TaxableValue: 850000,
      TaxRate: 0,
      TaxAmount: 0,
      TotalAmount: 850000,
    }],
    totalTaxable: 850000,
    totalTax: 0,
    total: 850000,
  },
  {
    id: 'SN005',
    name: 'Export Invoice — Zero-Rated',
    invoiceType: 4,
    buyer: { ...BUYER_REGISTERED, registrationType: 'FOREIGN' },
    items: [{
      HSCode: '28070010',        // [VERIFY]
      ProductCode: 'SA-98-EXP',
      ProductDescription: 'Sulfuric Acid 98% (Export)',
      Quantity: 5000,
      UoM: 'KGM',
      UnitPrice: 430,
      Discount: 0,
      TaxableValue: 2150000,
      TaxRate: 0,
      TaxAmount: 0,
      TotalAmount: 2150000,
    }],
    totalTaxable: 2150000,
    totalTax: 0,
    total: 2150000,
  },
  {
    id: 'SN006',
    name: 'Multi-Line — Mixed Rates',
    invoiceType: 1,
    buyer: BUYER_REGISTERED,
    items: [
      {
        HSCode: '28070010',
        ProductCode: 'SA-98',
        ProductDescription: 'Sulfuric Acid 98%',
        Quantity: 500, UoM: 'KGM', UnitPrice: 460,
        Discount: 0, TaxableValue: 230000, TaxRate: 18, TaxAmount: 41400, TotalAmount: 271400,
      },
      {
        HSCode: '28151200',       // [VERIFY] Caustic Soda HS Code
        ProductCode: 'CSF-99',
        ProductDescription: 'Caustic Soda Flakes 99%',
        Quantity: 200, UoM: 'KGM', UnitPrice: 280.50,
        Discount: 500, TaxableValue: 55600, TaxRate: 18, TaxAmount: 10008, TotalAmount: 65608,
      },
    ],
    totalTaxable: 285600,
    totalTax: 51408,
    total: 337008,
  },
  {
    id: 'SN007',
    name: 'Credit Note — Reversal of SN001',
    invoiceType: 3,
    buyer: BUYER_REGISTERED,
    referenceInvoiceNo: 'CHEM-XXXX-2026-0001', // [VERIFY] use actual IRN from SN001
    items: [{
      HSCode: '28070010',
      ProductCode: 'SA-98',
      ProductDescription: 'Sulfuric Acid 98% (Return)',
      Quantity: -100, UoM: 'KGM', UnitPrice: 460,
      Discount: 0, TaxableValue: -46000, TaxRate: 18, TaxAmount: -8280, TotalAmount: -54280,
    }],
    totalTaxable: -46000,
    totalTax: -8280,
    total: -54280,
  },
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function callFBR(endpoint, payload) {
  const url = `${FBR.baseUrl}${endpoint}`;
  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${FBR.token}`,
        'Content-Type': 'application/json',
      },
      timeout: FBR.timeoutMs,
    });
    return { ok: true, status: res.status, data: res.data };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    };
  }
}

function buildPayload(scenario) {
  const today = new Date().toISOString().split('T')[0];
  return {
    InvoiceType:           scenario.invoiceType,
    InvoiceDate:           today,
    SellerBusinessName:    SELLER.businessName,
    SellerProvince:        SELLER.province,
    SellerNTNCNIC:         SELLER.ntn,
    SellerAddress:         SELLER.address,
    SellerSTRN:            SELLER.strn,
    BuyerRegistrationType: scenario.buyer.registrationType,
    BuyerNTNCNIC:          scenario.buyer.ntn || '',
    BuyerBusinessName:     scenario.buyer.businessName,
    BuyerProvince:         scenario.buyer.province,
    BuyerAddress:          scenario.buyer.address,
    BuyerSTRN:             scenario.buyer.strn || '',
    InvoiceRefNo:          `TEST-${scenario.id}-${Date.now()}`,
    ScenarioId:            scenario.id,
    ReferenceInvoiceNo:    scenario.referenceInvoiceNo || undefined,
    Items:                 scenario.items,
  };
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function runHarness() {
  if (!FBR.token) {
    console.error('\n❌ FBR_SECURITY_TOKEN not set — cannot run harness\n');
    process.exit(1);
  }
  if (FBR.mode !== 'sandbox') {
    console.error('\n❌ FBR_MODE must be "sandbox" to run the harness safely\n');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  FBR DI Sandbox Scenario Harness');
  console.log(`  Mode: ${FBR.mode.toUpperCase()}`);
  console.log(`  Base URL: ${FBR.baseUrl}`);
  console.log('══════════════════════════════════════════════════════\n');

  const results = [];

  for (const scenario of SCENARIOS) {
    process.stdout.write(`  Running ${scenario.id}: ${scenario.name} ... `);
    const payload = buildPayload(scenario);

    // Step 1: Validate
    const validateResult = await callFBR(FBR.endpoints.validate, payload);

    if (!validateResult.ok) {
      results.push({ id: scenario.id, name: scenario.name, validate: 'FAIL', post: 'SKIP', error: validateResult.data || validateResult.message });
      console.log('VALIDATE ❌');
      continue;
    }

    // Step 2: Post (only if validate passed)
    const postResult = await callFBR(FBR.endpoints.post, payload);

    if (postResult.ok) {
      const irn = postResult.data?.InvoiceNumber || postResult.data?.invoiceNumber || 'N/A';
      results.push({ id: scenario.id, name: scenario.name, validate: 'PASS', post: 'PASS', irn });
      console.log(`PASS ✅  (IRN: ${irn})`);
    } else {
      results.push({ id: scenario.id, name: scenario.name, validate: 'PASS', post: 'FAIL', error: postResult.data || postResult.message });
      console.log('POST ❌');
    }
  }

  // ── Summary matrix ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  SCENARIO RESULTS');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  ${'ID'.padEnd(8)} ${'VALIDATE'.padEnd(10)} ${'POST'.padEnd(8)} NAME`);
  console.log('  ' + '─'.repeat(60));

  for (const r of results) {
    const vIcon = r.validate === 'PASS' ? '✅' : '❌';
    const pIcon = r.post === 'PASS' ? '✅' : r.post === 'SKIP' ? '⏭' : '❌';
    console.log(`  ${r.id.padEnd(8)} ${(r.validate + ' ' + vIcon).padEnd(12)} ${(r.post + ' ' + pIcon).padEnd(10)} ${r.name}`);
    if (r.error) {
      const errStr = typeof r.error === 'string' ? r.error : JSON.stringify(r.error).slice(0, 120);
      console.log(`           └─ Error: ${errStr}`);
    }
    if (r.irn) console.log(`           └─ IRN: ${r.irn}`);
  }

  const passed = results.filter(r => r.post === 'PASS').length;
  const total = results.length;
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  ${passed}/${total} scenarios PASSED`);
  if (passed === total) {
    console.log('  ✅ All scenarios passed — ready to request production token');
  } else {
    console.log('  ❌ Fix failing scenarios before requesting production token');
  }
  console.log('══════════════════════════════════════════════════════\n');

  process.exit(passed === total ? 0 : 1);
}

runHarness().catch(err => {
  console.error('Harness crashed:', err.message);
  process.exit(1);
});
