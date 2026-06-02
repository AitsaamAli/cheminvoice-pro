import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

export default function InvoiceForm() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [invoice, setInvoice] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceType: 'NORMAL_SALES_TAX_INVOICE',
    items: [{ productId: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 18 }],
    paymentTerms: 'Net 30',
    deliveryTerms: 'FOB',
  });

  useEffect(() => {
    loadCustomersAndProducts();
  }, []);

  const loadCustomersAndProducts = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        API.get(`/customers?companyId=${user.companyId}`),
        API.get(`/products?companyId=${user.companyId}`),
      ]);
      setCustomers(custRes.data.customers || []);
      setProducts(prodRes.data.products || []);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const calculateItemTotals = (item) => {
    const taxableValue = (item.quantity * item.unitPrice) - (item.discountAmount || 0);
    const taxAmount = taxableValue * (item.taxRate / 100);
    const totalAmount = taxableValue + taxAmount;
    return { taxableValue, taxAmount, totalAmount };
  };

  const calculateInvoiceTotals = () => {
    let totalTaxable = 0, totalTax = 0;
    invoice.items.forEach(item => {
      const { taxableValue, taxAmount } = calculateItemTotals(item);
      totalTaxable += taxableValue;
      totalTax += taxAmount;
    });
    return { totalTaxable, totalTax, totalAmount: totalTaxable + totalTax };
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...invoice.items];
    updatedItems[index][field] = field === 'quantity' || field === 'unitPrice' || field === 'discountAmount' || field === 'taxRate'
      ? parseFloat(value) || 0
      : value;
    setInvoice({ ...invoice, items: updatedItems });
  };

  const addItem = () => {
    setInvoice({
      ...invoice,
      items: [...invoice.items, { productId: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 18 }],
    });
  };

  const removeItem = (index) => {
    if (invoice.items.length > 1) {
      setInvoice({
        ...invoice,
        items: invoice.items.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await API.post(`/companies/${user.companyId}/invoices`, invoice);
      navigate(`/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateInvoiceTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Create Invoice</h1>
          <p className="text-gray-600 mb-6">ChemInvoice Pro - FBR Compliant</p>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Invoice Header */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Customer</label>
                <select
                  value={invoice.customerId}
                  onChange={(e) => setInvoice({ ...invoice, customerId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map(cust => (
                    <option key={cust.id} value={cust.id}>{cust.businessName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={invoice.invoiceDate}
                  onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Invoice Type</label>
                <select
                  value={invoice.invoiceType}
                  onChange={(e) => setInvoice({ ...invoice, invoiceType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NORMAL_SALES_TAX_INVOICE">Normal Sales Tax</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="EXPORT_INVOICE">Export Invoice</option>
                </select>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Line Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Product</th>
                      <th className="border p-2 text-right">Qty</th>
                      <th className="border p-2 text-right">Unit Price</th>
                      <th className="border p-2 text-right">Discount</th>
                      <th className="border p-2 text-right">Taxable Value</th>
                      <th className="border p-2 text-right">Tax %</th>
                      <th className="border p-2 text-right">Tax Amount</th>
                      <th className="border p-2 text-right">Total</th>
                      <th className="border p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => {
                      const totals = calculateItemTotals(item);
                      return (
                        <tr key={idx} className="border">
                          <td className="border p-2">
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const prod = products.find(p => p.id === e.target.value);
                                updateItem(idx, 'productId', e.target.value);
                                if (prod) {
                                  updateItem(idx, 'unitPrice', prod.defaultSalePrice);
                                  updateItem(idx, 'taxRate', prod.defaultTaxRate);
                                }
                              }}
                              required
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select</option>
                              {products.map(prod => (
                                <option key={prod.id} value={prod.id}>{prod.productName}</option>
                              ))}
                            </select>
                          </td>
                          <td className="border p-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.discountAmount}
                              onChange={(e) => updateItem(idx, 'discountAmount', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border p-2 text-right">PKR {totals.taxableValue.toFixed(2)}</td>
                          <td className="border p-2 text-right">
                            <input
                              type="number"
                              step="1"
                              value={item.taxRate}
                              onChange={(e) => updateItem(idx, 'taxRate', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border p-2 text-right">PKR {totals.taxAmount.toFixed(2)}</td>
                          <td className="border p-2 text-right font-semibold">PKR {totals.totalAmount.toFixed(2)}</td>
                          <td className="border p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-red-600 hover:text-red-800 font-semibold"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Add Item
              </button>
            </div>

            {/* Totals */}
            <div className="bg-gray-100 p-6 rounded-lg mb-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-gray-600 text-sm">Total Taxable Value</p>
                  <p className="text-2xl font-bold text-gray-800">PKR {totals.totalTaxable.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Sales Tax</p>
                  <p className="text-2xl font-bold text-gray-800">PKR {totals.totalTax.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Grand Total</p>
                  <p className="text-2xl font-bold text-blue-600">PKR {totals.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Payment Terms</label>
                <input
                  type="text"
                  value={invoice.paymentTerms}
                  onChange={(e) => setInvoice({ ...invoice, paymentTerms: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Delivery Terms</label>
                <input
                  type="text"
                  value={invoice.deliveryTerms}
                  onChange={(e) => setInvoice({ ...invoice, deliveryTerms: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create & Save Invoice'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
