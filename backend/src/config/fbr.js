/**
 * SSOT — all FBR/PRAL constants in one place.
 * Every other module imports from here; nothing is duplicated.
 *
 * [VERIFY] items are marked with comments — confirm with FBR/PRAL before going live.
 */

// INV-9: Sandbox config can never hit a production URL/token
const mode = process.env.FBR_MODE || 'sandbox';
if (mode === 'production' && !process.env.FBR_PRODUCTION_URL) {
  throw new Error('[FBR CONFIG] FBR_PRODUCTION_URL must be set when FBR_MODE=production');
}
if (mode === 'production' && !process.env.FBR_SECURITY_TOKEN) {
  throw new Error('[FBR CONFIG] FBR_SECURITY_TOKEN must be set when FBR_MODE=production');
}

const SANDBOX_URL = process.env.FBR_SANDBOX_URL || 'https://gw.fbr.gov.pk/di_data/v1';
const PRODUCTION_URL = process.env.FBR_PRODUCTION_URL || '';

const FBR = {
  mode,

  get baseUrl() {
    return mode === 'production' ? PRODUCTION_URL : SANDBOX_URL;
  },

  get token() {
    return process.env.FBR_SECURITY_TOKEN;
  },

  // [VERIFY] Confirm exact path suffixes with latest PRAL DI API PDF
  endpoints: {
    post:             mode === 'production' ? '/di/postinvoicedata'     : '/di/postinvoicedata_sb',
    validate:         mode === 'production' ? '/di/validateinvoicedata' : '/di/validateinvoicedata_sb',
  },

  // HTTP timeout for FBR API calls
  timeoutMs: 15000,

  // Retry policy for transient failures (5xx, 429)
  maxRetries: 3,
  retryBaseDelayMs: 1000,

  // INV-7: FBR allows cancellation only within 72 hours of invoice generation
  cancelWindowHours: 72,

  // Max retries before the offline queue gives up permanently
  queueMaxRetries: 5,

  // How often the retry job polls for failed submissions (ms)
  queuePollIntervalMs: 5 * 60 * 1000,

  // [VERIFY] UOM codes accepted by FBR DI API — confirm against reference API
  uomCodes: ['KGM', 'LTR', 'TNE', 'DRM', 'BAG', 'NUM'],

  // [VERIFY] Valid sales tax rates for chemical sector under current SRO schedule
  allowedTaxRates: [0, 5, 10, 18],

  // Maps internal invoice type strings to FBR DocumentTypeID integers
  // [VERIFY] Confirm DocumentTypeID values against FBR reference APIs
  invoiceTypeMap: {
    NORMAL_SALES_TAX_INVOICE: 1,
    DEBIT_NOTE:               2,
    CREDIT_NOTE:              3,
    EXPORT_INVOICE:           4,
  },

  /**
   * ScenarioId mapping by invoice type and tax rate.
   * [VERIFY] FBR assigns scenarios per business type (Manufacturer/Importer/etc).
   * These are standard scenario IDs — confirm your assigned set in the IRIS sandbox portal.
   */
  scenarioIdMap: {
    NORMAL_SALES_TAX_INVOICE: {
      18: 'SN001',  // Standard rate
      10: 'SN002',  // Reduced rate [VERIFY]
      5:  'SN003',  // Reduced rate [VERIFY]
      0:  'SN004',  // Zero-rated [VERIFY]
    },
    EXPORT_INVOICE: {
      0: 'SN005',   // Export zero-rated [VERIFY]
    },
    DEBIT_NOTE:   { default: 'SN006' },  // [VERIFY]
    CREDIT_NOTE:  { default: 'SN007' },  // [VERIFY]
  },

  /**
   * Resolve ScenarioId from invoice type + dominant tax rate.
   */
  resolveScenarioId(invoiceType, taxRate) {
    const typeMap = this.scenarioIdMap[invoiceType];
    if (!typeMap) return 'SN001';
    if (typeMap.default) return typeMap.default;
    return typeMap[taxRate] || typeMap[18] || 'SN001';
  },

  /**
   * FBR error code → user-readable message (Roman Urdu / English).
   * [VERIFY] Confirm exact error codes against the PRAL DI API error documentation.
   */
  errorMessages: {
    'E001': 'NTN ghalat hai — NTN 7 digits hona chahiye',
    'E002': 'STRN ghalat hai — STRN 13 digits hona chahiye',
    'E003': 'Invoice number duplicate hai — already submit ho chuka hai',
    'E004': 'Buyer ka registration type ghalat hai',
    'E005': 'HS Code FBR list mein nahi hai — [VERIFY] correct code',
    'E006': 'Tax rate ghalat hai is HS Code ke liye',
    'E007': 'Invoice date ghalat format mein hai',
    'E008': 'Amount mismatch — totals recalculate karein',
    'E009': 'Token invalid ya expire ho gaya — IRIS portal se naya token lein',
    'E010': 'Scenario assign nahi hua — IRIS portal check karein',
    'E011': 'UOM (unit of measure) FBR list mein nahi hai',
    'E012': 'Buyer NTN/CNIC verify nahi ho saka',
    'TIMEOUT': 'FBR server ne response nahi diya — 15 seconds baad try karein',
    'NETWORK': 'FBR server se connection nahi hua — internet ya static IP check karein',
    'DEFAULT': 'FBR submission fail hui — details check karein aur dobara try karein',
  },

  /**
   * Translate a raw FBR error or HTTP error into a user-readable message.
   */
  translateError(rawError) {
    if (!rawError) return this.errorMessages.DEFAULT;
    const str = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
    for (const [code, msg] of Object.entries(this.errorMessages)) {
      if (code === 'DEFAULT') continue;
      if (str.includes(code)) return msg;
    }
    if (str.toLowerCase().includes('timeout')) return this.errorMessages.TIMEOUT;
    if (str.toLowerCase().includes('network') || str.toLowerCase().includes('econnrefused')) {
      return this.errorMessages.NETWORK;
    }
    return this.errorMessages.DEFAULT;
  },
};

module.exports = FBR;
