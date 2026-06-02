const QRCode = require('qrcode');

class QRService {
  // Generate QR code for FBR invoice
  async generateFBRQRCode(fbrInvoiceNumber, sellerNtn, totalAmount, invoiceDate) {
    try {
      const qrData = this.formatQRData(fbrInvoiceNumber, sellerNtn, totalAmount, invoiceDate);
      const qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCode;
    } catch (error) {
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  }

  // Format QR data according to FBR specification
  formatQRData(fbrInvoiceNumber, sellerNtn, totalAmount, invoiceDate) {
    const dateStr = invoiceDate instanceof Date
      ? invoiceDate.toISOString().split('T')[0]
      : invoiceDate;

    // FBR QR format: InvoiceNumber|SellerNTN|TotalAmount|Date
    return `${fbrInvoiceNumber}|${sellerNtn}|${totalAmount}|${dateStr}`;
  }

  // Generate simple QR code (for other purposes)
  async generateSimpleQRCode(data, filename = null) {
    try {
      const qrCode = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 200,
      });

      return qrCode;
    } catch (error) {
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  }

  // Generate QR code as file
  async generateQRCodeFile(data, filepath) {
    try {
      await QRCode.toFile(filepath, data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return filepath;
    } catch (error) {
      throw new Error(`QR Code file generation failed: ${error.message}`);
    }
  }

  // Generate QR code as buffer
  async generateQRCodeBuffer(data) {
    try {
      const buffer = await QRCode.toBuffer(data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return buffer;
    } catch (error) {
      throw new Error(`QR Code buffer generation failed: ${error.message}`);
    }
  }

  // Validate QR data format
  validateQRData(data) {
    if (!data || data.trim().length === 0) {
      throw new Error('QR data cannot be empty');
    }

    if (data.length > 2953) {
      throw new Error('QR data exceeds maximum length');
    }

    return true;
  }
}

module.exports = new QRService();
