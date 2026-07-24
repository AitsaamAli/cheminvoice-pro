import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from './Layout';

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const IcPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IcTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

const IcAlert = () => (
  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const fmtPKR = (n) =>
  `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const calcItem = (item, isUnreg = false) => {
  const taxableValue = Math.max(0, (parseFloat(item.quantity) * parseFloat(item.unitPrice)) - parseFloat(item.discountAmount || 0));
  const taxAmount = taxableValue * (parseFloat(item.taxRate) / 100);
  const furtherTax = isUnreg ? taxableValue * 0.03 : 0;
  return { taxableValue, taxAmount, furtherTax, totalAmount: taxableValue + taxAmount + furtherTax };
};

const EMPTY_ITEM = { productId: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 18, saleType: 'Goods' };

export default function InvoiceForm() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const DRAFT_KEY = `invoice_draft_${user.companyId}`;

  const [invoice, setInvoice] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      customerId: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceType: 'NORMAL_SALES_TAX_INVOICE',
      referenceInvoiceNo: '',
      items: [{ ...EMPTY_ITEM }],
      paymentMethod: 'CASH',
      paymentTerms: '',
      deliveryTerms: '',
      remarks: '',
    };
  });

  // Auto-save draft to localStorage on every change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
  }, [invoice]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setDataLoading(true);
    try {
      // Correct API routes: /companies/:companyId/customers and /companies/:companyId/products
      const [custRes, prodRes] = await Promise.all([
        API.get(`/companies/${user.companyId}/customers`),
        API.get(`/companies/${user.companyId}/products`),
      ]);
      setCustomers(custRes.data.customers || []);
      setProducts(prodRes.data.products || []);
    } catch (err) {
      setError('Could not load customers and products. Check your connection and try again.');
    } finally {
      setDataLoading(false);
    }
  };

  const set = (k) => (e) => setInvoice(v => ({ ...v, [k]: e.target.value }));

  const updateItem = (idx, field, value) => {
    setInvoice(v => {
      const items = [...v.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...v, items };
    });
  };

  const onProductSelect = (idx, productId) => {
    const prod = products.find(p => p.id === productId);
    setInvoice(v => {
      const items = [...v.items];
      const taxRate = prod ? prod.defaultTaxRate : 18;
      const saleType = prod?.isThirdSchedule ? 'Third Schedule'
        : prod?.isService ? 'Services'
        : taxRate === 0 ? 'Zero-Rated' : 'Goods';
      items[idx] = {
        ...items[idx],
        productId,
        unitPrice: prod ? parseFloat(prod.defaultSalePrice) : 0,
        taxRate,
        saleType,
      };
      return { ...v, items };
    });
  };

  const addItem = () =>
    setInvoice(v => ({ ...v, items: [...v.items, { ...EMPTY_ITEM }] }));

  const removeItem = (idx) => {
    if (invoice.items.length > 1)
      setInvoice(v => ({ ...v, items: v.items.filter((_, i) => i !== idx) }));
  };

  const selectedCustomer = customers.find(c => c.id === invoice.customerId);
  const isUnregistered = selectedCustomer?.registrationType === 'UNREGISTERED';

  const totals = invoice.items.reduce(
    (acc, item) => {
      const { taxableValue, taxAmount, furtherTax, totalAmount } = calcItem(item, isUnregistered);
      return {
        taxable: acc.taxable + taxableValue,
        tax: acc.tax + taxAmount,
        furtherTax: acc.furtherTax + furtherTax,
        total: acc.total + totalAmount,
      };
    },
    { taxable: 0, tax: 0, furtherTax: 0, total: 0 }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice.customerId) { setError('Please select a customer'); return; }
    if (invoice.items.some(i => !i.productId)) { setError('Please select a product for all line items'); return; }

    setSubmitting(true); setError('');
    try {
      const { data } = await API.post(`/companies/${user.companyId}/invoices`, invoice);
      localStorage.removeItem(DRAFT_KEY); // clear draft on success
      navigate(`/invoices/${data.invoice.id}/pdf`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally { setSubmitting(false); }
  };

  const actions = (
    <button type="button" onClick={() => navigate('/')} className="btn btn-outline btn-sm">
      ← Back
    </button>
  );

  return (
    <Layout title="Create Invoice" actions={actions}>
      <form onSubmit={handleSubmit} className="max-w-5xl">
        {/* Error banner */}
        {error && (
          <div className="alert alert-error mb-5 animate-fade-up">
            <IcAlert /><span>{error}</span>
            <button type="button" onClick={() => setError('')} className="ml-auto text-red-700 hover:text-red-900">✕</button>
          </div>
        )}

        {/* No data warning */}
        {!dataLoading && customers.length === 0 && (
          <div className="alert alert-warning mb-5">
            <IcAlert />
            <span>No customers found. <button type="button" onClick={() => navigate('/customers')} className="underline font-semibold">Add a customer</button> first before creating an invoice.</span>
          </div>
        )}
        {!dataLoading && products.length === 0 && (
          <div className="alert alert-warning mb-5">
            <IcAlert />
            <span>No products found. <button type="button" onClick={() => navigate('/products')} className="underline font-semibold">Add products</button> first before creating an invoice.</span>
          </div>
        )}

        {/* ── Section 1: Header ─────────────────────────── */}
        <div className="card mb-5 animate-fade-up">
          <div className="card-header">
            <span className="card-title">Invoice Details</span>
            <span className="badge badge-primary">FBR Compliant</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group sm:col-span-1">
                <label className="form-label req">Customer</label>
                {dataLoading ? (
                  <div className="skeleton h-10" />
                ) : (
                  <select required className="form-select" value={invoice.customerId} onChange={set('customerId')}>
                    <option value="">— Select Customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.businessName}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label req">Invoice Date</label>
                <input type="date" required className="form-input" value={invoice.invoiceDate} onChange={set('invoiceDate')} />
              </div>
              <div className="form-group">
                <label className="form-label req">Invoice Type</label>
                <select className="form-select" value={invoice.invoiceType} onChange={set('invoiceType')}>
                  <option value="NORMAL_SALES_TAX_INVOICE">Normal Sales Tax Invoice</option>
                  <option value="DEBIT_NOTE">Debit Note (Return)</option>
                  <option value="CREDIT_NOTE">Credit Note (Return)</option>
                  <option value="EXPORT_INVOICE">Export Invoice</option>
                </select>
              </div>
            </div>

            {/* Reference invoice — required for Debit/Credit notes */}
            {(invoice.invoiceType === 'DEBIT_NOTE' || invoice.invoiceType === 'CREDIT_NOTE') && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="form-group mb-0">
                  <label className="form-label req text-amber-800">
                    Original Invoice Number
                    <span className="ml-1 font-normal text-amber-600 text-xs">(FBR ke liye zaroori — jis invoice ka return hai)</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input font-numeric"
                    placeholder="e.g. 1234567-2026-000001"
                    value={invoice.referenceInvoiceNo}
                    onChange={set('referenceInvoiceNo')}
                    maxLength={100}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 2: Line Items ──────────────────────── */}
        <div className="card mb-5 animate-fade-up anim-delay-1">
          <div className="card-header">
            <span className="card-title">Line Items</span>
            <button type="button" onClick={addItem} className="btn btn-outline btn-sm gap-1">
              <IcPlus /> Add Item
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F7F9FC', borderBottom: '1px solid #DDE3EC' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ minWidth: 200 }}>Product</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 90 }}>Qty</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 120 }}>Unit Price</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 110 }}>Discount</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 120 }}>Taxable Value</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 80 }}>Tax %</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 110 }}>Tax Amt</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider" style={{ width: 130 }}>Total</th>
                  <th className="px-3 py-3 text-center" style={{ width: 50 }} />
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const { taxableValue, taxAmount, totalAmount } = calcItem(item, isUnregistered);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #EEF2F7' }}>
                      <td className="px-4 py-2.5">
                        {dataLoading ? (
                          <div className="skeleton h-9" />
                        ) : (
                          <select
                            required
                            className="form-select text-sm"
                            value={item.productId}
                            onChange={e => onProductSelect(idx, e.target.value)}
                            style={{ minWidth: 180 }}
                          >
                            <option value="">— Select —</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.productName}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number" step="0.001" min="0.001" required
                          className="form-input text-right font-numeric"
                          style={{ minWidth: 72 }}
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number" step="0.01" min="0" required
                          className="form-input text-right font-numeric"
                          style={{ minWidth: 100 }}
                          value={item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number" step="0.01" min="0"
                          className="form-input text-right font-numeric"
                          style={{ minWidth: 90 }}
                          value={item.discountAmount}
                          onChange={e => updateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-numeric text-neutral-700 text-sm whitespace-nowrap">
                        {fmtPKR(taxableValue)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          className="form-select text-sm font-numeric"
                          style={{ minWidth: 64 }}
                          value={item.taxRate}
                          onChange={e => updateItem(idx, 'taxRate', parseInt(e.target.value))}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={10}>10%</option>
                          <option value={18}>18%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right font-numeric text-green-700 text-sm whitespace-nowrap">
                        {fmtPKR(taxAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-numeric font-semibold text-neutral-800 text-sm whitespace-nowrap">
                        {fmtPKR(totalAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={invoice.items.length === 1}
                          className="btn btn-danger-ghost btn-icon"
                          title="Remove item"
                        >
                          <IcTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-neutral-100">
            {invoice.items.map((item, idx) => {
              const { taxableValue, taxAmount, totalAmount } = calcItem(item, isUnregistered);
              return (
                <div key={idx} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 uppercase">Item {idx + 1}</span>
                    {invoice.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="btn btn-danger-ghost btn-sm gap-1">
                        <IcTrash /> Remove
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Product</label>
                    <select required className="form-select" value={item.productId} onChange={e => onProductSelect(idx, e.target.value)}>
                      <option value="">— Select —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label req">Quantity</label>
                      <input type="number" step="0.001" min="0.001" className="form-input font-numeric"
                        value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label req">Unit Price (PKR)</label>
                      <input type="number" step="0.01" min="0" className="form-input font-numeric"
                        value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Discount (PKR)</label>
                      <input type="number" step="0.01" min="0" className="form-input font-numeric"
                        value={item.discountAmount} onChange={e => updateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tax Rate</label>
                      <select className="form-select" value={item.taxRate} onChange={e => updateItem(idx, 'taxRate', parseInt(e.target.value))}>
                        <option value={0}>0%</option><option value={5}>5%</option>
                        <option value={10}>10%</option><option value={18}>18%</option>
                      </select>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 text-sm font-numeric space-y-1" style={{ background: '#F7F9FC' }}>
                    <div className="flex justify-between text-neutral-500"><span>Taxable Value</span><span>{fmtPKR(taxableValue)}</span></div>
                    <div className="flex justify-between text-green-700 font-semibold"><span>Tax Amount</span><span>{fmtPKR(taxAmount)}</span></div>
                    <div className="flex justify-between text-neutral-800 font-bold border-t border-neutral-200 pt-1 mt-1"><span>Line Total</span><span>{fmtPKR(totalAmount)}</span></div>
                  </div>
                </div>
              );
            })}
            <div className="p-4">
              <button type="button" onClick={addItem} className="btn btn-outline w-full gap-1">
                <IcPlus /> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 3: Totals + Terms ──────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Terms */}
          <div className="card animate-fade-up anim-delay-2">
            <div className="card-header"><span className="card-title">Terms & Remarks</span></div>
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={invoice.paymentMethod} onChange={set('paymentMethod')}>
                  <option value="CASH">💵 Cash</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                  <option value="CHEQUE">📝 Cheque</option>
                  <option value="ONLINE">💳 Online / Card</option>
                  <option value="CREDIT">📋 Credit (Pay Later)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <select className="form-select" value={invoice.paymentTerms} onChange={set('paymentTerms')}>
                  <option value="">— Select —</option>
                  <option value="COD">COD (Cash on Delivery)</option>
                  <option value="Advance">Advance Payment</option>
                  <option value="Net 7">Net 7 Days</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                  <option value="Net 90">Net 90 Days</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Terms</label>
                <input type="text" className="form-input" value={invoice.deliveryTerms} onChange={set('deliveryTerms')} placeholder="e.g. FOB Karachi" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <textarea className="form-input" rows={3} value={invoice.remarks} onChange={set('remarks')} placeholder="Any additional notes for this invoice..." style={{ resize: 'none' }} />
              </div>
            </div>
          </div>

          {/* Totals summary */}
          <div className="card animate-fade-up anim-delay-2">
            <div className="card-header"><span className="card-title">Invoice Summary</span></div>
            <div className="card-body">
              <div className="space-y-3">
                {isUnregistered && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Unregistered buyer — 3% further tax (SN002) auto-applied
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-sm text-neutral-600">Taxable Value</span>
                  <span className="font-numeric font-semibold text-neutral-800">{fmtPKR(totals.taxable)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-sm text-neutral-600">Sales Tax</span>
                  <span className="font-numeric font-semibold text-green-700">{fmtPKR(totals.tax)}</span>
                </div>
                {totals.furtherTax > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-amber-100">
                    <span className="text-sm text-amber-700">Further Tax (3%)</span>
                    <span className="font-numeric font-semibold text-amber-700">{fmtPKR(totals.furtherTax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-3 rounded-xl px-3 mt-2" style={{ background: '#E8F3F9' }}>
                  <span className="font-display font-bold text-primary text-base">Grand Total</span>
                  <span className="font-numeric font-bold text-primary text-xl">{fmtPKR(totals.total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Items</span><span>{invoice.items.length}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Invoice Type</span>
                  <span className="truncate ml-4 text-right">{invoice.invoiceType.replace(/_/g,' ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit buttons ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up anim-delay-3">
          <button
            type="submit"
            disabled={submitting || dataLoading || customers.length === 0}
            className="btn btn-primary btn-lg flex-1"
          >
            {submitting ? <><Spinner /> Creating Invoice…</> : '✓ Create & Save Invoice'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-outline btn-lg sm:w-40"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-neutral-400 mt-3 text-center">
          Invoice will be saved as Draft. Submit to FBR from the Dashboard.
        </p>
      </form>
    </Layout>
  );
}
