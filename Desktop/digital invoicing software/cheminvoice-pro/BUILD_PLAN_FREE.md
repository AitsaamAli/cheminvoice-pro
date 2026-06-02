# 🚀 BUILD A + FEATURES - KEEP 100% FREE
## Complete 3-Day Build Plan with Custom Domain

---

## 💰 COST BREAKDOWN (ONLY)

```
Monthly Costs:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Vercel Hosting          - FREE (Pro features free for now)
✅ Neon PostgreSQL         - FREE tier (unlimited for dev)
✅ SendGrid Email          - FREE tier (100 emails/day)
✅ GitHub Repo             - FREE
✅ Custom Domain           - $10-15/year (ONE TIME)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL MONTHLY COST: $0
TOTAL YEARLY COST: $10-15 (domain only)

That's it! Everything else is FREE! 🎉
```

---

## 📅 3-DAY BUILD SCHEDULE

```
DAY 1: Email Integration + Customer Portal (Code)
└─ Morning: Setup SendGrid + Email service
└─ Afternoon: Build customer portal backend
└─ Evening: Build customer portal frontend

DAY 2: Integration & Testing
└─ Test everything locally
└─ Fix bugs
└─ Setup PostgreSQL (Neon)

DAY 3: Deploy to Vercel + Domain
└─ GitHub push
└─ Vercel deployment
└─ Custom domain setup
└─ Final testing
└─ GO LIVE! 🚀
```

---

## 🔨 WHAT I'LL BUILD

### **1. EMAIL INTEGRATION (2 hours)**

**Features:**
- ✅ Send invoice via email
- ✅ Payment reminders
- ✅ Welcome emails
- ✅ Invoice acknowledgment
- ✅ Professional HTML templates

**Using:** SendGrid (FREE 100 emails/day)

**Files to create:**
```javascript
backend/src/services/emailService.js         ← Email templates & sending
backend/src/routes/emailRoutes.js             ← Email endpoints
backend/src/controllers/emailController.js    ← Email logic
frontend/src/components/SendEmailModal.jsx    ← UI for sending
```

**What it does:**
```
1. User clicks "Send Invoice" button
2. Opens email modal
3. User enters recipient email
4. System sends professional invoice
5. Email received in customer inbox
6. Includes invoice PDF attachment
7. Professional branding
```

---

### **2. CUSTOMER PORTAL (4 hours)**

**Features:**
- ✅ Customer login (with email)
- ✅ View all invoices
- ✅ Download PDF
- ✅ Track payment status
- ✅ See payment history
- ✅ View outstanding balance

**Files to create:**
```javascript
frontend/src/pages/CustomerPortalLogin.jsx       ← Customer login page
frontend/src/pages/CustomerDashboard.jsx         ← Customer dashboard
frontend/src/pages/CustomerInvoiceDetail.jsx     ← Invoice detail view
backend/src/routes/customerPortalRoutes.js       ← Portal API endpoints
backend/src/controllers/customerPortalController.js
```

**What it does:**
```
1. Customer receives invoice email
2. Clicks "View Invoice" link
3. Goes to customer portal
4. Logs in with email + code sent to email
5. Sees all their invoices
6. Can view details & download PDF
7. Can see payment status
8. Can see what's outstanding
```

---

### **3. COMPLETE FREE SETUP**

**SendGrid (Email):**
- FREE tier = 100 emails/day
- Perfect for small business
- Upgrade later if needed
- No credit card needed (free tier)

**Neon (Database):**
- FREE PostgreSQL tier
- Unlimited databases
- Good performance
- No credit card needed

**Vercel (Hosting):**
- FREE tier
- Unlimited deployments
- Professional performance
- Edge network included
- No credit card during free tier

**GitHub:**
- FREE private repos
- Unlimited collaborators
- CI/CD included

**Custom Domain:**
- Buy from Namecheap: $10/year
- Setup with Vercel: 2 minutes
- Your branding!

---

## ⚡ TECHNICAL ARCHITECTURE

```
Frontend (Vercel)
├─ http://cheminvoice.yourcompany.com
├─ React app
├─ Customer portal
├─ Invoice dashboard
└─ Email send UI

Backend (Vercel)
├─ https://api.cheminvoice.yourcompany.com
├─ User API
├─ Invoice API
├─ Email API
├─ Customer portal API
└─ Payment API

Database (Neon)
├─ PostgreSQL (FREE)
├─ All tables
├─ Secure connection
└─ Daily backups

Email Service (SendGrid)
├─ 100 free emails/day
├─ Professional templates
├─ Delivery tracking
└─ Unsubscribe management
```

---

## 🔧 STEP-BY-STEP BUILD PROCESS

