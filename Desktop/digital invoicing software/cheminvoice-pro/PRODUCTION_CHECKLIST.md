# 🚀 Production Deployment Checklist

Use this checklist to prepare ChemInvoice Pro for production/live deployment.

---

## 🔐 Security & Secrets

### Backend `.env`
- [ ] Change `JWT_SECRET` to strong random string (32+ chars)
- [ ] Change `JWT_REFRESH_SECRET` to strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Get real `FBR_SECURITY_TOKEN` from licensed integrator
- [ ] Change `FBR_MODE=production`
- [ ] Update `CORS_ORIGIN` to your production domain
- [ ] Use strong PostgreSQL password (not `cheminvoice_secure_password_123`)
- [ ] Never commit `.env` file to Git

Generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend `.env.local`
- [ ] Update `VITE_API_URL` to production backend URL
- [ ] Never commit `.env.local` to Git

### Database
- [ ] Change default database password
- [ ] Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- [ ] Enable automated backups (daily minimum)
- [ ] Enable encryption at rest
- [ ] Restrict network access (VPC/firewall)
- [ ] Enable SSL connections

---

## 🌐 Deployment

### Backend (Node.js)

#### Option 1: Railway (Recommended - Easiest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### Option 2: AWS EC2
```bash
# Create EC2 instance (Ubuntu 22.04)
# SSH into instance
# Install Node.js 18+
# Clone repo
# Configure .env
# Install dependencies
# Run: npm start
```

#### Option 3: Render.com
- [ ] Push code to GitHub
- [ ] Create new Web Service on render.com
- [ ] Connect GitHub repo
- [ ] Set environment variables
- [ ] Deploy

#### Option 4: Heroku
```bash
heroku login
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=...
git push heroku main
```

### Frontend (React)

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

#### Option 2: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build & deploy
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

#### Option 3: AWS S3 + CloudFront
```bash
# Build
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Create CloudFront distribution
```

### Database (PostgreSQL)

#### AWS RDS
- [ ] Create RDS PostgreSQL instance
- [ ] Set master username/password
- [ ] Create database: `cheminvoice_pro`
- [ ] Update `DATABASE_URL` in backend `.env`
- [ ] Enable automated backups
- [ ] Enable encryption

#### Google Cloud SQL
- [ ] Create PostgreSQL instance
- [ ] Create database: `cheminvoice_pro`
- [ ] Create user with strong password
- [ ] Update `DATABASE_URL`
- [ ] Whitelist backend IP

#### DigitalOcean
- [ ] Create managed PostgreSQL
- [ ] Create database: `cheminvoice_pro`
- [ ] Create user
- [ ] Update `DATABASE_URL`

---

## 🔗 Domain & DNS

- [ ] Register domain (e.g., cheminvoice.com)
- [ ] Point DNS to your hosting:
  - Frontend: Point to CDN (Vercel, Netlify, CloudFront)
  - Backend: Point to API server
- [ ] Enable HTTPS/SSL (auto via hosting providers)
- [ ] Update `CORS_ORIGIN` in backend `.env`
- [ ] Update `VITE_API_URL` in frontend `.env`

---

## 🔒 HTTPS & Security

- [ ] Enable HTTPS on frontend (auto with Vercel/Netlify)
- [ ] Enable HTTPS on backend (auto with hosting)
- [ ] Set security headers in backend:
```javascript
// Already configured via helmet.js
app.use(helmet());
```

- [ ] Enable CORS properly:
```javascript
cors({ origin: 'https://yourdomain.com' })
```

- [ ] Update database connection to use SSL:
```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

---

## 🗄️ Database Migration

### First time setup on production:
```bash
# SSH into production server

# Install dependencies
npm install

# Run migrations
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Backup before any changes:
```bash
# Create backup
pg_dump cheminvoice_pro > backup_$(date +%Y%m%d).sql

# Restore if needed
psql cheminvoice_pro < backup_*.sql
```

---

## 📊 Monitoring & Logging

### Application Monitoring
- [ ] Set up error tracking (Sentry):
```bash
npm install @sentry/node
```

- [ ] Configure logging (Winston):
```bash
npm install winston
```

- [ ] Monitor uptime (UptimeRobot, Pingdom)

