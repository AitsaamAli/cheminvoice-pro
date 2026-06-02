import { useState, useEffect } from 'react';
import { API } from '../App';

export default function ReportsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/invoices?take=1000&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      setInvoices(res.data.invoices || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return invoices.reduce(
      (acc, inv) => ({
        totalAmount: acc.totalAmount + parseFloat(inv.totalInvoiceAmount),
        totalTax: acc.totalTax + parseFloat(inv.totalSalesTax),
        totalTaxable: acc.totalTaxable + parseFloat(inv.totalTaxableValue),
        count: acc.count + 1,
      }),
      { totalAmount: 0, totalTax: 0, totalTaxable: 0, count: 0 }
    );
  };

  const downloadExcel = () => {
    alert('Excel export coming soon!');
  };

  const downloadPDF = () => {
    alert('PDF report export coming soon!');
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Sales Reports</h1>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-end gap-4">
              <div className="flex gap-4 flex-1">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
                >
                  📊 Excel
                </button>
                <button
                  onClick={downloadPDF}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  📄 PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-semibold">Total Invoices</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{totals.count}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-semibold">Taxable Value</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              PKR {totals.totalTaxable.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-semibold">Sales Tax (18%)</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              PKR {totals.totalTax.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-semibold">Total Amount</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              PKR {totals.totalAmount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Invoice Details</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No invoices in this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Invoice No</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-right font-semibold">Taxable Value</th>
                    <th className="px-4 py-3 text-right font-semibold">Tax Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">{new Date(inv.invoiceDate).toLocaleDateString('en-PK')}</td>
                      <td className="px-4 py-3">{inv.customer.businessName}</td>
                      <td className="px-4 py-3 text-right">PKR {parseFloat(inv.totalTaxableValue).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">PKR {parseFloat(inv.totalSalesTax).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right font-bold">PKR {parseFloat(inv.totalInvoiceAmount).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          inv.fbrStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          inv.fbrStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {inv.fbrStatus || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t p-6 bg-gray-50">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Total Taxable Value</p>
                <p className="text-2xl font-bold text-gray-800">PKR {totals.totalTaxable.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Sales Tax (18%)</p>
                <p className="text-2xl font-bold text-green-600">PKR {totals.totalTax.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Grand Total</p>
                <p className="text-2xl font-bold text-blue-600">PKR {totals.totalAmount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