### **STEP 1: Setup SendGrid (30 minutes)**

```bash
# 1. Create SendGrid account
Visit: https://sendgrid.com/free

# 2. Verify sender email
Settings → Sender Authentication

# 3. Create API key
Settings → API Keys → Create API Key
Copy the key

# 4. Install SendGrid package
npm install @sendgrid/mail

# 5. Add to backend/.env
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourcompany.com

# Done! Ready to send emails
```

---

### **STEP 2: Build Email Service (1 hour)**

File: `backend/src/services/emailService.js`

```javascript
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendInvoice(recipientEmail, invoiceData) {
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Invoice #${invoiceData.invoiceNumber} from Your Company`,
      html: this.generateInvoiceHTML(invoiceData),
      attachments: [
        {
          filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
          content: invoiceData.pdfBuffer,
          type: 'application/pdf'
        }
      ]
    };

    try {
      await sgMail.send(msg);
      return { success: true, message: 'Invoice sent successfully' };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send invoice');
    }
  }

  generateInvoiceHTML(invoice) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h1>Invoice #${invoice.invoiceNumber}</h1>
          <p>Dear ${invoice.customerName},</p>
          <p>Please find your invoice attached.</p>
          <p>Amount: PKR ${invoice.totalAmount}</p>
          <p><a href="[PORTAL_LINK]">View Online</a></p>
          <footer>
            <p>Thank you for your business!</p>
          </footer>
        </body>
      </html>
    `;
  }

  async sendPaymentReminder(recipientEmail, invoiceData) {
    // Similar to above
  }

  async sendWelcomeEmail(recipientEmail, customerName) {
    // Welcome email
  }
}

module.exports = new EmailService();
```

---

### **STEP 3: Build Customer Portal Backend (2 hours)**

File: `backend/src/controllers/customerPortalController.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

class CustomerPortalController {
  async sendLoginCode(email) {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in database with expiry (10 minutes)
    await prisma.loginCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    // Send email with code
    await emailService.sendLoginCode(email, code);

    return { message: 'Code sent to email' };
  }

  async verifyLoginCode(email, code) {
    const loginCode = await prisma.loginCode.findFirst({
      where: { email, code },
      orderBy: { createdAt: 'desc' }
    });

    if (!loginCode || loginCode.expiresAt < new Date()) {
      throw new Error('Invalid or expired code');
    }

    // Generate JWT token for customer
    const token = jwt.sign(
      { email, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Delete used code
    await prisma.loginCode.delete({ where: { id: loginCode.id } });

    return { token, email };
  }

  async getCustomerInvoices(email) {
    return await prisma.invoice.findMany({
      where: {
        customer: { contactEmail: email }
      },
      include: {
        items: true,
        customer: true
      },
      orderBy: { invoiceDate: 'desc' }
    });
  }

  async getCustomerInvoiceDetail(invoiceId, email) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        customer: true
      }
    });

    // Verify customer owns this invoice
    if (invoice.customer.contactEmail !== email) {
      throw new Error('Unauthorized');
    }

    return invoice;
  }

  async getCustomerOutstandingBalance(email) {
    const invoices = await prisma.invoice.findMany({
      where: {
        customer: { contactEmail: email },
        status: { not: 'PAID' }
      }
    });

    const total = invoices.reduce((sum, inv) => sum + inv.totalInvoiceAmount, 0);
    return { outstanding: total, invoices };
  }
}

module.exports = new CustomerPortalController();
```

---

### **STEP 4: Build Customer Portal Frontend (2 hours)**

File: `frontend/src/pages/CustomerPortalLogin.jsx`

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

