const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PDFService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads/invoices';
  }

  // Generate invoice PDF
  async generateInvoicePDF(invoice, invoiceItems, company, customer) {
    try {
      // Create uploads directory if doesn't exist
      await this.ensureUploadDirectory();

      // Generate HTML content
      const htmlContent = this.generateInvoiceHTML(
        invoice,
        invoiceItems,
        company,
        customer
      );

      // Generate PDF using Puppeteer
      const pdfPath = await this.htmlToPDF(htmlContent, invoice.invoiceNumber);

      // Save PDF record to database
      await prisma.pDFGeneration.create({
        data: {
          invoiceId: invoice.id,
          pdfPath,
          fileSize: (await fs.stat(pdfPath)).size,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      return pdfPath;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // Convert HTML to PDF using Puppeteer
  async htmlToPDF(htmlContent, invoiceNumber) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const fileName = `invoice-${invoiceNumber}-${Date.now()}.pdf`;
      const filePath = path.join(this.uploadPath, fileName);

      await page.pdf({
        path: filePath,
        format: 'A4',
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm',
        },
        printBackground: true,
      });

      return filePath;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Generate HTML content for invoice
  generateInvoiceHTML(invoice, invoiceItems, company, customer) {
    const qrCodeImage = invoice.fbrQrCode || '';
    const isDraft = invoice.status === 'DRAFT';
    const amountInWords = this.convertAmountToWords(invoice.totalInvoiceAmount);

    const itemsHTML = invoiceItems
      .map((item, index) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.hsCode}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productDescription}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${parseFloat(item.quantity).toFixed(3)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.unitOfMeasure}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">PKR ${parseFloat(item.unitPrice).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">PKR ${parseFloat(item.discountAmount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">PKR ${parseFloat(item.taxableValue).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${parseFloat(item.taxRate).toFixed(0)}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">PKR ${parseFloat(item.taxAmount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">PKR ${parseFloat(item.totalAmount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 210mm; margin: 0 auto; padding: 20px; }
          header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
          .qr-code { text-align: center; }
          .qr-code img { width: 100px; height: 100px; }
          .company-info { margin-bottom: 20px; }
          .company-info h2 { color: #2c3e50; font-size: 18px; margin-bottom: 5px; }
          .company-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .section-title { font-weight: bold; color: #2c3e50; margin-bottom: 8px; font-size: 12px; }
          .section-content { font-size: 12px; line-height: 1.6; }
          .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 12px; }
          .meta-item { }
          .meta-label { font-weight: bold; color: #2c3e50; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
          th { background-color: #2c3e50; color: white; padding: 10px; text-align: left; font-weight: bold; }
          td { padding: 8px; }
          .totals { margin-left: auto; width: 300px; margin-bottom: 30px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 12px; }
          .total-row.grand-total { border-bottom: 2px solid #2c3e50; font-weight: bold; font-size: 14px; margin-top: 10px; }
          .amount-in-words { background-color: #ecf0f1; padding: 10px; margin-bottom: 20px; font-size: 12px; }
          .footer { border-top: 2px solid #2c3e50; padding-top: 15px; font-size: 11px; color: #666; text-align: center; }
          .draft-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72px;
            opacity: 0.1;
            color: #ccc;
            font-weight: bold;
            z-index: 0;
            pointer-events: none;
          }
          .fbr-notice { background-color: #27ae60; color: white; padding: 10px; text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 12px; border-radius: 4px; }
        </style>
      </head>
      <body>
        ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
        <div class="container">
          <header>
            <div class="logo">${company.businessName}</div>
            ${qrCodeImage ? `<div class="qr-code"><img src="${qrCodeImage}" alt="FBR QR Code"></div>` : ''}
          </header>

          ${!isDraft && invoice.fbrInvoiceNumber ? `<div class="fbr-notice">FBR Invoice No: ${invoice.fbrInvoiceNumber}</div>` : ''}

          <div class="company-info">
            <h2>Seller Information</h2>
            <div class="company-details">
              <div>
                <div class="section-title">Business Name</div>
                <div class="section-content">${company.businessName}</div>
                <div class="section-title" style="margin-top: 10px;">NTN</div>
                <div class="section-content">${company.ntn}</div>
                <div class="section-title" style="margin-top: 10px;">STRN</div>
                <div class="section-content">${company.strn}</div>
              </div>
              <div>
                <div class="section-title">Address</div>
                <div class="section-content">${company.address}, ${company.city}, ${company.province}</div>
                <div class="section-title" style="margin-top: 10px;">Contact</div>
                <div class="section-content">${company.contactPhone || 'N/A'}<br>${company.contactEmail || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="company-info">
            <h2>Buyer Information</h2>
            <div class="company-details">
              <div>
                <div class="section-title">Business Name</div>
                <div class="section-content">${customer.businessName}</div>
                <div class="section-title" style="margin-top: 10px;">Registration Type</div>
                <div class="section-content">${customer.registrationType}</div>
                ${customer.ntn ? `<div class="section-title" style="margin-top: 10px;">NTN</div><div class="section-content">${customer.ntn}</div>` : ''}
                ${customer.cnic ? `<div class="section-title" style="margin-top: 10px;">CNIC</div><div class="section-content">${customer.cnic}</div>` : ''}
              </div>
              <div>
                <div class="section-title">Address</div>
                <div class="section-content">${customer.address}, ${customer.city}, ${customer.province}</div>
                ${customer.contactPhone ? `<div class="section-title" style="margin-top: 10px;">Contact</div><div class="section-content">${customer.contactPhone}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="invoice-meta">
            <div class="meta-item">
              <div class="meta-label">Invoice No:</div>
              ${invoice.invoiceNumber}
            </div>
            <div class="meta-item">
              <div class="meta-label">Invoice Date:</div>
              ${invoice.invoiceDate.toLocaleDateString('en-PK')}
            </div>
            <div class="meta-item">
              <div class="meta-label">Invoice Type:</div>
              ${invoice.invoiceType.replace(/_/g, ' ')}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>HS Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>UoM</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Taxable Value</th>
                <th>Tax %</th>
                <th>Tax Amount</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Total Taxable Value:</span>
              <span>PKR ${parseFloat(invoice.totalTaxableValue).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span>Total Sales Tax (18%):</span>
              <span>PKR ${parseFloat(invoice.totalSalesTax).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>PKR ${parseFloat(invoice.totalInvoiceAmount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="amount-in-words">
            <strong>Amount in Words:</strong><br>
            ${amountInWords}
          </div>

          <div class="footer">
            This is a computer-generated invoice. No signature is required.
            ${!isDraft ? `<br>This invoice has been submitted to FBR under compliance with SRO 1413(I)/2025.` : ''}
            <br>Generated on: ${new Date().toLocaleString('en-PK')}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Convert amount to words in English and Urdu (basic version)
  convertAmountToWords(amount) {
    const num = Math.floor(amount);
    const decimal = Math.round((amount - num) * 100);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    const convertGroup = (n) => {
      if (n === 0) return '';
      else if (n < 10) return ones[n];
      else if (n < 20) return teens[n - 10];
      else if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      else return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
    };

    let words = '';
    let scaleIndex = 0;

    while (num > 0) {
      const group = num % 1000;
      if (group > 0) {
        words = convertGroup(group) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    const decimalPart = decimal > 0 ? ` and ${convertGroup(decimal)} Paisas` : '';
    return `Pakistani Rupees ${words || 'Zero'}${decimalPart} Only`;
  }

  // Ensure uploads directory exists
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // Get PDF file
  async getPDFFile(invoiceId) {
    const pdfRecord = await prisma.pDFGeneration.findFirst({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!pdfRecord) {
      throw new Error('PDF not found');
    }

    return pdfRecord.pdfPath;
  }

  // Clean up old PDFs (older than 365 days)
  async cleanupOldPDFs() {
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const oldPDFs = await prisma.pDFGeneration.findMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    for (const pdf of oldPDFs) {
      try {
        await fs.unlink(pdf.pdfPath);
        await prisma.pDFGeneration.delete({ where: { id: pdf.id } });
      } catch (error) {
        console.error(`Failed to delete PDF ${pdf.pdfPath}:`, error);
      }
    }

    return oldPDFs.length;
  }
}

module.exports = new PDFService();
