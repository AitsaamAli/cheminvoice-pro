import { useState, useEffect } from 'react';
import { API } from '../App';
import Layout from '../components/Layout';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'AJK', 'Gilgit-Baltistan'];

const EMPTY = {
  businessName: '', ntn: '', cnic: '', strn: '',
  address: '', province: 'Punjab', city: '',
  registrationType: 'UNREGISTERED',
  contactPerson: '', contactPhone: '', contactEmail: '',
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
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const IcAlert = () => (
  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const regTypeBadge = (t) => {
  const map = { REGISTERED: 'badge-success', FOREIGN: 'badge-info', UNREGISTERED: 'badge-neutral' };
  return <span className={map[t] || 'badge-neutral'}>{t}</span>;
};

export default function CustomersPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [customers, setCustomers] = useState([]);
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
      const res = await API.get(`/companies/${user.companyId}/customers`);
      setCustomers(res.data.customers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openNew = () => { setForm(EMPTY); setEditId(null); setFormError(''); setModalOpen(true); };
  const openEdit = (c) => { setForm({ ...EMPTY, ...c }); setEditId(c.id); setFormError(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditId(null); setFormError(''); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      if (editId) {
        await API.put(`/customers/${editId}`, form);
      } else {
        await API.post(`/companies/${user.companyId}/customers`, form);
      }
      await load();
      closeModal();
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.details?.map(x => x.message).join(', ') || d?.error || 'Failed to save customer';
      setFormError(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await API.delete(`/customers/${id}`); load(); }
    catch { alert('Could not delete customer'); }
  };

  const filtered = customers.filter(c =>
    !search || c.businessName.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactEmail || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const actions = (
    <button className="btn btn-accent btn-sm" onClick={openNew}>
      <IcPlus /><span>New Customer</span>
    </button>
  );

  return (
    <Layout title="Customers" actions={actions}>
      {/* Search + count */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Search customers…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9" style={{ width: 240 }}
          />
        </div>
        <span className="text-sm text-neutral-500">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card animate-fade-up">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div className="empty-title">{search ? 'No customers found' : 'No customers yet'}</div>
            <div className="empty-desc mb-4">
              {search ? 'Try a different search term' : 'Add your first customer to start creating invoices'}
            </div>
            {!search && (
              <button className="btn btn-primary" onClick={openNew}><IcPlus /> Add Customer</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Type</th>
                  <th>NTN / CNIC</th>
                  <th>City</th>
                  <th>Contact</th>
                  <th className="t-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-semibold text-neutral-800">{c.businessName}</div>
                      {c.contactEmail && <div className="text-xs text-neutral-400 mt-0.5">{c.contactEmail}</div>}
                    </td>
                    <td>{regTypeBadge(c.registrationType)}</td>
                    <td className="font-numeric text-xs text-neutral-600">{c.ntn || c.cnic || '—'}</td>
                    <td className="text-neutral-600">{c.city || '—'}</td>
                    <td className="text-neutral-600 text-sm">{c.contactPhone || '—'}</td>
                    <td className="t-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="btn btn-ghost btn-sm gap-1 text-primary">
                          <IcEdit /> Edit
                        </button>
                        <button onClick={() => handleDelete(c.id, c.businessName)} className="btn btn-danger-ghost btn-sm gap-1">
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
              <span className="modal-title">{editId ? 'Edit Customer' : 'New Customer'}</span>
              <button onClick={closeModal} className="btn btn-ghost btn-icon"><IcClose /></button>
            </div>
            <div className="modal-body">
              {formError && (
                <div className="alert alert-error mb-5">
                  <IcAlert /><span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-4">
                {/* Business Name */}
                <div className="form-group">
                  <label className="form-label req">Business Name</label>
                  <input type="text" required className="form-input" placeholder="Company Name / Proprietor Name"
                    value={form.businessName} onChange={set('businessName')} />
                </div>

                {/* Registration Type */}
                <div className="form-group">
                  <label className="form-label req">Registration Type</label>
                  <select className="form-select" value={form.registrationType} onChange={set('registrationType')}>
                    <option value="UNREGISTERED">Unregistered (No NTN/STRN)</option>
                    <option value="REGISTERED">Registered with FBR (Has NTN)</option>
                    <option value="FOREIGN">Foreign Company</option>
                  </select>
                </div>

                {/* NTN + STRN */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">NTN <span className="text-xs text-neutral-400">(7 digits)</span></label>
                    <input type="text" className="form-input font-numeric" placeholder="1234567" maxLength={7}
                      value={form.ntn} onChange={e => setForm(f => ({ ...f, ntn: e.target.value.replace(/\D/g,'') }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">STRN <span className="text-xs text-neutral-400">(13 digits)</span></label>
                    <input type="text" className="form-input font-numeric" placeholder="1234567890123" maxLength={13}
                      value={form.strn} onChange={e => setForm(f => ({ ...f, strn: e.target.value.replace(/\D/g,'') }))} />
                  </div>
                </div>

                {/* CNIC */}
                <div className="form-group">
                  <label className="form-label">CNIC</label>
                  <input type="text" className="form-input font-numeric" placeholder="35202-1234567-1"
                    value={form.cnic} onChange={set('cnic')} />
                </div>

                {/* Address */}
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" placeholder="Street / Area"
                    value={form.address} onChange={set('address')} />
                </div>

                {/* Province + City */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Province</label>
                    <select className="form-select" value={form.province} onChange={set('province')}>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-input" placeholder="Lahore"
                      value={form.city} onChange={set('city')} />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-neutral-100 pt-4">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Contact Information</div>
                  <div className="space-y-3">
                    <div className="form-group">
                      <label className="form-label">Contact Person</label>
                      <input type="text" className="form-input" placeholder="Full name"
                        value={form.contactPerson} onChange={set('contactPerson')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input type="tel" className="form-input" placeholder="03001234567"
                          value={form.contactPhone} onChange={set('contactPhone')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" placeholder="customer@email.com"
                          value={form.contactEmail} onChange={set('contactEmail')} />
                      </div>
                    </div>
                    <div className="form-hint">Email enables customer portal access</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                    {saving ? <><Spinner /> Saving…</> : (editId ? 'Update Customer' : 'Save Customer')}
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
