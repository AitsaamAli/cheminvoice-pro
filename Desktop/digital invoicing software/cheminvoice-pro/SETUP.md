# ChemInvoice Pro - Complete Setup Guide

## Prerequisites Check

Before starting, ensure you have:
- **Node.js** 18+ (`node --version`)
- **npm** 8+ (`npm --version`)
- **PostgreSQL** 14+ OR Docker installed
- **Git** for version control
- **Text editor** (VS Code recommended)

## Installation Steps

### Phase 1: Database Setup (5 minutes)

#### Option A: Using Docker (Recommended)
```bash
cd cheminvoice-pro
docker-compose up -d
# Wait for "healthy" status: docker-compose ps
```

#### Option B: Local PostgreSQL
Create database manually:
```sql
CREATE DATABASE cheminvoice_pro;
CREATE USER cheminvoice WITH PASSWORD 'secure_password';
ALTER ROLE cheminvoice SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE cheminvoice_pro TO cheminvoice;
```

### Phase 2: Backend Setup (10 minutes)

```bash
cd backend

# Copy environment config
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://cheminvoice:password@localhost:5432/cheminvoice_pro"
```

**Install dependencies:**
```bash
npm install
```

**Initialize database schema:**
```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Create tables (no migration files needed)
```

**Verify setup:**
```bash
npx prisma studio     # Opens http://localhost:5555 to view database
```

**Start backend:**
```bash
npm run dev
```

You should see:
```
Server running on port 5000
Environment: development
FBR Mode: sandbox
```

### Phase 3: Frontend Setup (10 minutes)

**In new terminal:**
```bash
cd frontend

# Copy environment config
cp .env.example .env.local

# Edit .env.local if needed (default is correct for local dev)
# VITE_API_URL=http://localhost:5000/api
```

**Install dependencies:**
```bash
npm install
```

**Start frontend:**
```bash
npm run dev
```

You should see:
```
Local: http://localhost:5173
```

### Phase 4: Access Application

1. **Open browser:** http://localhost:5173
2. **Register account:**
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: TestPass123
   - Business Name: Acme Chemicals
   - NTN: 1234567
   - STRN: 1234567890123
   - Address: 123 Industrial Road
   - Province: Punjab
   - City: Lahore

3. **Create master data:**
   - Add customers (Menu → Masters)
   - Add products with HS codes (Menu → Products)

4. **Create first invoice:**
   - Click "New Invoice"
   - Select customer & products
   - System calculates tax automatically
   - Save draft

5. **Submit to FBR:**
   - Open invoice
   - Click "Submit to FBR"
   - If sandbox: Check FBR status (returns mock response)

## FBR Configuration

### For Sandbox Testing (Default)

Your `.env` is already configured:
```env
FBR_MODE=sandbox
FBR_SANDBOX_URL=https://gw.fbr.gov.pk/imssandbox/api/Live/PostData
FBR_SECURITY_TOKEN=test_token_sandbox
```

This allows you to:
✓ Test invoice creation
✓ Test FBR submission (mock responses)
✓ Test PDF generation
✓ Test QR code generation

### For Production

Once you have licensed integrator credentials:

1. **Get credentials from FBR-approved integrator:**
   - Real FBR Security Token
   - Confirmation letter

2. **Update `.env`:**
```env
FBR_MODE=production
FBR_SECURITY_TOKEN=your_actual_token
```

3. **Test thoroughly in sandbox first!**

4. **Go live:**
   - Change FBR_MODE to "production"
   - Real invoices now submit to IRIS Portal
   - You cannot test production without real FBR account

## Database Schema Overview

### User Management
- **users** → Employees with roles
- **companies** → Business entity

### Master Data
- **customers** → Invoice recipients
- **products** → Items sold (with HS codes)
- **tax_configs** → Tax rate setup

### Invoicing
- **invoices** → Invoice master
- **invoice_items** → Line items
- **fbr_submissions** → FBR submission status
- **audit_logs** → Complete audit trail

