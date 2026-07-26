# DELIVERY.md — ChemInvoice Pro Brownfield Completion
> Phase H output. Covers what existed vs what was added, configuration guide, and remaining [VERIFY] items.

---

## What Was Already There (Pre-existing, WORKING)

| Component | Status |
|-----------|--------|
| Express backend with Helmet/CORS/Morgan | Working |
| JWT auth (register, login, refresh, logout, /me) | Working |
| Invoice CRUD (create, list, get, PDF) | Working |
| Customer CRUD with soft-archive on delete | Working |
| Product CRUD with soft-delete | Working |
| Customer portal (OTP login, invoice view, balance) | Working |
| PDFKit invoice PDF with QR code | Working |
| SendGrid email service with console fallback | Working |
| Prisma schema (9 models, proper cascades/indexes) | Working |
| IDOR prevention (requireCompanyAccess + per-controller) | Working |
| Float-safe monetary math | Working |
| Atomic invoice number generation | Working |
| Rate limiting (auth/OTP/general tiers) | Working |
| Joi validation for all entities | Working |
| Global error handler (no leaks) | Working |
| Startup env validator | Working |
| CORS fix (server-to-server allowed) | Working |
| Frontend: Login, Dashboard, Customers, Products, InvoiceForm | Working |
| Reports page (date range, totals, table) | Working |

---

## What Was Added (This Session)

### Phase B — SSOT
- **`backend/src/config/fbr.js`** — Single source of truth for all FBR constants: endpoints, timeouts, UOM codes, tax rates, scenario ID mapping, invoice type mapping, error translation, 72-hour window. All other modules import from here.

### Phase C — FBR Adapter Completion
- **`backend/src/services/fbrService.js`** — Refactored to use SSOT config. Added:
  - INV-1/INV-2: Early return if invoice already ACCEPTED (prevents double IRN)
  - `upsert` on FBRSubmission (@@unique constraint enforces idempotency)
  - Dynamic ScenarioId resolution per invoice type + tax rate
  - FBR error code → Roman Urdu / English user message translation
  - AuditLog writes on success and failure
  - INV-4: Token only accessed via `FBR.token` getter — never logged
- **`backend/src/jobs/fbrRetryJob.js`** — Offline queue (INV-8):
  - Polls every 5 minutes for ERROR submissions with retryCount < 5
  - Re-attempts FBR submission via existing fbrService
  - Respects 72-hour window (abandons if expired)
  - Marks submissions ABANDONED if invoice deleted or window expired

### Phase D — Invariants Enforced
- **INV-1**: fbrService returns early if fbrStatus=ACCEPTED
- **INV-2**: FBRSubmission uses upsert; @@unique([invoiceId]) in schema
- **INV-3**: Atomic counter on Company.lastInvoiceNumber (pre-existing)
- **INV-4**: FBR token accessed via getter; not logged anywhere
- **INV-5**: All FBR field values from SSOT config (constants) or DB — no raw guesses; [VERIFY] items listed
- **INV-6**: validateInvoiceForFBR checks 7-digit NTN, 13-digit CNIC, buyer name
- **INV-7**: `cancelInvoice` controller enforces 72-hour window; rejects cancellation after expiry
- **INV-8**: fbrRetryJob retries failed submissions; marks ABANDONED only when 72h expired or max retries hit
- **INV-9**: `fbr.js` throws at module load if FBR_MODE=production but FBR_PRODUCTION_URL not set
- **INV-10**: `createInvoice` rejects a DEBIT_NOTE/CREDIT_NOTE whose local original invoice is more than 180 days old (`FBR.creditDebitNoteWindowDays`)
- **`backend/src/controllers/invoiceController.js`** — Added `cancelInvoice`:
  - Draft invoices: cancel immediately
  - ACCEPTED invoices: check `submittedAt` age vs 72h window
  - AuditLog write on cancel
- **`backend/src/server.js`** — Wired `DELETE /api/invoices/:invoiceId` + retry job startup + graceful shutdown clears job timer

### Phase E — Scenario Harness
- **`backend/scripts/fbrScenarioHarness.js`** — Runnable one-command test:
  ```
  cd backend && npm run fbr:scenarios
  ```
  Covers 7 scenarios: SN001 (18% standard), SN002 (10% reduced), SN003 (5% reduced), SN004 (zero-rated), SN005 (export), SN006 (multi-line mixed), SN007 (credit note). Runs validate → post for each. Outputs pass/fail matrix with IRNs.

