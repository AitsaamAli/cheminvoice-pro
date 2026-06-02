import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../App';

export default function PDFPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const res = await API.get(`/invoices/${id}`);
      setInvoice(res.data);
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToFBR = async () => {
    setSubmitting(true);
    try {
      const res = await API.post(`/invoices/${id}/submit-fbr`, {});
      alert(`Invoice submitted successfully!\nFBR Invoice No: ${res.data.fbrInvoiceNumber}`);
      loadInvoice();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await API.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      setError('Failed to download PDF');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-600">Invoice not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
              <p className="text-gray-600 mt-1">FBR Status: <span className="font-semibold">{invoice.fbrStatus}</span></p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleDownloadPDF}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Download PDF
              </button>
              {invoice.status === 'SAVED' && (
                <button
                  onClick={handleSubmitToFBR}
                  disabled={submitting}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit to FBR'}
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Back
              </button>
            </div>
          </div>

          {error && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
          {invoice.fbrInvoiceNumber && (
            <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              ✓ FBR Invoice No: {invoice.fbrInvoiceNumber}
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow p-8">
          {/* Header */}
          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">ChemInvoice Pro - FBR Compliant Invoice</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Invoice No</p>
                <p className="font-semibold text-lg">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">Invoice Date</p>
                <p className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}</p>
              </div>
              <div>
                <p className="text-gray-600">Invoice Type</p>
                <p className="font-semibold">{invoice.invoiceType.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>

          {/* Seller & Buyer */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gray-800 mb-3">Seller Information</h3>
              <p className="text-sm"><strong>Business Name:</strong> {invoice.sellerBusinessName}</p>
              <p className="text-sm"><strong>NTN:</strong> {invoice.sellerNtn}</p>
              <p className="text-sm"><strong>STRN:</strong> {invoice.sellerStrn}</p>
              <p className="text-sm"><strong>Address:</strong> {invoice.sellerAddress}, {invoice.sellerProvince}</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-3">Buyer Information</h3>
              <p className="text-sm"><strong>Business Name:</strong> {invoice.buyerBusinessName}</p>
              <p className="text-sm"><strong>Registration Type:</strong> {invoice.buyerRegistrationType}</p>
              {invoice.buyerNtn && <p className="text-sm"><strong>NTN:</strong> {invoice.buyerNtn}</p>}
              {invoice.buyerStrn && <p className="text-sm"><strong>STRN:</strong> {invoice.buyerStrn}</p>}
              <p className="text-sm"><strong>Address:</strong> {invoice.buyerAddress}, {invoice.buyerProvince}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-right">Qty</th>
                  <th className="border p-2 text-right">Unit Price</th>
                  <th className="border p-2 text-right">Taxable Value</th>
                  <th className="border p-2 text-right">Tax %</th>
                  <th className="border p-2 text-right">Tax Amount</th>
                  <th className="border p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="border">
                    <td className="border p-2">{item.productDescription}</td>
                    <td className="border p-2 text-right">{parseFloat(item.quantity).toFixed(3)}</td>
                    <td className="border p-2 text-right">PKR {parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="border p-2 text-right">PKR {parseFloat(item.taxableValue).toFixed(2)}</td>
                    <td className="border p-2 text-right">{parseFloat(item.taxRate).toFixed(0)}%</td>
                    <td className="border p-2 text-right">PKR {parseFloat(item.taxAmount).toFixed(2)}</td>
                    <td className="border p-2 text-right font-semibold">PKR {parseFloat(item.totalAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-gray-600 text-sm">Total Taxable Value</p>
                <p className="text-2xl font-bold">PKR {parseFloat(invoice.totalTaxableValue).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Sales Tax</p>
                <p className="text-2xl font-bold">PKR {parseFloat(invoice.totalSalesTax).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Grand Total</p>
                <p className="text-2xl font-bold text-blue-600">PKR {parseFloat(invoice.totalInvoiceAmount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* FBR QR Code */}
          {invoice.fbrQrCode && (
            <div className="text-center p-6 border-t">
              <p className="text-gray-600 mb-4 font-semibold">FBR QR Code</p>
              <img src={invoice.fbrQrCode} alt="FBR QR Code" className="w-32 h-32 mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