## Common Tasks

### Create Test Data

```bash
# Open Prisma Studio
cd backend
npx prisma studio

# Add customer:
# - businessName: "ABC Chemicals"
# - ntn: "1234567"
# - registrationType: "REGISTERED"

# Add product:
# - productName: "Sulfuric Acid"
# - productCode: "SA-001"
# - hsCode: "28070000"
# - unitOfMeasure: "LTR"
# - defaultSalePrice: 5000
```

### View Database

```bash
# Prisma Studio (GUI)
cd backend && npx prisma studio

# Or PostgreSQL CLI
psql -U cheminvoice -d cheminvoice_pro
# \dt                    # List all tables
# \d invoices            # View invoices table
# SELECT * FROM users;   # Query users
```

### Reset Database

```bash
cd backend

# Drop & recreate (⚠️ LOSES DATA)
npx prisma migrate reset

# Or full reset
npx prisma db push --force-reset
```

### View Logs

**Backend Logs:**
```bash
cd backend
NODE_ENV=development npm run dev
```

**Database Logs:**
```bash
docker-compose logs -f postgres
```

## Troubleshooting

### Port Already in Use
```bash
# Backend (5000)
lsof -i :5000
kill -9 <PID>

# Frontend (5173)
lsof -i :5173
kill -9 <PID>

# Or use different ports in .env
```

### Database Connection Error
```bash
# Check PostgreSQL status
docker-compose ps

# If down, start it:
docker-compose up -d postgres

# Verify connection:
psql -U cheminvoice -h localhost -d cheminvoice_pro -c "SELECT version();"
```

### npm install Fails
```bash
# Clear cache & retry
npm cache clean --force
rm package-lock.json
npm install
```

### Prisma Errors
```bash
# Regenerate client
npx prisma generate

# Check schema validity
npx prisma validate

# Push to database
npx prisma db push
```

### Frontend Won't Connect to Backend
- Check backend is running on 5000
- Check CORS origin in .env: `CORS_ORIGIN=http://localhost:5173`
- Check .env.local has correct API URL
- Check browser console for error messages

## Performance Tips

1. **Database**: Add indexes on frequently queried fields
   ```sql
   CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);
   CREATE INDEX idx_invoices_customer ON invoices(customer_id);
   ```

2. **API**: Use pagination (take=20 default)

3. **Frontend**: Built-in caching via react-query (future enhancement)

4. **PDF**: Generated on-demand, cached for 365 days

## Security Checklist

- [ ] Change database password from default
- [ ] Set strong JWT_SECRET in .env
- [ ] Enable HTTPS in production
- [ ] Configure CORS origin correctly
- [ ] Never commit .env file
- [ ] Use environment-specific configs
- [ ] Enable audit logging
- [ ] Set secure database backups
- [ ] Update Node.js & dependencies regularly

## Next Steps

1. **Customize Company Info:**
   - Go to Settings
   - Upload company logo
   - Set tax periods

2. **Add Users:**
   - Admin creates additional users
   - Assign roles (Accountant, Manager, Viewer)
   - Each user sees only their company data

3. **Create Products:**
   - Add all chemical products
   - Set correct HS codes (critical for FBR)
   - Configure default tax rates

4. **Create Customers:**
   - Import from Excel (future feature)
   - Mark as Registered/Unregistered
   - Add correct NTN/CNIC

5. **Generate Reports:**
   - Daily sales register
   - Monthly tax summary (for ST-3 return)
   - Customer-wise analysis

## Support

- **Errors?** Check `backend/logs/` folder
- **Database issues?** Use Prisma Studio
- **API issues?** Test with curl/Postman
- **Frontend issues?** Check browser DevTools

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Docker container setup
- Cloud hosting (AWS, GCP, Azure)
- CI/CD pipeline
- Monitoring & alerting

---

**Status**: ✅ Setup Complete
**Next**: Start creating invoices!
