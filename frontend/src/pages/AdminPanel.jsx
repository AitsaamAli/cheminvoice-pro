import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';

const STATUS_STYLES = {
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

export default function AdminPanel() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user.role !== 'SUPERADMIN') {
      navigate('/');
      return;
    }
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

  const activate = async (id) => {
    setActing(id + '_activate');
    try {
      await API.patch(`/admin/companies/${id}/activate`);
      setCompanies(prev => prev.map(c =>
        c.id === id ? { ...c, subscriptionStatus: 'ACTIVE', activatedAt: new Date().toISOString(), suspendedAt: null } : c
      ));
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const suspend = async (id) => {
    if (!window.confirm('Suspend this company? They will not be able to create new invoices.')) return;
    setActing(id + '_suspend');
    try {
      await API.patch(`/admin/companies/${id}/suspend`);
      setCompanies(prev => prev.map(c =>
        c.id === id ? { ...c, subscriptionStatus: 'SUSPENDED', suspendedAt: new Date().toISOString() } : c
      ));
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const filtered = companies.filter(c =>
    c.businessName.toLowerCase().includes(search.toLowerCase()) ||
    c.ntn?.includes(search) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total: companies.length,
    trial: companies.filter(c => c.subscriptionStatus === 'TRIAL').length,
    active: companies.filter(c => c.subscriptionStatus === 'ACTIVE').length,
    suspended: companies.filter(c => c.subscriptionStatus === 'SUSPENDED').length,
  };

  return (
    <div className="min-h-screen bg-neutral-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: '#0C3D5E' }}>C</div>
          <div>
            <div className="font-semibold text-neutral-900 text-sm">ChemInvoice Pro</div>
            <div className="text-xs text-neutral-400">Super Admin Panel</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to App
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">Client Companies</h1>
          <p className="text-sm text-neutral-500">Manage subscriptions and account status for all registered businesses.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: totals.total, color: '#0C3D5E' },
            { label: 'Trial', value: totals.trial, color: '#D97706' },
            { label: 'Active', value: totals.active, color: '#059669' },
            { label: 'Suspended', value: totals.suspended, color: '#DC2626' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-100 px-5 py-4">
              <div className="text-2xl font-extrabold" style={{ color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + table */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, NTN or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-neutral-800 placeholder-neutral-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-neutral-400 hover:text-neutral-600 text-xs">Clear</button>
            )}
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm text-neutral-400">Loading…</div>
          ) : error ? (
            <div className="py-20 text-center text-sm text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-sm text-neutral-400">No companies found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="text-left text-xs text-neutral-400 uppercase tracking-wide border-b border-neutral-100">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">NTN / City</th>
                    <th className="px-5 py-3 font-medium text-center">Status</th>
                    <th className="px-5 py-3 font-medium text-center">Invoices</th>
                    <th className="px-5 py-3 font-medium text-center">Users</th>
                    <th className="px-5 py-3 font-medium text-center">Trial Used</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-neutral-900 truncate max-w-48">{c.businessName}</div>
                      </td>
                      <td className="px-5 py-4 text-neutral-500">
                        <div>{c.ntn || '—'}</div>
                        <div className="text-xs text-neutral-400">{c.city || '—'}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={c.subscriptionStatus} />
                      </td>
                      <td className="px-5 py-4 text-center font-semibold text-neutral-700">
                        {c._count?.invoices ?? 0}
                      </td>
                      <td className="px-5 py-4 text-center text-neutral-500">
                        {c._count?.users ?? 0}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {c.subscriptionStatus === 'TRIAL' ? (
                          <span className={`font-semibold ${c.trialInvoicesUsed >= c.trialInvoiceLimit ? 'text-red-600' : 'text-amber-600'}`}>
                            {c.trialInvoicesUsed} / {c.trialInvoiceLimit}
                          </span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-neutral-500 whitespace-nowrap">{fmt(c.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {c.subscriptionStatus !== 'ACTIVE' && (
                            <button
                              onClick={() => activate(c.id)}
                              disabled={acting === c.id + '_activate'}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              style={{ background: '#D1FAE5', color: '#065F46' }}
                            >
                              {acting === c.id + '_activate' ? '…' : 'Activate'}
                            </button>
                          )}
                          {c.subscriptionStatus !== 'SUSPENDED' && (
                            <button
                              onClick={() => suspend(c.id)}
                              disabled={acting === c.id + '_suspend'}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              style={{ background: '#FEE2E2', color: '#991B1B' }}
                            >
                              {acting === c.id + '_suspend' ? '…' : 'Suspend'}
                            </button>
                          )}
                          {c.subscriptionStatus === 'SUSPENDED' && (
                            <span className="text-xs text-neutral-400">Suspended {fmt(c.suspendedAt)}</span>
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
