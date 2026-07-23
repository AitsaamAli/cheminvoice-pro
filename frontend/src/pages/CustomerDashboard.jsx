import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('customerToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function CustomerDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ outstanding: 0, paid: 0, total: 0, invoiceCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        navigate('/customer-portal');
        return;
      }

      const [invoicesRes, statsRes] = await Promise.all([
        API.get('/customer-portal/invoices'),
        API.get('/customer-portal/outstanding-balance')
      ]);

      setInvoices(invoicesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('customerToken');
        navigate('/customer-portal');
      } else {
        setError(err.response?.data?.error || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerEmail');
    navigate('/customer-portal');
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      // This would need to be implemented in the backend
      alert(`Download feature for ${invoiceNumber} coming soon!`);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">ChemInvoice Pro</h1>
            <p className="text-gray-600">Customer Portal</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Total Invoices</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.invoiceCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Total Amount</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              PKR {stats.total.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Paid</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              PKR {stats.paid.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Outstanding</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              PKR {stats.outstanding.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Your Invoices</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No invoices found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-800">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {invoice.items?.length || 0} item{invoice.items?.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        PKR {invoice.totalInvoiceAmount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'DRAFT'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                        >
                          📄 View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>ChemInvoice Pro - FBR Compliant Digital Invoicing System</p>
          <p>SRO 1413(I)/2025 | SRO 709(I)/2025</p>
        </div>
      </main>
    </div>
  );
}
