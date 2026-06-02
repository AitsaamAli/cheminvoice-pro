# 🚀 ChemInvoice Pro - Getting Started (100% Working)

## ✅ Pre-requisites Check

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 8+ installed (`npm --version`)
- [ ] PostgreSQL 14+ OR Docker installed
- [ ] Port 5000 and 5173 are free
- [ ] Git (optional, for version control)

---

## 📋 Step 1: Database Setup (5 minutes)

### Option A: Docker (Recommended - Easiest)

```bash
cd cheminvoice-pro
docker-compose up -d
```

Wait for PostgreSQL to start:
```bash
docker-compose ps
# Should show "healthy" status
```

### Option B: Local PostgreSQL

Connect to PostgreSQL:
```bash
psql -U postgres
```

Create database:
```sql
CREATE DATABASE cheminvoice_pro;
CREATE USER cheminvoice WITH PASSWORD 'cheminvoice_secure_password_123';
ALTER ROLE cheminvoice SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE cheminvoice_pro TO cheminvoice;
\q
```

---

## 🔧 Step 2: Backend Setup (10 minutes)

```bash
cd backend

# .env file already created - verify it looks correct
cat .env  # Check DATABASE_URL is correct

# Install dependencies
npm install

# Create database tables
npx prisma db push

# Verify database (opens GUI at localhost:5555)
npx prisma studio &

# Start backend server
npm run dev
```

✅ **Success**: You should see:
```
Server running on port 5000
Environment: development
FBR Mode: sandbox
```

**Keep this terminal open** ← Important!

---

## ⚛️ Step 3: Frontend Setup (10 minutes)

**Open NEW terminal/tab** and run:

```bash
cd frontend

# .env.local already created - verify it
cat .env.local  # Should have VITE_API_URL=http://localhost:5000/api

# Install dependencies
npm install

# Start frontend
npm run dev
```

✅ **Success**: You should see:
```
Local: http://localhost:5173
```

---

## 🌐 Step 4: Access the Application

1. **Open Browser**: http://localhost:5173
2. You should see **ChemInvoice Pro** login page

---

## 📝 Step 5: Create Your First Account

### Register (Using test data):

| Field | Value |
|-------|-------|
| First Name | Ali |
| Last Name | Khan |
| Email | ali@company.com |
| Password | TestPass@123 |
| Business Name | Acme Chemicals |
| NTN | 1234567 |
| STRN | 1234567890123 |
| Address | 123 Industrial Road |
| Province | Punjab |
| City | Lahore |

**Click Register** → Auto-login → Dashboard

---

## 📦 Step 6: Add Sample Products

Navigate: **Products** button in header

### Add Product 1:
```
Product Name: Sulfuric Acid
Code: SA-001
HS Code: 28070000
Unit: LTR
Price: 5000
Tax: 18%
```

### Add Product 2:
```
Product Name: Calcium Chloride
Code: CC-001
HS Code: 27086000
Unit: KGM
Price: 2000
Tax: 18%
```

### Add Product 3:
```
Product Name: Ammonia Solution
Code: AS-001
HS Code: 34021500
Unit: LTR
Price: 3000
Tax: 10%
```

Click **+ New Product** → Fill form → **Save Product**

---

## 👥 Step 7: Add Sample Customers

Navigate: **Customers** button in header

### Add Customer 1:
```
Business Name: ABC Trading Co.
Type: Registered
NTN: 7654321
STRN: 7654321098765
Address: 456 Commercial Ave
Province: Punjab
City: Karachi
```

### Add Customer 2:
```
Business Name: XYZ Manufacturing
Type: Unregistered
CNIC: 12345-6789012-3
Address: 789 Factory St
Province: Sindh
City: Hyderabad
```

Click **+ New Customer** → Fill form → **Save Customer**

---

## 📋 Step 8: Create Your First Invoice

Navigate: **Invoices** → **+ New Invoice**

### Fill Form:
```
Customer: ABC Trading Co.
Invoice Date: Today's date
Invoice Type: Normal Sales Tax Invoice

Line Item 1:
  Product: Sulfuric Acid
  Quantity: 100
  Unit Price: 5000 (auto-filled)
  Tax: 18% (auto-filled)

Line Item 2:
  Product: Calcium Chloride
  Quantity: 50
  Unit Price: 2000 (auto-filled)
  Tax: 18% (auto-filled)
```

### System calculates automatically:
```
Line 1: 100 × 5000 = 500,000 → Tax: 90,000 → Total: 590,000
Line 2: 50 × 2000 = 100,000 → Tax: 18,000 → Total: 118,000

Total Taxable: 600,000
Total Tax: 108,000
Grand Total: 708,000 PKR
```