### Phase F — UI Completion
- **`frontend/src/pages/SettingsPage.jsx`** — Now loads real company data from `/auth/me` on mount and saves to `PUT /api/companies/:companyId`. Shows NTN/STRN validation feedback. FBR mode displayed from company record. Token security note.
- **`backend/src/middleware/validationMiddleware.js`** — Added `updateCompany` Joi schema
- **`backend/src/server.js`** — Added `PUT /api/companies/:companyId` endpoint (verifyToken + requireCompanyAccess + validation)

---

## How to Configure

### Environment Variables (backend/.env)

```env
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=<at-least-32-random-chars>
JWT_REFRESH_SECRET=<different-32-random-chars>

# FBR — sandbox first, then production after all scenarios pass
FBR_MODE=sandbox
FBR_SANDBOX_URL=https://gw.fbr.gov.pk/di_data/v1
FBR_PRODUCTION_URL=https://gw.fbr.gov.pk/di_data/v1   # same base, different token
FBR_SECURITY_TOKEN=<from IRIS sandbox portal>

# Optional
CORS_ORIGIN=https://your-frontend.vercel.app
SENDGRID_API_KEY=<SendGrid key for real email>
```

### Static IP
FBR/PRAL requires your backend server's IP to be whitelisted. Register the Vercel deployment IP (or use a proxy with fixed IP) in the IRIS portal.

### Run Scenario Harness
```bash
cd backend
npm run fbr:scenarios
```
All 7 scenarios must PASS before requesting a production token from FBR/PRAL.

### Switch to Production
1. All sandbox scenarios pass
2. PRAL issues production token
3. Set `FBR_MODE=production` and `FBR_SECURITY_TOKEN=<production-token>` in Vercel env vars
4. Static IP whitelisted by PRAL
5. Redeploy

---

## [VERIFY] List — Confirm with FBR/Tax Consultant Before Go-Live

| # | Item | File | Action Required |
|---|------|------|-----------------|
| 1 | SRO 1413(I)/2025 | pdfService.js, config/fbr.js | Confirm this is current SRO for standard 18% chemical goods |
| 2 | SRO 709(I)/2025 | pdfService.js | Confirm for zero-rated/reduced-rate chemicals |
| 3 | ScenarioId values | config/fbr.js:scenarioIdMap | FBR assigns scenarios per business type in IRIS portal — confirm SN001–SN007 match your assigned set |
| 4 | 10% tax rate | config/fbr.js, validationMiddleware.js | Confirm 10% is a valid rate for your chemical products under current SRO |
| 5 | 5% tax rate | config/fbr.js, validationMiddleware.js | Confirm 5% is applicable |
| 6 | HS Codes | fbrScenarioHarness.js | Test payloads use example HS codes — replace with your actual product HS codes from FBR reference API |
| 7 | UOM codes | config/fbr.js:uomCodes | Confirm FBR accepts all 6 (KGM/LTR/TNE/DRM/BAG/NUM) for your products |
| 8 | CNIC format | validationMiddleware.js, fbrService.js | Confirm FBR accepts 13-digit numeric string (no dashes) for buyer CNIC |
| 9 | FBR validate endpoint | config/fbr.js | Confirm `validateinvoicedata_sb` is the correct sandbox validate path in the latest PRAL DI API PDF |
| 10 | Default NTN/STRN | authController.js | Remove placeholder defaults (0000000 / 0000000000000) — require real values at registration in production |

---

## Pending (Out of Scope / Needs External Action)

- **Test suite** — No automated tests exist. Recommend adding supertest integration tests against a test DB.
- **Token blacklist** — Logout doesn't invalidate JWTs server-side. Add Redis token blocklist for high-security environments.
- **Audit trail UI** — AuditLog table is now written to (FBR submit/cancel events) but no frontend to view it.
- **Payment tracking** — Invoice schema has no payment_amount/payment_date fields. Add if payment reconciliation is needed.
- **Batch invoice upload** — No CSV/XLSX import.
- **Real static IP** — FBR whitelisting requires a fixed outbound IP. Vercel serverless IPs rotate; use a proxy or dedicated server for FBR calls in production.
