# 🧪 LOCAL TESTING GUIDE - Detailed Testing Before Production

**Test Pehle Deploy Karein (Test First, Then Deploy)**

---

## ⚡ QUICK START - 15 MINUTE FULL TEST

### Step 1: Make Sure Both Servers Are Running
```bash
# Terminal 1 - Backend
cd backend
node src/server.js

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

✅ You should see:
- Backend: "Server running on port 5000"
- Frontend: "Local: http://localhost:5173"

---

## 🧪 COMPLETE LOCAL TESTING PLAN

### TEST 1: Health Check (1 minute)

**What it tests:** Backend is running
**How to test:**
```bash
curl http://localhost:5000/health
```

✅ **Expected Result:**
```json
{"status":"ok","timestamp":"2026-06-02T21:31:46.608Z"}
```

---

### TEST 2: Customer Portal - Send Code (3 minutes)

**What it tests:** Customer portal API + email logging

**Step 1: Open Portal**
- Go to: `http://localhost:5173/customer-portal`
- You should see login form with gradient background

**Step 2: Enter Email**
- Email: `test@example.com`
- Click "Send Login Code"

**Step 3: Check Backend Console**
- Look at backend terminal
- Should see: `[EMAIL LOG]` with the 6-digit code
- Copy the code from console

✅ **Example Console Output:**
```
[EMAIL LOG] {
  "to": "test@example.com",
  "from": "noreply@cheminvoice.pk",
  "subject": "Your Login Code - ChemInvoice Pro Customer Portal",
  "html": "...",
}
```

**What the code looks like:**
```
Your code is: 123456
```

---

### TEST 3: Customer Portal - Verify Code (2 minutes)

**What it tests:** Code verification + JWT token generation

**Step 1: You're on Code Entry Screen**
- Form should say: "Enter the 6-digit code sent to test@example.com"

**Step 2: Enter Code**
- Paste the 6-digit code from console
- Click "Verify & Login"

✅ **Expected Result:**
- Form disappears
- Redirect to dashboard
- See "ChemInvoice Pro - Customer Portal" header
- See stats cards (all showing 0 initially)

---

### TEST 4: Customer Portal - Dashboard Check (3 minutes)

**What it tests:** Customer dashboard rendering + authentication

**Step 1: You're Now on Dashboard**
- See 4 stat cards: Total Invoices, Total Amount, Paid, Outstanding
- All should show 0 (no invoices yet)

