const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const prisma = new PrismaClient();

class CustomerPortalController {
  // Send 6-digit login code to customer email
  async sendLoginCode(req, res) {
    try {
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Delete any existing codes for this email
      await prisma.loginCode.deleteMany({ where: { email } });

      // Store code with 10-minute expiry
      await prisma.loginCode.create({
        data: {
          email,
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }
      });

      // Send email with code
      try {
        await emailService.sendLoginCode(email, code);
      } catch (emailError) {
        console.error('Email send failed but code saved:', emailError);
        // Continue anyway - code is saved in DB
      }

      return res.json({
        success: true,
        message: 'Login code sent to email (check spam folder too)'
      });
    } catch (error) {
      console.error('Send login code error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Verify code and return JWT token
  async verifyLoginCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: 'Email and code required' });
      }

      // Find the login code
      const loginCode = await prisma.loginCode.findFirst({
        where: { email, code },
        orderBy: { createdAt: 'desc' }
      });

      if (!loginCode) {
        return res.status(401).json({ error: 'Invalid code' });
      }

      // Check if expired
      if (loginCode.expiresAt < new Date()) {
        await prisma.loginCode.delete({ where: { id: loginCode.id } });
        return res.status(401).json({ error: 'Code expired. Request a new one.' });
      }

      // Check if customer exists
      const customer = await prisma.customer.findFirst({
        where: { contactEmail: email }
      });

      // Generate JWT token (valid for 24 hours)
      const token = jwt.sign(
        {
          email,
          customerId: customer?.id,
          type: 'customer'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Delete used code
      await prisma.loginCode.delete({ where: { id: loginCode.id } });

      return res.json({
        success: true,
        token,
        email,
        customerId: customer?.id
      });
    } catch (error) {
      console.error('Verify login code error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get all invoices for customer
  async getCustomerInvoices(req, res) {
    try {
      const customerEmail = req.customer?.email;

      if (!customerEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          customer: { contactEmail: customerEmail }
        },
        include: {
          items: true,
          customer: true
        },
        orderBy: { invoiceDate: 'desc' }
      });

      return res.json(invoices);
    } catch (error) {
      console.error('Get invoices error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get specific invoice detail
  async getInvoiceDetail(req, res) {
    try {
      const { invoiceId } = req.params;
      const customerEmail = req.customer?.email;

      if (!customerEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: true,
          customer: true
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Verify customer owns this invoice
      if (invoice.customer.contactEmail !== customerEmail) {
        return res.status(403).json({ error: 'Unauthorized to view this invoice' });
      }

      return res.json(invoice);
    } catch (error) {
      console.error('Get invoice detail error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get outstanding balance for customer
  async getOutstandingBalance(req, res) {
    try {
      const customerEmail = req.customer?.email;

      if (!customerEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          customer: { contactEmail: customerEmail }
        }
      });

      const outstanding = invoices
        .filter(inv => inv.status !== 'PAID')
        .reduce((sum, inv) => sum + inv.totalInvoiceAmount, 0);

      const paid = invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.totalInvoiceAmount, 0);

      const total = invoices.reduce((sum, inv) => sum + inv.totalInvoiceAmount, 0);

      return res.json({
        outstanding,
        paid,
        total,
        invoiceCount: invoices.length,
        paidCount: invoices.filter(inv => inv.status === 'PAID').length
      });
    } catch (error) {
      console.error('Get outstanding balance error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get payment history for customer
  async getPaymentHistory(req, res) {
    try {
      const customerEmail = req.customer?.email;

      if (!customerEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          customer: { contactEmail: customerEmail },
          status: 'PAID'
        },
        orderBy: { submittedAt: 'desc' },
        select: {
          invoiceNumber: true,
          totalInvoiceAmount: true,
          submittedAt: true,
          status: true
        }
      });

      return res.json(invoices);
    } catch (error) {
      console.error('Get payment history error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Get customer info (limited)
  async getCustomerInfo(req, res) {
    try {
      const customerEmail = req.customer?.email;

      if (!customerEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const customer = await prisma.customer.findFirst({
        where: { contactEmail: customerEmail },
        select: {
          id: true,
          businessName: true,
          contactEmail: true,
          contactPhone: true,
          address: true,
          city: true,
          province: true
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.json(customer);
    } catch (error) {
      console.error('Get customer info error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CustomerPortalController();
