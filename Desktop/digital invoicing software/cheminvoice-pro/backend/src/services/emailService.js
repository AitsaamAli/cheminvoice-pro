const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
    if (this.isConfigured) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      console.log('⚠️  SendGrid not configured. Emails will be logged to console.');
    }
  }

  async _send(msg) {
    if (this.isConfigured) {
      return await sgMail.send(msg);
    } else {
      console.log('[EMAIL LOG]', JSON.stringify(msg, null, 2));
      return { success: true, message: 'Email logged (SendGrid not configured)' };
    }
  }

  async sendInvoice(recipientEmail, invoice, pdfContent) {
    try {
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cheminvoice.pk',
        subject: `Invoice #${invoice.invoiceNumber} from ${invoice.sellerBusinessName}`,
        html: this.generateInvoiceHTML(invoice),
        attachments: pdfContent ? [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: Buffer.from(pdfContent).toString('base64'),
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ] : []
      };

      await this._send(msg);
      return { success: true, message: 'Invoice sent successfully' };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send invoice: ${error.message}`);
    }
  }

  async sendPaymentReminder(recipientEmail, invoice) {
    try {
      const daysOverdue = Math.floor((new Date() - new Date(invoice.invoiceDate)) / (1000 * 60 * 60 * 24));

      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cheminvoice.pk',
        subject: `Payment Reminder: Invoice #${invoice.invoiceNumber}`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
              <h2>Payment Reminder</h2>
              <p>Dear valued customer,</p>
              <p>This is a reminder that the following invoice is pending payment:</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Amount:</strong> PKR ${invoice.totalInvoiceAmount.toLocaleString('en-PK')}</p>
                <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
              </div>

              <p><a href="https://cheminvoice.pk/customer-portal" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Invoice</a></p>

              <p>Please arrange payment at your earliest convenience.</p>
              <p>Thank you!</p>

              <footer style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
                <p>ChemInvoice Pro - Professional Invoicing System</p>
              </footer>
            </body>
          </html>
        `
      };

      await this._send(msg);
      return { success: true, message: 'Reminder sent successfully' };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send reminder: ${error.message}`);
    }
  }

  async sendWelcomeEmail(recipientEmail, customerName) {
    try {
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cheminvoice.pk',
        subject: 'Welcome to ChemInvoice Pro',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
              <h2>Welcome to ChemInvoice Pro!</h2>
              <p>Dear ${customerName},</p>
              <p>We're excited to have you on board. You can now access your invoices anytime via our customer portal.</p>

              <p><a href="https://cheminvoice.pk/customer-portal" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Access Customer Portal</a></p>

              <h3>What you can do:</h3>
              <ul>
                <li>View all invoices</li>
                <li>Download PDF copies</li>
                <li>Track payment status</li>
                <li>See outstanding balance</li>
              </ul>

              <p>No registration needed - just use the code we send you via email!</p>

              <footer style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
                <p>ChemInvoice Pro - Professional Invoicing System</p>
              </footer>
            </body>
          </html>
        `
      };

      await this._send(msg);
      return { success: true, message: 'Welcome email sent' };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  async sendLoginCode(recipientEmail, code) {
    try {
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cheminvoice.pk',
        subject: 'Your Login Code - ChemInvoice Pro Customer Portal',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
              <h2>Your Login Code</h2>
              <p>Use this code to access your invoices:</p>

              <div style="background: #0066cc; color: white; padding: 30px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <h1 style="letter-spacing: 5px; margin: 0;">${code}</h1>
              </div>

              <p>This code expires in 10 minutes.</p>
              <p><a href="https://cheminvoice.pk/customer-portal" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Go to Portal</a></p>

              <p><em>If you didn't request this code, please ignore this email.</em></p>

              <footer style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
                <p>ChemInvoice Pro - Professional Invoicing System</p>
              </footer>
            </body>
          </html>
        `
      };

      await this._send(msg);
      return { success: true, message: 'Login code sent' };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send login code: ${error.message}`);
    }
  }

  generateInvoiceHTML(invoice) {
    const itemsHTML = invoice.items.map((item, idx) => `
      <tr>
        <td style="border-bottom: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px;">${item.productDescription}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${item.unitPrice}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${item.taxableValue}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">${item.taxRate}%</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${item.totalAmount}</td>
      </tr>
    `).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h1>${invoice.sellerBusinessName}</h1>

          <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}</p>

          <hr>

          <h3>Bill To:</h3>
          <p>${invoice.buyerBusinessName}<br>
          ${invoice.buyerAddress}<br>
          ${invoice.buyerProvince}</p>

          <hr>

          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f5f5f5;">
              <tr>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left;">#</th>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Qty</th>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Unit Price</th>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Taxable</th>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Tax %</th>
                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <hr>

          <div style="text-align: right; margin: 20px 0;">
            <p><strong>Total Taxable Value:</strong> PKR ${invoice.totalTaxableValue.toLocaleString('en-PK')}</p>
            <p><strong>Total Sales Tax:</strong> PKR ${invoice.totalSalesTax.toLocaleString('en-PK')}</p>
            <p style="font-size: 18px;"><strong>Total Amount:</strong> PKR ${invoice.totalInvoiceAmount.toLocaleString('en-PK')}</p>
          </div>

          <hr>

          <p style="text-align: center; color: #666; font-size: 12px;">
            View this invoice online: <a href="https://cheminvoice.pk/customer-portal">ChemInvoice Pro Customer Portal</a>
          </p>

          <footer style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
            <p>ChemInvoice Pro - FBR Compliant Digital Invoicing System</p>
            <p>SRO 1413(I)/2025 | SRO 709(I)/2025</p>
          </footer>
        </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
