const PDFDocument = require('pdfkit');

class PDFService {
  async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('ChemInvoice Pro', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('FBR Compliant Digital Invoicing System', { align: 'center' });
      doc.moveDown(0.5);

      // Company Info
      doc.fontSize(14).font('Helvetica-Bold').text(invoice.sellerBusinessName);
      doc.fontSize(9).font('Helvetica')
        .text(`NTN: ${invoice.sellerNtn} | STRN: ${invoice.sellerStrn}`)
        .text(invoice.sellerAddress)
        .text(invoice.sellerProvince);

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Invoice + Buyer details side by side
      const startY = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text('INVOICE', 40, startY);
      doc.fontSize(9).font('Helvetica')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 40)
        .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}`, 40)
        .text(`Type: ${invoice.invoiceType.replace(/_/g, ' ')}`, 40);

      doc.fontSize(10).font('Helvetica-Bold').text('BILL TO:', 300, startY);
      doc.fontSize(9).font('Helvetica')
        .text(invoice.buyerBusinessName, 300)
        .text(invoice.buyerAddress, 300)
        .text(invoice.buyerProvince, 300);
      if (invoice.buyerNtn) doc.text(`NTN: ${invoice.buyerNtn}`, 300);

      doc.moveDown(2);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Table header
      doc.fontSize(8).font('Helvetica-Bold');
      const tableY = doc.y;
      doc.text('#', 40, tableY, { width: 20 });
      doc.text('Description', 65, tableY, { width: 200 });
      doc.text('Qty', 270, tableY, { width: 40, align: 'right' });
      doc.text('Price', 315, tableY, { width: 55, align: 'right' });
      doc.text('Taxable', 375, tableY, { width: 55, align: 'right' });
      doc.text('Tax%', 435, tableY, { width: 35, align: 'right' });
      doc.text('Total', 475, tableY, { width: 80, align: 'right' });
      doc.moveDown(0.4);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      doc.font('Helvetica').fontSize(8);
      (invoice.items || []).forEach((item, i) => {
        const y = doc.y;
        doc.text(`${i + 1}`, 40, y, { width: 20 });
        doc.text(item.productDescription, 65, y, { width: 200 });
        doc.text(String(item.quantity), 270, y, { width: 40, align: 'right' });
        doc.text(item.unitPrice.toLocaleString('en-PK', { maximumFractionDigits: 0 }), 315, y, { width: 55, align: 'right' });
        doc.text(item.taxableValue.toLocaleString('en-PK', { maximumFractionDigits: 0 }), 375, y, { width: 55, align: 'right' });
        doc.text(`${item.taxRate}%`, 435, y, { width: 35, align: 'right' });
        doc.text(item.totalAmount.toLocaleString('en-PK', { maximumFractionDigits: 0 }), 475, y, { width: 80, align: 'right' });
        doc.moveDown(0.8);
      });

      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      doc.fontSize(9).font('Helvetica')
        .text(`Total Taxable Value: PKR ${invoice.totalTaxableValue.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`, { align: 'right' });
      doc.text(`Total Sales Tax: PKR ${invoice.totalSalesTax.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`, { align: 'right' });
      doc.fontSize(11).font('Helvetica-Bold')
        .text(`TOTAL: PKR ${invoice.totalInvoiceAmount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`, { align: 'right' });

      if (invoice.amountInWords) {
        doc.moveDown(0.5);
        doc.fontSize(8).font('Helvetica').text(`Amount in Words: ${invoice.amountInWords}`);
      }

      // FBR Section
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#444444')
        .text(`FBR Status: ${invoice.fbrStatus || 'PENDING'}   |   SRO 1413(I)/2025 | SRO 709(I)/2025`, { align: 'center' });
      if (invoice.fbrInvoiceNumber) {
        doc.text(`FBR Invoice No: ${invoice.fbrInvoiceNumber}`, { align: 'center' });
      }

      doc.moveDown(1);
      doc.fontSize(7).fillColor('#888888')
        .text('Computer-generated invoice. No signature required.', { align: 'center' })
        .text('ChemInvoice Pro — Professional Digital Invoicing', { align: 'center' });

      doc.end();
    });
  }
}

module.exports = new PDFService();