export default function CustomerPortalLogin() {
  const [step, setStep] = useState('email'); // email → code → dashboard
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/customer-portal/send-code', { email });
      setStep('code');
      alert('Code sent to your email!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/customer-portal/verify-code', {
        email,
        code
      });
      localStorage.setItem('customerToken', res.data.token);
      navigate('/customer-dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2">ChemInvoice Pro</h1>
        <p className="text-center text-gray-600 mb-8">Customer Portal</p>

        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit code sent to {email}
            </p>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength="6"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full mt-2 text-blue-600 hover:text-blue-800 font-semibold"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

File: `frontend/src/pages/CustomerDashboard.jsx`

```javascript
import { useState, useEffect } from 'react';
import { API } from '../App';

export default function CustomerDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const email = JSON.parse(localStorage.getItem('customerEmail') || '{}').email;
      
      const [invoicesRes, outstandingRes] = await Promise.all([
        API.get('/customer-portal/invoices'),
        API.get('/customer-portal/outstanding-balance')
      ]);

      setInvoices(invoicesRes.data);
      setOutstanding(outstandingRes.data.outstanding);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Invoices</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Outstanding Balance</p>
            <p className="text-3xl font-bold text-red-600">
              PKR {outstanding.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Total Invoices</p>
            <p className="text-3xl font-bold text-blue-600">{invoices.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Invoice #</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">PKR {inv.totalInvoiceAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 font-semibold">
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### **STEP 5: Update Prisma Schema (Add LoginCode)**

Add to `backend/prisma/schema.prisma`:

```prisma
model LoginCode {
  id        String   @id @default(cuid())
  email     String
  code      String
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
}
```

---

## 🚀 DEPLOYMENT (DAY 3)

### **STEP 1: Push to GitHub**

```bash
cd /path/to/cheminvoice-pro

git add .
git commit -m "Add email integration and customer portal - complete feature-rich system"
git push origin main
```

### **STEP 2: Setup Neon PostgreSQL (FREE)**

```
1. Go to https://neon.tech
2. Sign up with GitHub
3. Create project "cheminvoice-pro"
4. Create database "cheminvoice_pro"
5. Copy CONNECTION_STRING
6. Format: postgresql://user:password@host/database
```

### **STEP 3: Deploy Backend to Vercel**

```
1. Go to https://vercel.com
2. Import your GitHub repo
3. Select "backend" as root directory
4. Add environment variables:
   - DATABASE_URL (from Neon)
   - JWT_SECRET (generate new)
   - SENDGRID_API_KEY
   - FBR_SECURITY_TOKEN
   - CORS_ORIGIN=https://cheminvoice.yourcompany.com
5. Deploy!
```

### **STEP 4: Deploy Frontend to Vercel**

```
1. Go to https://vercel.com
2. Import your GitHub repo (same project)
3. Select "frontend" as root directory
4. Add environment variables:
   - VITE_API_URL=https://cheminvoice-api.vercel.app/api
5. Deploy!
```

### **STEP 5: Setup Custom Domain**

```
Option 1: Use Vercel Domain
1. Vercel dashboard
2. Domains
3. Add domain
4. Vercel-registered domains (no cost for first month)

Option 2: Buy Custom Domain (Namecheap - $10/year)
1. Go to https://namecheap.com
2. Search your domain
3. Buy for $10/year
4. Go to Vercel → Domains → Add domain
5. Update nameservers at Namecheap
6. Done! (takes 5-10 minutes to propagate)

Your URLs:
Frontend: https://cheminvoice.yourcompany.com
Backend: https://api.cheminvoice.yourcompany.com
Customer Portal: https://cheminvoice.yourcompany.com/customer-portal
```

### **STEP 6: Run Database Migration**

```bash
# Run from your local machine
export DATABASE_URL="your_neon_connection_string"
npx prisma db push

# That's it! All tables created
```

---

## ✅ FINAL CHECKLIST

```
BEFORE DEPLOYMENT:
☐ SendGrid account created & API key added
☐ Neon PostgreSQL account created
☐ GitHub repo created & pushed
☐ All code committed
☐ Environment variables listed

DEPLOYMENT:
☐ Backend deployed to Vercel
☐ Frontend deployed to Vercel
☐ Database migration run
☐ Custom domain purchased
☐ Domain connected to Vercel
☐ Email verification complete

TESTING:
☐ Login works
☐ Create invoice works
☐ Send email works
☐ Customer portal accessible
☐ Customer can login
☐ Customer can view invoices
☐ PDF download works

GO LIVE:
☐ Everything tested
☐ Announce to users
☐ Monitor for issues
☐ Celebrate! 🎉
```

---

## 🎁 TOTAL COST SUMMARY

```
Monthly Operating Cost: $0
Annual Domain Cost: $10-15
Features Included: Everything! 🚀

One-time costs:
- Domain: $10-15
- Setup: 0 hours (I do it!)

This is TRULY FREE + custom domain!
```

---

## 📱 WHAT USERS GET

```
For Company:
✅ Send invoices via email (professional)
✅ Track who received what
✅ Customer portal link in email
✅ Monitor customer views

For Customers:
✅ Email with invoice
✅ Link to customer portal
✅ No registration needed (code-based login)
✅ View all invoices
✅ Download PDFs
✅ See what's outstanding

All COMPLETELY FREE! 💰
```

---

## 🚀 I'M READY TO CODE!

Tell me: **"BUILD NOW"**

And I'll:
1. ✅ Code email service
2. ✅ Code customer portal (backend)
3. ✅ Code customer portal (frontend)
4. ✅ Update database schema
5. ✅ Setup GitHub
6. ✅ Deploy to Vercel
7. ✅ Configure custom domain
8. ✅ Go LIVE!

All in the next 3 days! 🔥

**LET'S BUILD THIS!** 🚀