**Step 2: Check Invoice Table**
- Should say "No invoices found"
- This is correct (we haven't created any yet)

**Step 3: Test Logout**
- Click red "Logout" button in top right
- Should redirect to: `http://localhost:5173/customer-portal`
- Form should be empty

✅ **Expected Result:**
- Can logout successfully
- Back on login page
- Session cleared ✅

---

### TEST 5: Company User - Registration (5 minutes)

**What it tests:** User registration + company setup

**Step 1: Go to Main Login**
- Go to: `http://localhost:5173/login`
- Click "Create Company Account"

**Step 2: Fill Registration Form**
```
Email: admin@company.com
Password: Test@12345 (8+ characters)
First Name: Ahmed
Last Name: Khan
Business Name: ABC Chemicals
NTN: 1234567 (exactly 7 digits)
STRN: 1234567890123 (exactly 13 digits)
Address: 123 Main Street
Province: Punjab
City: Lahore
```

**Step 3: Click "Register"**

✅ **Expected Result:**
- Registration successful
- Auto-login happens
- Redirected to dashboard
- See company name at top

---

### TEST 6: Company Dashboard (3 minutes)

**What it tests:** Dashboard loads + user is authenticated

**Step 1: You're on Dashboard**
- Should see "Welcome, Ahmed Khan"
- Should see 4 stat cards (all 0 - no invoices yet)
- Should see menu on left: Dashboard, Customers, Products, Invoices, Reports, Settings

**Step 2: Check Stats**
- All stats should show 0
- This is correct (fresh account)

**Step 3: Test Navigation**
- Click "Customers" in menu
- Should go to empty customers page

✅ **Expected Result:**
- Navigation works
- Pages load correctly
- No errors in console

---

### TEST 7: Create Customer (3 minutes)

**What it tests:** Customer creation + database storage

**Step 1: Go to Customers Page**
- Already there from previous test

**Step 2: Click "Add Customer"**
- Form appears for new customer

**Step 3: Fill Customer Form**
```
Business Name: Test Client Company
Registration Type: UNREGISTERED
Contact Email: test@example.com (IMPORTANT - same as portal test!)
Contact Phone: 0300-1234567
Address: 456 Market Street
Province: Sindh
City: Karachi
```

**Step 4: Click "Add Customer"**

✅ **Expected Result:**
- Customer added successfully
- Customer appears in list
- No errors

---

### TEST 8: Create Product (3 minutes)

**What it tests:** Product creation + master data

**Step 1: Go to Products Page**
- Click "Products" in menu

**Step 2: Click "Add Product"**
- Form appears

**Step 3: Fill Product Form**
```
Product Name: Sulfuric Acid
Product Code: SA-001
HS Code: 2807 (4 digits)
Unit of Measure: KGM (kg)
Default Sale Price: 500 (PKR per unit)
Default Tax Rate: 10%
Description: Industrial Grade Sulfuric Acid
```

**Step 4: Click "Add Product"**

✅ **Expected Result:**
- Product added successfully
- Product appears in list
- No errors

---

### TEST 9: Create Invoice (5 minutes)

**What it tests:** Complete invoice flow + tax calculation

**Step 1: Go to Create Invoice**
- Click "Create Invoice" in menu

**Step 2: Select Customer**
- Choose: Test Client Company

**Step 3: Add Invoice Items**
- Click "Add Item"
- Select Product: Sulfuric Acid
- Quantity: 100
- Should auto-fill: Price=500, Tax=10%
- Click "Add to Invoice"

**Step 4: Review Calculation**
- Quantity: 100
- Unit Price: 500 = 50,000 PKR
- Tax (10%): 5,000 PKR
- **Total: 55,000 PKR**

**Step 5: Click "Create Invoice"**

✅ **Expected Result:**
- Invoice created successfully
- Get confirmation
- Invoice number: CHEM-2025-00001
- Redirected to invoice view

---

### TEST 10: Invoice PDF Generation (3 minutes)

**What it tests:** PDF generation with QR code

**Step 1: You're on Invoice Detail**
- Should see invoice number, date, items
- Should see QR code placeholder

**Step 2: Click "Generate PDF"**
- Takes 5-10 seconds
- Browser downloads PDF file

**Step 3: Check Downloaded File**
- File name: `invoice-CHEM-2025-00001.pdf`
- Open it in PDF reader
- Should see:
  - Company name
  - Invoice number
  - Items table
  - Totals
  - QR code

✅ **Expected Result:**
- PDF downloads successfully
- PDF is readable
- All info is correct

---

### TEST 11: Customer Portal - See Invoice (3 minutes)

**What it tests:** Customer can see their invoices

**Step 1: Go to Customer Portal**
- Go to: `http://localhost:5173/customer-portal`
- Email: test@example.com
- Click "Send Code"

**Step 2: Get Code from Console**
- Check backend console again
- Copy new 6-digit code

**Step 3: Enter Code**
- Paste code
- Click "Verify & Login"

**Step 4: Check Dashboard**
- You should now see:
  - Total Invoices: 1
  - Total Amount: 55,000 PKR
  - Outstanding: 55,000 PKR (red)
  - Paid: 0 PKR (green)

**Step 5: Check Invoice Table**
- Should see the invoice you created
- Status: PENDING
- Amount: 55,000 PKR

✅ **Expected Result:**
- Customer can see their invoice
- Balance is calculated correctly
- All data is accurate

---

### TEST 12: Email Verification (2 minutes)

**What it tests:** Email logging (no SendGrid needed for local testing)

**Step 1: Look at Backend Console**
- You should see `[EMAIL LOG]` entries
- Each one is an email that would be sent

**Step 2: Check What Emails Were Sent**
- 2 emails sent to `test@example.com`:
  - Email 1: Login code (first time)
  - Email 2: Login code (second time)

✅ **Expected Result:**
- Emails logged in console
- When you deploy with SendGrid, these go to email
- Format is correct

---

### TEST 13: Database Check (2 minutes)

**What it tests:** Data is stored in database

**Step 1: Run Database Query**
```bash
cd backend
npx prisma studio
```

**Step 2: Check Collections**
- User table: Should have "admin@company.com"
- Customer table: Should have "Test Client Company"
- Product table: Should have "Sulfuric Acid"
- Invoice table: Should have "CHEM-2025-00001"
- LoginCode table: Should be empty (codes are deleted after use)

✅ **Expected Result:**
- All data is stored
- Relationships are correct
- Database is working properly

---

## 🎯 ADVANCED TESTING

### TEST 14: Error Handling - Invalid Email

**What it tests:** Input validation

**Step 1: Go to Customer Portal**
- Enter: `invalid-email`
- Click "Send Code"

✅ **Expected Result:**
- Error message: "Valid email required"
- Form stays on email screen

---

### TEST 15: Error Handling - Invalid Code

**What it tests:** Code validation

**Step 1: Go through Code Entry**
- Enter wrong code: `000000`
- Click "Verify & Login"

✅ **Expected Result:**
- Error message: "Invalid code"
- Form stays on code entry

---

### TEST 16: Session Timeout

**What it tests:** Session security

**Step 1: Login to Customer Portal**
- Login successfully

**Step 2: Open Browser Console (F12)**
- Check Local Storage
- Should see: `customerToken` (JWT token)

**Step 3: Try After Token Expires**
- JWT token is valid for 24 hours
- (You can test manually if needed)

✅ **Expected Result:**
- After 24 hours, user is logged out
- Must login again

---

### TEST 17: Company Isolation Test

**What it tests:** Different companies' data doesn't mix

**Step 1: Create Second Company**
- Logout (top right)
- Click "Create Company Account"
- Register new company: `othercompany@mail.com`

**Step 2: Create Customer**
- Add a customer to this company

**Step 3: Check Data**
- First company customers ≠ Second company customers
- Data is isolated

✅ **Expected Result:**
- Each company only sees their own data
- No cross-company access

---

## 📊 TESTING CHECKLIST - Complete

Print this out and check off as you go:

### Basic Functionality
- [ ] Backend starts without errors
- [ ] Frontend loads on localhost:5173
- [ ] Health check returns OK

### Customer Portal
- [ ] Can send login code (code appears in console)
- [ ] Can verify code correctly
- [ ] Can verify code rejects invalid code
- [ ] Can see dashboard with stats
- [ ] Can see invoice list (empty initially)
- [ ] Can logout successfully

### Company User
- [ ] Can register new company
- [ ] Can login with company credentials
- [ ] Can see dashboard

### Customer Management
- [ ] Can create customer
- [ ] Customer appears in list
- [ ] Customer email is stored correctly

### Product Management
- [ ] Can create product
- [ ] Product appears in list
- [ ] HS Code validation works (4-8 digits)

### Invoice Management
- [ ] Can create invoice
- [ ] Tax calculated correctly (10% of taxable)
- [ ] Invoice number is sequential (CHEM-2025-00001)
- [ ] Customer is linked to invoice

### PDF Generation
- [ ] PDF generates successfully
- [ ] PDF has company name
- [ ] PDF has invoice items
- [ ] PDF has totals
- [ ] PDF downloads to computer

### Email (Logging)
- [ ] Login codes appear in backend console
- [ ] Email format is correct
- [ ] All emails are logged

### Database
- [ ] All data is stored in database
- [ ] Relationships are correct
- [ ] Indexes are created

### Security
- [ ] Passwords are not shown in console
- [ ] Tokens are used for authentication
- [ ] Invalid requests return errors
- [ ] Company data is isolated

### Error Handling
- [ ] Invalid email rejected
- [ ] Invalid code rejected
- [ ] Missing fields rejected
- [ ] Database errors handled gracefully

---

## 🔍 HOW TO DEBUG IF SOMETHING FAILS

### If Backend Won't Start
```bash
cd backend
node src/server.js

# Look for error message
# Usually missing dependency
# Fix: npm install
```

### If Frontend Won't Load
```bash
cd frontend
npm run dev

# Look for error message
# Check if port 5173 is already in use
```

### If Errors in Console (F12)
- Open browser Developer Tools (F12)
- Go to "Console" tab
- Look for red error messages
- Check what's failing

### If API Call Fails
- Open DevTools (F12)
- Go to "Network" tab
- Click the failed request
- See the error message from backend

### If Database Issues
```bash
cd backend
npx prisma db push  # Sync schema
npx prisma studio  # Open database viewer
```

---

## ✅ WHAT "WORKING" MEANS

**System is working if:**
- ✅ Both servers run without crashes
- ✅ Backend API responds to requests
- ✅ Frontend loads all pages
- ✅ Data is stored in database
- ✅ Emails are logged
- ✅ PDFs generate
- ✅ Customers can login
- ✅ Error messages are shown (not crashes)

**If ALL above are true → READY FOR DEPLOYMENT! 🚀**

---

## 📋 FINAL TEST REPORT

After completing all tests, fill this out:

```
Date: ___________
Tester: ___________

Tests Completed: ___ / 17

Issues Found: ___ 
- (List any)

Working Features: ___________

Ready for Deployment: [ ] YES  [ ] NO

Comments:
_________________
_________________
```

---

## 🎯 NEXT STEP AFTER TESTING

If all tests pass (17/17):
1. ✅ System is working perfectly
2. ✅ Deployment is safe
3. 📖 Follow DEPLOYMENT_CHECKLIST.md
4. 🚀 Deploy to production

**Estimated Time: 2 hours total** ⏱️

---

## 🆘 COMMON ISSUES & FIXES

### Issue: "Cannot POST /api/customer-portal/send-code"
**Fix:** Backend not running. Start backend server first.

### Issue: "Failed to connect to localhost:5000"
**Fix:** Backend crashed. Check error message in backend terminal.

### Issue: "Email not sending in portal"
**Fix:** Normal! In dev mode, code logs to console. Works in production with SendGrid.

### Issue: "Database error: Table not found"
**Fix:** Run `npx prisma db push` in backend directory.

### Issue: "Frontend won't load"
**Fix:** Port 5173 in use. Kill other node processes or change port.

---

## 🎉 YOU'RE READY TO TEST!

**Now start testing. Go through tests 1-17 one by one.**

**If all pass → Your system is production-ready! 🚀**

**اگر سب کچھ کام کرے تو deployment کے لیے تیار ہو! ✅**