### Database Monitoring
- [ ] Monitor connection pool
- [ ] Monitor slow queries
- [ ] Set up alerts for high CPU/disk usage
- [ ] Monitor backup completion

### Performance Monitoring
- [ ] Set up APM (Application Performance Monitoring)
- [ ] Monitor API response times
- [ ] Monitor PDF generation time
- [ ] Monitor FBR submission success rate

---

## 📧 Email & Notifications

- [ ] Set up SMTP for invoice emails (optional):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
```

- [ ] Set up alerts for failed FBR submissions
- [ ] Set up notifications for system errors

---

## 🧪 Testing

Before going live, test everything:

### Invoice Creation
- [ ] Create normal invoice ✓
- [ ] Create debit note ✓
- [ ] Create credit note ✓
- [ ] Create export invoice ✓
- [ ] Test with different tax rates ✓
- [ ] Test with discounts ✓

### FBR Submission
- [ ] Submit invoice to FBR production ✓
- [ ] Verify FBR Invoice Number received ✓
- [ ] Verify QR code generated ✓
- [ ] Test retry logic ✓
- [ ] Test offline queuing ✓

### PDF Generation
- [ ] Generate invoice PDF ✓
- [ ] Download PDF ✓
- [ ] Print PDF ✓
- [ ] Email PDF ✓

### Validation
- [ ] Invalid NTN rejected ✓
- [ ] Invalid STRN rejected ✓
- [ ] Invalid HS Code rejected ✓
- [ ] Future invoice date rejected ✓
- [ ] Missing registered STRN rejected ✓

### User Management
- [ ] User registration works ✓
- [ ] User login works ✓
- [ ] JWT refresh works ✓
- [ ] Session timeout works ✓
- [ ] Role-based access works ✓

### Data Integrity
- [ ] Audit logs created ✓
- [ ] Tax calculation accurate ✓
- [ ] No data loss on failures ✓
- [ ] Concurrent invoice creation works ✓

---

## 📱 Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📚 Documentation

- [ ] Update README.md with production URLs
- [ ] Document FBR integration process
- [ ] Document deployment steps
- [ ] Document backup/restore procedures
- [ ] Document user manual
- [ ] Document API documentation (Swagger/OpenAPI)

---

## 🔄 Backup & Disaster Recovery

### Daily Backups
- [ ] Automated PostgreSQL backups
- [ ] Backup retention: Minimum 30 days
- [ ] Test restore procedures monthly

### Backup Locations
- [ ] Store in cloud storage (AWS S3, Google Cloud Storage)
- [ ] Geographic redundancy
- [ ] Encryption of backups

### Disaster Recovery Plan
- [ ] Document recovery procedures
- [ ] RTO (Recovery Time Objective): < 4 hours
- [ ] RPO (Recovery Point Objective): < 1 hour
- [ ] Test recovery quarterly

---

## 📋 Going Live Checklist

### Week Before Launch
- [ ] All tests pass
- [ ] Performance testing done
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] User training completed

### Day Before Launch
- [ ] Final database backup
- [ ] Code frozen (no new commits)
- [ ] All team members notified
- [ ] Rollback plan prepared

### Launch Day
- [ ] Monitor logs closely
- [ ] Monitor API response times
- [ ] Monitor database performance
- [ ] Have support staff on standby
- [ ] Test all critical flows

### First Week
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Fix any critical issues
- [ ] Optimization based on real usage

---

## 📞 Support & Escalation

- [ ] Support email configured
- [ ] Support phone number available
- [ ] On-call escalation procedure
- [ ] Issue tracking system setup
- [ ] Status page for incident communication

---

## 💰 Cost Optimization

- [ ] Review hosting costs
- [ ] Rightsize database instance
- [ ] Enable auto-scaling if needed
- [ ] Set up cost alerts
- [ ] Compare pricing with alternatives

---

## 🎉 Post-Launch

After going live:

- [ ] Monitor FBR submission success rate
- [ ] Collect user feedback
- [ ] Plan feature enhancements
- [ ] Schedule security audits (quarterly)
- [ ] Plan scaling for growth

---

## ✅ Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Developer | | | |
| QA Lead | | | |
| Security | | | |
| Operations | | | |
| Manager | | | |

---

**Status**: Ready for Production ✅
