import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

const STATUS_STYLES = {
  PENDING:   { bg: '#EFF6FF', color: '#1D4ED8', label: 'Pending' },
  TRIAL:     { bg: '#FEF3C7', color: '#92400E', label: 'Trial' },
  ACTIVE:    { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  SUSPENDED: { bg: '#FEE2E2', color: '#991B1B', label: 'Suspended' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.TRIAL;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (user.role !== 'SUPERADMIN') { navigate('/dashboard'); return; }
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/companies');
      setCompanies(res.data.companies || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (id, action) => {
    if (action === 'suspend' && !window.confirm('Suspend this company? They will not be able to create invoices.')) return;
    setActing(id + '_' + action);
    try {
      await API.patch(`/admin/companies/${id}/${action}`);
      // Optimistic update
      setCompanies(prev => prev.map(c => {
        if (c.id !== id) return c;
        if (action === 'approve') return { ...c, subscriptionStatus: 'TRIAL', activatedAt: new Date().toISOString() };
        if (action === 'activate') return { ...c, subscriptionStatus: 'ACTIVE', activatedAt: new Date().toISOString(), suspendedAt: null };
        if (action === 'suspend') return { ...c, subscriptionStatus: 'SUSPENDED', suspendedAt: new Date().toISOString() };
        return c;
      }));
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const pending  = companies.filter(c => c.subscriptionStatus === 'PENDING');
  const trial    = companies.filter(c => c.subscriptionStatus === 'TRIAL');
  const active   = companies.filter(c => c.subscriptionStatus === 'ACTIVE');
  const suspended = companies.filter(c => c.subscriptionStatus === 'SUSPENDED');

  const tabData = {
    pending:   { label: 'Pending Approval', list: pending,   color: '#1D4ED8' },
    trial:     { label: 'Trial',            list: trial,     color: '#92400E' },
    active:    { label: 'Active',           list: active,    color: '#065F46' },
    suspended: { label: 'Suspended',        list: suspended, color: '#991B1B' },
    all:       { label: 'All Clients',      list: companies, color: '#374151' },
  };

  const currentList = (tabData[activeTab]?.list || []).filter(c =>
    (c.businessName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.ntn || '').includes(search) ||
    (c.adminUser?.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: '#0C3D5E' }}>N</div>
          <div>
            <div className="font-bold text-neutral-900 text-sm">Nizaam Invoicing Softwares</div>
            <div className="text-xs text-neutral-400">Super Admin Panel</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded-lg px-3 py-1.5 transition-colors">
            Refresh
          </button>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            App
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Pending alert banner */}
        {pending.length > 0 && (
          <div className="mb-5 rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#3B82F6' }}></span>
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#2563EB' }}></span>
            </span>
            <span className="text-sm font-semibold text-blue-800">
              {pending.length} new sign-up request{pending.length > 1 ? 's' : ''} awaiting your approval
            </span>
            <button onClick={() => setActiveTab('pending')} className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-900 underline">
              Review Now
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pending', value: pending.length, color: '#1D4ED8', bg: '#EFF6FF', tab: 'pending' },
            { label: 'Trial', value: trial.length, color: '#D97706', bg: '#FFFBEB', tab: 'trial' },
            { label: 'Active', value: active.length, color: '#059669', bg: '#ECFDF5', tab: 'active' },
            { label: 'Suspended', value: suspended.length, color: '#DC2626', bg: '#FEF2F2', tab: 'suspended' },
          ].map((s, i) => (
            <button key={i} onClick={() => setActiveTab(s.tab)}
              className="rounded-xl px-5 py-4 text-left transition-all hover:shadow-sm"
              style={{ background: activeTab === s.tab ? s.bg : 'white', border: `1px solid ${activeTab === s.tab ? s.color + '40' : '#f3f4f6'}` }}>
              <div className="text-2xl font-extrabold" style={{ color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 flex-wrap">
              {Object.entries(tabData).map(([key, t]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${activeTab === key ? 'text-white' : 'text-neutral-500 hover:text-neutral-800 bg-neutral-50'}`}
                  style={activeTab === key ? { background: t.color } : {}}>
                  {t.label} ({t.list.length})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto bg-neutral-50 rounded-lg px-3 py-1.5 border border-neutral-200">
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="text-xs outline-none bg-transparent w-32 text-neutral-700 placeholder-neutral-400" />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-neutral-400">Loading…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-400">
              {activeTab === 'pending' ? 'Koi pending request nahi hai.' : 'No companies found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="text-left text-xs text-neutral-400 uppercase tracking-wide border-b border-neutral-100">
                    <th className="px-5 py-3 font-medium">Company / Owner</th>
                    <th className="px-5 py-3 font-medium">NTN · City</th>
                    <th className="px-5 py-3 font-medium text-center">Status</th>
                    {activeTab === 'pending' && <th className="px-5 py-3 font-medium">Signed up</th>}
                    {activeTab !== 'pending' && <th className="px-5 py-3 font-medium text-center">Invoices</th>}
                    {activeTab === 'trial' && <th className="px-5 py-3 font-medium text-center">Trial</th>}
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {currentList.map(c => (
                    <tr key={c.id} className={`hover:bg-neutral-50 transition-colors ${c.subscriptionStatus === 'PENDING' ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-900 truncate max-w-44">{c.businessName}</div>
                        {c.adminUser && (
                          <div className="text-xs text-neutral-400 mt-0.5">{c.adminUser.firstName} {c.adminUser.lastName} · {c.adminUser.email}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-neutral-500">
                        <div className="text-xs">{c.ntn || '—'}</div>
                        <div className="text-xs text-neutral-400">{c.city || '—'}</div>
                      </td>
                      <td className="px-5 py-4 text-center"><StatusBadge status={c.subscriptionStatus} /></td>
                      {activeTab === 'pending' && (
                        <td className="px-5 py-4 text-xs text-neutral-500">{fmtTime(c.createdAt)}</td>
                      )}
                      {activeTab !== 'pending' && (
                        <td className="px-5 py-4 text-center font-semibold text-neutral-700">{c._count?.invoices ?? 0}</td>
                      )}
                      {activeTab === 'trial' && (
                        <td className="px-5 py-4 text-center">
                          <span className={`text-xs font-semibold ${c.trialInvoicesUsed >= c.trialInvoiceLimit ? 'text-red-600' : 'text-amber-600'}`}>
                            {c.trialInvoicesUsed}/{c.trialInvoiceLimit}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.subscriptionStatus === 'PENDING' && (
                            <>
                              <button onClick={() => doAction(c.id, 'approve')} disabled={acting === c.id + '_approve'}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                style={{ background: '#D1FAE5', color: '#065F46' }}>
                                {acting === c.id + '_approve' ? '…' : '✓ Approve'}
                              </button>
                              <button onClick={() => doAction(c.id, 'suspend')} disabled={acting === c.id + '_suspend'}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                style={{ background: '#FEE2E2', color: '#991B1B' }}>
                                {acting === c.id + '_suspend' ? '…' : '✗ Reject'}
                              </button>
                            </>
                          )}
                          {c.subscriptionStatus === 'TRIAL' && (
                            <>
                              <button onClick={() => doAction(c.id, 'activate')} disabled={acting === c.id + '_activate'}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                                style={{ background: '#D1FAE5', color: '#065F46' }}>
                                {acting === c.id + '_activate' ? '…' : 'Upgrade Active'}
                              </button>
                              <button onClick={() => doAction(c.id, 'suspend')} disabled={acting === c.id + '_suspend'}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                                style={{ background: '#FEE2E2', color: '#991B1B' }}>
                                {acting === c.id + '_suspend' ? '…' : 'Suspend'}
                              </button>
                            </>
                          )}
                          {c.subscriptionStatus === 'ACTIVE' && (
                            <button onClick={() => doAction(c.id, 'suspend')} disabled={acting === c.id + '_suspend'}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                              style={{ background: '#FEE2E2', color: '#991B1B' }}>
                              {acting === c.id + '_suspend' ? '…' : 'Suspend'}
                            </button>
                          )}
                          {c.subscriptionStatus === 'SUSPENDED' && (
                            <button onClick={() => doAction(c.id, 'approve')} disabled={acting === c.id + '_approve'}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                              style={{ background: '#D1FAE5', color: '#065F46' }}>
                              {acting === c.id + '_approve' ? '…' : 'Reactivate'}
                            </button>
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
      </div>
    </div>
  );
}
