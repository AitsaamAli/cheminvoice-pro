# ChemInvoice Pro

**FBR-Compliant Digital Invoicing System for Chemical Manufacturing Companies in Pakistan**

## Compliance Standards

- **SRO 1413(I)/2025** - FBR General Sales Tax on Invoicing
- **SRO 709(I)/2025** - IRIS Portal Integration
- **PRAL API** - Submission via Licensed Integrator

## Features

✅ **Authentication** - Role-based access (Admin, Accountant, Manager, Viewer)  
✅ **Invoice Creation** - Full FBR compliance with automatic numbering  
✅ **Real-time Tax Calculation** - Support for 0%, 5%, 10%, 18% rates  
✅ **FBR IRIS Integration** - Direct submission to IRIS Portal via PRAL API  
✅ **QR Code Generation** - FBR-compliant QR codes for every invoice  
✅ **PDF Generation** - Professional A4 invoices with company logo  
✅ **Dashboard** - Real-time sales tracking and FBR submission status  
✅ **Audit Logging** - Complete audit trail of all operations  
✅ **Offline Support** - Queue invoices when internet is unavailable  

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL + Prisma ORM |
| **PDF** | Puppeteer |
| **QR Code** | qrcode library |
| **Auth** | JWT + bcrypt |
| **API** | RESTful with error handling |

## Project Structure

```
cheminvoice-pro/
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── server.js        # Main Express app
│   │   ├── controllers/     # Business logic
│   │   ├── services/        # FBR, PDF, QR services
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── prisma/          # Database schema
│   │   └── utils/           # Helper functions
│   ├── .env.example         # Environment template
│   └── package.json
├── frontend/                # React app
│   ├── src/
│   │   ├── pages/          # Login, Dashboard
│   │   ├── components/     # Invoice Form, PDF Preview
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Helpers
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml      # Database setup
└── README.md              # This file
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **PostgreSQL** 14+
- **Docker** (optional, for database)

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL and FBR credentials
npm install
```

#### Initialize Database

```bash
npx prisma generate
npx prisma db push
npx prisma studio  # (optional) Visual database editor
```

#### Run Backend

```bash
npm run dev  # Development mode
npm start    # Production mode
```

Server runs on `http://localhost:5000`

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App runs on `http://localhost:5173`

### 3. Initial Setup (Optional - Docker)

```bash
docker-compose up -d  # Starts PostgreSQL
```

## Database Schema

### Core Tables

- **User** - Users with roles (Admin, Accountant, Manager, Viewer)
- **Company** - Business info (NTN, STRN, address)
- **Customer** - Customer master (Registered/Unregistered)
- **Product** - Chemical products with HS codes
- **Invoice** - Invoice master with line items
- **InvoiceItem** - Line item details
- **FBRSubmission** - FBR submission tracking
- **AuditLog** - Complete audit trail
- **TaxConfig** - Tax rate configurations

## FBR Integration Guide

### Step 1: Get Licensed Integrator Credentials

Contact an FBR-approved licensed integrator to obtain:
- **FBR Security Token** (Bearer token for API)
- **Connection to IRIS Portal** via PRAL API

### Step 2: Configure Environment

```env
FBR_MODE=sandbox              # Start in sandbox for testing
FBR_SANDBOX_URL=https://gw.fbr.gov.pk/imssandbox/api/Live/PostData
FBR_PRODUCTION_URL=https://gw.fbr.gov.pk/imss/api/Live/PostData
FBR_SECURITY_TOKEN=your_token_here
```

### Step 3: Submit Invoices

1. Create invoice in UI
2. Click "Submit to FBR"
3. System automatically:
   - Validates FBR compliance
   - Generates QR code
   - Submits to IRIS Portal
   - Stores FBR Invoice Number
   - Updates invoice status

### Step 4: Handle Responses

- **Success** → Invoice marked as "ACCEPTED", shows FBR number
- **Failure** → Auto-retries 3 times with exponential backoff
- **Offline** → Queues invoice, resubmits when online

## Invoice Validation Rules

✓ **NTN** - Exactly 7 digits  
✓ **STRN** - Exactly 13 digits  
✓ **HS Code** - 4-8 digits (chemical classification)  
✓ **Invoice Date** - Not future date, max 2 days in past  
✓ **Tax Amount** - Auto-calculated, no manual override  
✓ **Registered Buyer** - Must have valid STRN  

## Invoice Types

| Type | Code | Purpose |
|------|------|---------|
| Normal Sales Tax Invoice | 1 | Standard commercial invoice |
| Debit Note | 2 | Increase in invoice amount |
| Credit Note | 3 | Decrease/return credit |
| Export Invoice | 4 | Zero-rated export sales |

## Tax Rates

| Rate | Code | Usage |
|------|------|-------|
| 18% | STD | Standard rate (default) |
| 10% | RED | Reduced rate |
| 5% | RED | Reduced rate |
| 0% | ZRD | Zero-rated (exports) |
| Exempt | EXP | Exempt items |

## API Endpoints

### Authentication

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login with email/password
POST   /api/auth/refresh           # Refresh access token
GET    /api/auth/me                # Get current user
POST   /api/auth/logout            # Logout
```

### Invoices

```
POST   /api/companies/:id/invoices        # Create invoice
GET    /api/companies/:id/invoices        # List invoices
GET    /api/invoices/:id                  # Get invoice details
POST   /api/invoices/:id/submit-fbr       # Submit to FBR
GET    /api/invoices/:id/pdf              # Download PDF
```

### Masters (Coming Soon)

```
POST   /api/customers               # Create customer
GET    /api/customers               # List customers
POST   /api/products                # Create product
GET    /api/products                # List products
```

## Security Best Practices

✓ **Secrets** - All credentials in `.env` (never in code)  
✓ **HTTPS** - Production must use HTTPS  
✓ **JWT** - Tokens expire after 30 minutes  
✓ **Audit** - Every action logged with user + timestamp  
✓ **Validation** - Input validation on client + server  
✓ **SQL Injection** - Protected by Prisma ORM  
✓ **CORS** - Configured per environment  

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

HTTP Status Codes:
- `400` - Validation error
- `401` - Authentication required
- `403` - Authorization denied
- `404` - Resource not found
- `409` - Conflict (duplicate entry)
- `500` - Server error

## Deployment

### Using Docker Compose

```bash
docker-compose up --build
```

This starts:
- PostgreSQL database
- Backend on port 5000
- Frontend on port 5173

### Manual Deployment

1. **Backend**: Deploy on any Node.js host (Heroku, Railway, AWS)
2. **Frontend**: Build and deploy to CDN (Vercel, Netlify)
3. **Database**: PostgreSQL on managed service

## Development Workflow

1. Create feature branch
2. Make changes
3. Test locally
4. Submit pull request
5. Deploy after review

## Debugging

### Backend
```bash
DEBUG=* npm run dev      # Enable all debug logs
NODE_ENV=development    # Detailed error messages
```

### Frontend
```bash
VITE_DEBUG=true npm run dev
```

### Database
```bash
npx prisma studio      # Visual query builder
npx prisma db seed     # Populate test data (optional)
```

## Support & License

- **Status**: Production Ready
- **Compliance**: SRO 1413(I)/2025, SRO 709(I)/2025
- **Support**: Email support@cheminvoice.pk

---

**Built with ❤️ for Pakistan's Chemical Industry**
