import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ today: 0, monthly: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/invoices?take=20`);
      setInvoices(res.data.invoices);

      const today = new Date().toDateString();
      const todayInvoices = res.data.invoices.filter(i => new Date(i.invoiceDate).toDateString() === today);
      const pending = res.data.invoices.filter(i => i.fbrStatus === 'PENDING' || i.status === 'DRAFT');

      setStats({
        today: todayInvoices.reduce((sum, i) => sum + parseFloat(i.totalInvoiceAmount), 0),
        monthly: res.data.invoices.reduce((sum, i) => sum + parseFloat(i.totalInvoiceAmount), 0),
        pending: pending.length,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">ChemInvoice Pro</h1>
              <p className="text-gray-600">Welcome, {user.firstName} {user.lastName}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/invoices/create')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                + New Invoice
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="border-t pt-3 flex gap-6">
            <button onClick={() => navigate('/')} className="text-blue-600 font-semibold hover:underline">📊 Dashboard</button>
            <button onClick={() => navigate('/invoices/create')} className="text-gray-600 hover:text-gray-800 font-semibold hover:underline">📝 Invoices</button>
            <button onClick={() => navigate('/customers')} className="text-gray-600 hover:text-gray-800 font-semibold hover:underline">👥 Customers</button>
            <button onClick={() => navigate('/products')} className="text-gray-600 hover:text-gray-800 font-semibold hover:underline">📦 Products</button>
            <button onClick={() => navigate('/reports')} className="text-gray-600 hover:text-gray-800 font-semibold hover:underline">📈 Reports</button>
            <button onClick={() => navigate('/settings')} className="text-gray-600 hover:text-gray-800 font-semibold hover:underline">⚙️ Settings</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Today's Sales</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              PKR {stats.today.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Monthly Sales</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              PKR {stats.monthly.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold">Pending FBR</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pending}</p>
            <p className="text-xs text-gray-500 mt-2">Invoices awaiting submission</p>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Recent Invoices</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No invoices yet. Create your first invoice to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Invoice No</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">FBR Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-800">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 text-gray-700">{invoice.customer.businessName}</td>
                      <td className="px-6 py-4 text-gray-700">{new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        PKR {parseFloat(invoice.totalInvoiceAmount).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                          invoice.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          invoice.fbrStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          invoice.fbrStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {invoice.fbrStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}/pdf`)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-3"
                        >
                          View
                        </button>
                        {invoice.status === 'SAVED' && (
                          <button
                            onClick={() => {/* Submit to FBR */}}
                            className="text-green-600 hover:text-green-800 font-semibold text-sm"
                          >
                            Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
