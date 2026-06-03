import { useState, useEffect } from 'react';
import { API } from '../App';
import Layout from '../components/Layout';

const UNITS = [
  { value: 'KGM', label: 'KGM — Kilogram' },
  { value: 'LTR', label: 'LTR — Litre' },
  { value: 'TNE', label: 'TNE — Tonne' },
  { value: 'DRM', label: 'DRM — Drum' },
  { value: 'BAG', label: 'BAG — Bag' },
  { value: 'NUM', label: 'NUM — Number' },
];

const TAX_RATES = [
  { value: 0, label: '0% — Zero-rated' },
  { value: 5, label: '5% — Reduced' },
  { value: 10, label: '10% — Reduced' },
  { value: 18, label: '18% — Standard GST' },
];

const EMPTY = {
  productName: '', productCode: '', hsCode: '', description: '',
  unitOfMeasure: 'KGM', defaultSalePrice: '', defaultTaxRate: 18,
};

const IcPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcClose = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcEdit = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const taxBadge = (rate) => {
  if (rate === 0) return <span className="badge badge-neutral">0%</span>;
  if (rate === 18) return <span className="badge badge-warning">18%</span>;
  return <span className="badge badge-info">{rate}%</span>;
};

const fmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export default function ProductsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/products`);
      setProducts(res.data.products || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openNew = () => { setForm(EMPTY); setEditId(null); setFormError(''); setModalOpen(true); };
  const openEdit = (p) => {
    setForm({
      productName: p.productName || '',
      productCode: p.productCode || '',
      hsCode: p.hsCode || '',
      description: p.description || '',
      unitOfMeasure: p.unitOfMeasure || 'KGM',
      defaultSalePrice: p.defaultSalePrice || '',
      defaultTaxRate: p.defaultTaxRate ?? 18,
    });
    setEditId(p.id); setFormError(''); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditId(null); setFormError(''); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');

    const payload = {
      productName: form.productName,
      productCode: form.productCode,
      hsCode: form.hsCode,
      description: form.description || undefined,
      unitOfMeasure: form.unitOfMeasure,
      defaultSalePrice: parseFloat(form.defaultSalePrice),
      defaultTaxRate: parseInt(form.defaultTaxRate),
    };

    try {
      if (editId) {
        await API.put(`/products/${editId}`, payload);
      } else {
        await API.post(`/companies/${user.companyId}/products`, payload);
      }
      await load();
      closeModal();
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.details?.map(x => x.message).join(', ') || d?.error || 'Failed to save product';
      setFormError(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await API.delete(`/products/${id}`); load(); }
    catch { alert('Could not delete product'); }
  };

  const filtered = products.filter(p =>
    !search ||
    p.productName.toLowerCase().includes(search.toLowerCase()) ||
    (p.productCode || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.hsCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const actions = (
    <button className="btn btn-accent btn-sm" onClick={openNew}>
      <IcPlus /><span>New Product</span>
    </button>
  );

  return (
    <Layout title="Products" actions={actions}>
      {/* Search + count */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Search products…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9" style={{ width: 240 }}
          />
        </div>
        <span className="text-sm text-neutral-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card animate-fade-up">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <div className="empty-title">{search ? 'No products found' : 'No products yet'}</div>
            <div className="empty-desc mb-4">
              {search ? 'Try a different search term' : 'Add your chemical products to start creating invoices'}
            </div>
            {!search && (
              <button className="btn btn-primary" onClick={openNew}><IcPlus /> Add Product</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Code</th>
                  <th>HS Code</th>
                  <th>Unit</th>
                  <th className="t-right">Sale Price</th>
                  <th className="t-center">Tax Rate</th>
                  <th className="t-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold text-neutral-800">{p.productName}</div>
                      {p.description && <div className="text-xs text-neutral-400 mt-0.5 truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td>
                      <span className="font-numeric text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                        {p.productCode}
                      </span>
                    </td>
                    <td>
                      <span className="font-numeric text-xs text-primary font-semibold">
                        {p.hsCode}
                      </span>
                    </td>
                    <td className="text-neutral-600">{p.unitOfMeasure}</td>
                    <td className="t-right font-semibold font-numeric text-neutral-800">
                      {fmt(p.defaultSalePrice)}
                    </td>
                    <td className="t-center">{taxBadge(p.defaultTaxRate)}</td>
                    <td className="t-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="btn btn-ghost btn-sm gap-1 text-primary">
                          <IcEdit /> Edit
                        </button>
                        <button onClick={() => handleDelete(p.id, p.productName)} className="btn btn-danger-ghost btn-sm gap-1">
                          <IcTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">{editId ? 'Edit Product' : 'New Product'}</span>
              <button onClick={closeModal} className="btn btn-ghost btn-icon"><IcClose /></button>
            </div>
            <div className="modal-body">
              {formError && (
                <div className="alert alert-error mb-5">
                  <IcAlert /><span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label req">Product Name</label>
                  <input type="text" required className="form-input" placeholder="e.g. Sulfuric Acid 98%"
                    value={form.productName} onChange={set('productName')} />
                </div>

                {/* Code + HS Code */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label req">Product Code</label>
                    <input type="text" required className="form-input font-numeric" placeholder="CHEM-001"
                      value={form.productCode} onChange={set('productCode')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">HS Code <span className="text-xs text-neutral-400">(4–8 digits)</span></label>
                    <input type="text" required className="form-input font-numeric" placeholder="28070010"
                      value={form.hsCode} onChange={set('hsCode')} />
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" placeholder="Optional product description"
                    value={form.description} onChange={set('description')} />
                </div>

                {/* Unit + Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label req">Unit of Measure</label>
                    <select className="form-select" value={form.unitOfMeasure} onChange={set('unitOfMeasure')}>
                      {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Sale Price (PKR)</label>
                    <input type="number" required min="0" step="0.01" className="form-input font-numeric"
                      placeholder="0.00" value={form.defaultSalePrice}
                      onChange={set('defaultSalePrice')} />
                  </div>
                </div>

                {/* Tax Rate */}
                <div className="form-group">
                  <label className="form-label req">Default Tax Rate</label>
                  <select className="form-select" value={form.defaultTaxRate}
                    onChange={e => setForm(f => ({ ...f, defaultTaxRate: parseInt(e.target.value) }))}>
                    {TAX_RATES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="form-hint">Used as default when adding this product to an invoice</div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                    {saving ? <><Spinner /> Saving…</> : (editId ? 'Update Product' : 'Save Product')}
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