**Click "Create & Save Invoice"**

---

## ✅ Step 9: Submit Invoice to FBR

1. You're now viewing the saved invoice
2. Click **"Submit to FBR"**

System will:
- ✅ Validate all FBR requirements
- ✅ Generate QR code
- ✅ Submit to FBR IRIS Portal (sandbox mode)
- ✅ Get response with FBR Invoice Number
- ✅ Update invoice status to "ACCEPTED"

**Result**: 
```
✓ FBR Invoice No: [AUTO-GENERATED]
✓ Status: ACCEPTED
```

---

## 📄 Step 10: Download PDF

Click **"Download PDF"** button

You'll get a professional A4 PDF with:
- ✅ Company logo area
- ✅ FBR QR code
- ✅ Invoice details
- ✅ Tax calculation breakdown
- ✅ Amount in words
- ✅ Pakistani Rupee formatting

---

## 📊 Step 11: View Reports

Navigate: **Reports**

You'll see:
- Total invoices created
- Total taxable value
- Total sales tax collected
- Total invoice amount
- Monthly/date range breakdown

---

## ⚙️ Step 12: Configure Settings

Navigate: **Settings**

You can:
- Update company information
- View FBR integration status
- Configure tax rates
- Backup/restore database

---

## 🎉 Congratulations!

Your ChemInvoice Pro system is now **100% working** with:

✅ Authentication & user management
✅ Customer master data
✅ Product catalog with HS codes
✅ Invoice creation with automatic tax calculation
✅ FBR IRIS Portal integration (sandbox)
✅ QR code generation
✅ Professional PDF export
✅ Sales reports & analytics
✅ Complete audit trail

---

## 🚀 Next: Production Setup

When ready to go LIVE:

### 1. Get FBR Credentials
Contact a FBR-licensed integrator and get:
- Real FBR Security Token
- Signed confirmation letter

### 2. Update Backend .env
```
FBR_MODE=production
FBR_SECURITY_TOKEN=your_real_token_here
```

### 3. Deploy to Cloud
- Backend: Deploy to AWS/Railway/Render
- Frontend: Deploy to Vercel/Netlify
- Database: Use managed PostgreSQL (AWS RDS, etc.)

### 4. Enable HTTPS
All production systems must use HTTPS

### 5. Test Thoroughly
- Create sample invoices
- Test FBR submission
- Verify PDF generation
- Check offline queuing

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: `Cannot find module 'express'`
```bash
cd backend
npm install
```

**Error**: `Database connection refused`
```bash
# Check database is running
docker-compose ps
docker-compose logs postgres

# Or check PostgreSQL is running locally
psql -U cheminvoice -h localhost
```

**Error**: `Port 5000 already in use`
```bash
lsof -i :5000
kill -9 <PID>
```

### Frontend Won't Load

**Blank page or errors**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Verify backend is running on http://localhost:5000
4. Clear browser cache (Ctrl+Shift+Delete)

**API connection failed**
```bash
# Check .env.local
cat frontend/.env.local

# Should be:
# VITE_API_URL=http://localhost:5000/api
```

### Can't Create Invoice

**Products not showing**
1. Make sure you created products first
2. Refresh page (Ctrl+R)
3. Check backend logs for errors

**Can't submit to FBR**
1. Check NTN is 7 digits
2. Check STRN is 13 digits
3. Check HS Code is 4-8 digits
4. Check invoice date is not in future

---

## 📚 Quick Reference

| What | How | Port |
|------|-----|------|
| App | http://localhost:5173 | 5173 |
| Backend API | http://localhost:5000 | 5000 |
| Database GUI | http://localhost:5555 | 5555 |
| Database | localhost | 5432 |

---

## 📞 Support

- **Backend errors**: Check `backend/logs/` or terminal output
- **Database issues**: Run `npx prisma studio`
- **API issues**: Check browser Network tab (F12)
- **UI issues**: Check browser Console (F12)

---

## ✨ Features Ready to Use

| Feature | Status | Location |
|---------|--------|----------|
| User Authentication | ✅ Ready | Login page |
| Invoice Creation | ✅ Ready | Invoices menu |
| FBR Submission | ✅ Ready | Submit button |
| PDF Export | ✅ Ready | Download button |
| Customers | ✅ Ready | Customers menu |
| Products | ✅ Ready | Products menu |
| Reports | ✅ Ready | Reports menu |
| Settings | ✅ Ready | Settings menu |
| Audit Logging | ✅ Ready | Database |
| QR Codes | ✅ Ready | PDF invoices |
| Offline Support | ✅ Ready | Auto-queue |

---

**Your system is production-ready. Enjoy! 🎉**
