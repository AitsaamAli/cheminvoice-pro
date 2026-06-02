# ChemInvoice Pro - Quick Start Reference

## 1️⃣ Start Database

```bash
# Option A: Docker (Recommended)
docker-compose up -d

# Option B: Local PostgreSQL
psql -U postgres
CREATE DATABASE cheminvoice_pro;
```

## 2️⃣ Start Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Backend runs on: **http://localhost:5000**

## 3️⃣ Start Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs on: **http://localhost:5173**

## 4️⃣ Register & Test

1. Go to http://localhost:5173
2. Click "Register"
3. Fill in details:
   - Email: test@example.com
   - Password: TestPass123
   - Business Name: Acme Chemicals
   - NTN: 1234567 (7 digits)
   - STRN: 1234567890123 (13 digits)
4. Click Register → Auto login → Dashboard

## 5️⃣ Create Sample Data

Open Prisma Studio:
```bash
cd backend
npx prisma studio
```

### Add Customer:
- businessName: ABC Trading
- ntn: 7654321
- registrationType: REGISTERED
- address: 123 Main St
- province: Punjab
- city: Lahore

### Add Product:
- productName: Sulfuric Acid
- productCode: SA-001
- hsCode: 28070000 (for H2SO4)
- unitOfMeasure: LTR
- defaultSalePrice: 5000
- defaultTaxRate: 18

## 6️⃣ Create Invoice

1. Dashboard → "New Invoice"
2. Select Customer: ABC Trading
3. Add Item:
   - Product: Sulfuric Acid
   - Quantity: 100 LTR
   - Unit Price: 5000 (auto-filled)
   - Tax: 18% (auto-filled)
4. System calculates:
   - Taxable Value: 500,000
   - Tax Amount: 90,000
   - Total: 590,000
5. Click "Create & Save Invoice"

## 7️⃣ Submit to FBR

1. Click invoice in list
2. Click "Submit to FBR"
3. System:
   - Validates NTN/STRN/HS Code ✓
   - Builds FBR payload ✓
   - Submits to IRIS Portal ✓
   - Generates QR code ✓
   - Shows FBR Invoice Number ✓
4. Status changes: DRAFT → ACCEPTED

## 8️⃣ Download PDF

1. Open invoice
2. Click "Download PDF"
3. Professional A4 PDF with:
   - Company logo
   - FBR QR code
   - All invoice details
   - Tax calculation
   - Pakistani Rupee formatting

---

## 📌 Key Files

| What | Where |
|------|-------|
| Database schema | `backend/src/prisma/schema.prisma` |
| FBR submission | `backend/src/services/fbrService.js` |
| Invoice creation | `backend/src/controllers/invoiceController.js` |
| Invoice form | `frontend/src/components/InvoiceForm.jsx` |
| Settings | `backend/.env` |

---

## 🔑 Important Secrets

**In `backend/.env`:**
```env
DATABASE_URL=postgresql://cheminvoice:password@localhost:5432/cheminvoice_pro
JWT_SECRET=change-this-to-random-string
FBR_SECURITY_TOKEN=your-fbr-token-here
```

**Generate strong JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 For Production

1. Get FBR token from licensed integrator
2. Change `FBR_MODE=production` in `.env`
3. Use HTTPS
4. Deploy to cloud (AWS, Railway, Render)
5. Use managed PostgreSQL

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to DB | Check `docker-compose ps` or PostgreSQL status |
| Port 5000 in use | `lsof -i :5000 \| kill -9` |
| API not responding | Check backend terminal for errors |
| Invoices not saving | Check database connection in `.env` |
| Can't submit to FBR | Check `FBR_SECURITY_TOKEN` in `.env` |

---

## 📖 More Info

- **Full Setup:** See `SETUP.md`
- **Architecture:** See `README.md`
- **Implementation:** See `IMPLEMENTATION_SUMMARY.md`

---

**That's it! You're ready to create FBR-compliant invoices.**
