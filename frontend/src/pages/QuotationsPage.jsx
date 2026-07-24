import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from '../components/Layout';
import { generateQuotationPDF } from '../utils/pdfGenerator';

const fmt = n => 'PKR ' + (parseFloat(n)||0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch { return ''; } };

const STATUS_COLORS = {
  DRAFT: 'badge-neutral', SENT: 'badge-info', ACCEPTED: 'badge-success',
  REJECTED: 'badge-danger', CONVERTED: 'badge-primary',
};

const IcPlus = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcClose = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const Spinner = () => <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;

const TAX_RATES = [0, 5, 10, 18];

export default function QuotationsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [converting, setConverting] = useState(null);
  const [company, setCompany] = useState(null);

  const EMPTY_FORM = {
    customerId: '',
    quotationDate: new Date().toISOString().slice(0, 10),
    validUntil: '',
    notes: '',
    items: [{ productId: '', productDescription: '', quantity: 1, unitPrice: '', taxRate: 18, discountAmount: 0 }],
  };
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [qRes, cRes, pRes] = await Promise.all([
        API.get(`/companies/${user.companyId}/quotations`),
        API.get(`/companies/${user.companyId}/customers`),
        API.get(`/companies/${user.companyId}/products`),
      ]);
      setQuotations(qRes.data.quotations || []);
      setCustomers(cRes.data.customers || []);
      setProducts(pRes.data.products || []);
      try {
        const cr = await API.get(`/companies/${user.companyId}`);
        setCompany(cr.data?.company || cr.data);
      } catch {}
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openNew = () => { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setFormError(''); };

  const addItem = () => setForm(f => ({
    ...f,
    items: [...f.items, { productId: '', productDescription: '', quantity: 1, unitPrice: '', taxRate: 18, discountAmount: 0 }]
  }));

  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const setItem = (idx, key, val) => setForm(f => {
    const items = [...f.items];
    items[idx] = { ...items[idx], [key]: val };
    if (key === 'productId') {
      const p = products.find(pr => pr.id === val);
      if (p) { items[idx].productDescription = p.productName; items[idx].unitPrice = p.defaultSalePrice; items[idx].taxRate = p.defaultTaxRate; }
    }
    return { ...f, items };
  });

  const calcItem = (it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    const disc = parseFloat(it.discountAmount) || 0;
    const taxableValue = Math.round((qty * price - disc) * 100) / 100;
    const taxAmount = Math.round(taxableValue * (parseFloat(it.taxRate)/100) * 100) / 100;
    return { taxableValue, taxAmount, totalAmount: taxableValue + taxAmount };
  };

  const totals = form.items.reduce((acc, it) => {
    const c = calcItem(it);
    return { taxable: acc.taxable + c.taxableValue, tax: acc.tax + c.taxAmount, total: acc.total + c.totalAmount };
  }, { taxable: 0, tax: 0, total: 0 });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await API.post(`/companies/${user.companyId}/quotations`, {
        customerId: form.customerId,
        quotationDate: form.quotationDate,
        validUntil: form.validUntil || null,
        notes: form.notes || null,
        items: form.items.map(it => ({
          productId: it.productId,
          quantity: parseFloat(it.quantity),
          unitPrice: parseFloat(it.unitPrice),
          discountAmount: parseFloat(it.discountAmount) || 0,
          taxRate: parseFloat(it.taxRate),
        })),
      });
      await loadAll();
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save fail');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (q, newStatus) => {
    try {
      await API.put(`/quotations/${q.id}`, { status: newStatus });
      await loadAll();
    } catch (e) { alert(e.response?.data?.error || 'Update fail'); }
  };

  const handleConvert = async (q) => {
    if (!window.confirm(`"${q.quotationNumber}" ko Invoice mein convert karein?`)) return;
    setConverting(q.id);
    try {
      const res = await API.post(`/quotations/${q.id}/convert`, {
        invoiceDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'CASH',
      });
      await loadAll();
      if (res.data.invoice) {
        if (window.confirm(`Invoice ${res.data.invoice.invoiceNumber} ban gayi! PDF dekhen?`))
          navigate(`/invoices/${res.data.invoice.id}/pdf`);
      }
    } catch (e) { alert(e.response?.data?.error || 'Convert fail'); }
    finally { setConverting(null); }
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`"${q.quotationNumber}" delete karein?`)) return;
    try { await API.delete(`/quotations/${q.id}`); await loadAll(); }
    catch (e) { alert(e.response?.data?.error || 'Delete fail'); }
  };

  const handlePDF = async (q) => {
    const fullQ = await API.get(`/quotations/${q.id}`).then(r => r.data).catch(() => q);
    await generateQuotationPDF(fullQ, company);
  };

  const whatsapp = (q) => {
    const msg = `*Quotation: ${q.quotationNumber}*\nDate: ${fmtDate(q.quotationDate)}\n${q.validUntil ? `Valid Until: ${fmtDate(q.validUntil)}\n` : ''}*Total: ${fmt(q.totalAmount)}*\n\nPlease find the attached quotation.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = filterStatus ? quotations.filter(q => q.status === filterStatus) : quotations;

  const actions = <button className="btn btn-accent btn-sm" onClick={openNew}><IcPlus /> New Quotation</button>;

  return (
    <Layout title="Quotations" actions={actions}>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {['', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s || 'All'} {s && <span className="ml-1 text-xs opacity-70">({quotations.filter(q => q.status === s).length})</span>}
          </button>
        ))}
      </div>

      <div className="card animate-fade-up">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="empty-title">{filterStatus ? `${filterStatus} quotations nahi hain` : 'Koi quotation nahi'}</div>
            <div className="empty-desc mb-4">Customer ko price quote karein, accept hone par invoice bana lein</div>
            <button className="btn btn-primary" onClick={openNew}><IcPlus /> New Quotation</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quotation No.</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th className="t-right">Amount</th>
                  <th className="t-center">Status</th>
                  <th className="t-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td>
                      <div className="font-semibold font-numeric text-primary">{q.quotationNumber}</div>
                      {q.convertedToInvoiceId && <div className="text-xs text-neutral-400 mt-0.5">→ {q.convertedToInvoiceId}</div>}
                    </td>
                    <td>
                      <div className="font-medium text-neutral-800">{q.customer?.businessName || '—'}</div>
                      {q.notes && <div className="text-xs text-neutral-400 truncate max-w-[160px]">{q.notes}</div>}
                    </td>
                    <td className="text-neutral-600">{fmtDate(q.quotationDate)}</td>
                    <td className="text-neutral-600">
                      {q.validUntil ? (
                        <span className={new Date(q.validUntil) < new Date() ? 'text-danger text-xs' : 'text-xs'}>
                          {fmtDate(q.validUntil)}
                          {new Date(q.validUntil) < new Date() && ' (Expired)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="t-right font-semibold font-numeric">{fmt(q.totalAmount)}</td>
                    <td className="t-center">
                      <select
                        className="text-xs rounded-lg px-2 py-1 border border-neutral-200 bg-white cursor-pointer"
                        value={q.status}
                        onChange={e => handleStatusChange(q, e.target.value)}
                        disabled={q.status === 'CONVERTED'}
                      >
                        {['DRAFT','SENT','ACCEPTED','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
                        {q.status === 'CONVERTED' && <option value="CONVERTED">CONVERTED</option>}
                      </select>
                    </td>
                    <td className="t-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {(q.status === 'ACCEPTED' || q.status === 'SENT') && q.status !== 'CONVERTED' && (
                          <button onClick={() => handleConvert(q)} disabled={converting === q.id}
                            className="btn btn-success btn-sm">
                            {converting === q.id ? <Spinner /> : '→ Invoice'}
                          </button>
                        )}
                        <button onClick={() => handlePDF(q)} className="btn btn-ghost btn-sm text-primary">PDF</button>
                        <button onClick={() => whatsapp(q)} className="btn btn-ghost btn-sm" style={{ color: '#25D366' }}>WA</button>
                        {q.status !== 'CONVERTED' && (
                          <button onClick={() => handleDelete(q)} className="btn btn-danger-ghost btn-sm">Del</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" style={{ maxWidth: 780, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">New Quotation</span>
              <button onClick={closeModal} className="btn btn-ghost btn-icon"><IcClose /></button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-error mb-4"><span>{formError}</span></div>}
              <form onSubmit={handleSave} className="space-y-5">
                {/* Customer + Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group md:col-span-1">
                    <label className="form-label req">Customer</label>
                    <select required className="form-select" value={form.customerId}
                      onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                      <option value="">— Select Customer —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Quotation Date</label>
                    <input type="date" required className="form-input" value={form.quotationDate}
                      onChange={e => setForm(f => ({ ...f, quotationDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valid Until</label>
                    <input type="date" className="form-input" value={form.validUntil}
                      onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">Items</label>
                    <button type="button" onClick={addItem} className="btn btn-ghost btn-sm text-primary"><IcPlus /> Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((it, idx) => {
                      const c = calcItem(it);
                      return (
                        <div key={idx} className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="md:col-span-2 form-group mb-0">
                              <label className="form-label req">Product</label>
                              <select required className="form-select" value={it.productId}
                                onChange={e => setItem(idx, 'productId', e.target.value)}>
                                <option value="">— Select —</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                              </select>
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label req">Qty</label>
                              <input type="number" required min="0.001" step="0.001" className="form-input font-numeric"
                                value={it.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label req">Unit Price</label>
                              <input type="number" required min="0" step="0.01" className="form-input font-numeric"
                                value={it.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 items-end">
                            <div className="form-group mb-0">
                              <label className="form-label">Discount</label>
                              <input type="number" min="0" step="0.01" className="form-input font-numeric"
                                value={it.discountAmount} onChange={e => setItem(idx, 'discountAmount', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">Tax Rate</label>
                              <select className="form-select" value={it.taxRate}
                                onChange={e => setItem(idx, 'taxRate', e.target.value)}>
                                {TAX_RATES.map(t => <option key={t} value={t}>{t}%</option>)}
                              </select>
                            </div>
                            <div className="form-group mb-0 md:col-span-2">
                              <label className="form-label">Total</label>
                              <div className="form-input bg-white font-numeric font-bold text-primary">{fmt(c.totalAmount)}</div>
                            </div>
                            <div className="flex items-end justify-end">
                              {form.items.length > 1 && (
                                <button type="button" onClick={() => removeItem(idx)} className="btn btn-danger-ghost btn-sm"><IcClose /></button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals summary */}
                <div className="rounded-xl p-4 flex flex-col items-end gap-1 text-sm" style={{ background: '#EBF4FA' }}>
                  <div className="text-sub">Taxable: <span className="font-numeric font-semibold text-text-1">{fmt(totals.taxable)}</span></div>
                  <div className="text-sub">GST: <span className="font-numeric font-semibold text-text-1">{fmt(totals.tax)}</span></div>
                  <div className="text-primary font-bold text-base">Total: <span className="font-numeric">{fmt(totals.total)}</span></div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" rows={2} placeholder="Terms, delivery info, remarks…"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                    {saving ? <><Spinner /> Saving…</> : 'Save Quotation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
