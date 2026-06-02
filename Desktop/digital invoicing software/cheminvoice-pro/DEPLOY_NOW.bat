@echo off
REM ============================================================
REM ChemInvoice Pro - Rapid Deployment Script
REM ============================================================

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   CHEMINVOICE PRO - AUTOMATED DEPLOYMENT SCRIPT       ║
echo ║   Follow the steps below to deploy in 60 minutes      ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo.
echo STEP 1: GitHub Repository Setup
echo ─────────────────────────────────────────────────────────
echo 1. Go to: https://github.com/new
echo 2. Create repository named: cheminvoice-pro
echo 3. Copy the HTTPS URL shown
echo 4. Run this command (replace YOUR_GITHUB_URL):
echo.
echo git remote add origin YOUR_GITHUB_URL
echo git branch -M main
echo git push -u origin main
echo.
pause

echo.
echo STEP 2: SendGrid Account Setup
echo ─────────────────────────────────────────────────────────
echo 1. Go to: https://sendgrid.com/free
echo 2. Sign up with your email
echo 3. Go to: Settings ^> API Keys
echo 4. Create new key, copy it
echo 5. Save the key somewhere safe
echo.
pause

echo.
echo STEP 3: Neon Database Setup
echo ─────────────────────────────────────────────────────────
echo 1. Go to: https://neon.tech
echo 2. Sign up with GitHub
echo 3. Create project named: cheminvoice-pro
echo 4. Copy connection string
echo 5. Run this in PowerShell:
echo.
echo $env:DATABASE_URL = "your-neon-connection-string"
echo npx prisma db push
echo.
pause

echo.
echo STEP 4: Vercel Backend Deployment
echo ─────────────────────────────────────────────────────────
echo 1. Go to: https://vercel.com
echo 2. Sign in with GitHub
echo 3. Click "Add New Project"
echo 4. Select cheminvoice-pro repository
echo 5. Root Directory: backend
echo 6. Click Deploy
echo 7. Add environment variables (see RAPID_1_HOUR_DEPLOY.md)
echo 8. Copy backend URL
echo.
pause

echo.
echo STEP 5: Vercel Frontend Deployment
echo ─────────────────────────────────────────────────────────
echo 1. Go to: https://vercel.com/dashboard
echo 2. Click "Add New Project"
echo 3. Select cheminvoice-pro repository
echo 4. Root Directory: frontend
echo 5. Click Deploy
echo 6. Add VITE_API_URL environment variable
echo 7. Copy frontend URL
echo.
pause

echo.
echo STEP 6: Verify Everything
echo ─────────────────────────────────────────────────────────
echo 1. Test backend: https://your-backend.vercel.app/health
echo 2. Test frontend: https://your-frontend.vercel.app/login
echo 3. Test portal: https://your-frontend.vercel.app/customer-portal
echo.
pause

echo.
echo ════════════════════════════════════════════════════════
echo DEPLOYMENT COMPLETE!
echo Your system is now LIVE for 10 clients!
echo ════════════════════════════════════════════════════════
echo.
pause
