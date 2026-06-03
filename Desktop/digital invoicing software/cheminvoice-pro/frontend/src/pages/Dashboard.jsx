import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from '../components/Layout';

const IcPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcEye = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

function StatCard({ label, value, sub, color, icon, delay }) {
  return (
    <div className={`stat-card animate-fade-up anim-delay-${delay}`}>
      <div className="stat-icon-box" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

const statusBadge = (status) => {
  const map = {
    DRAFT: 'badge-neutral',
    SAVED: 'badge-primary',
    SUBMITTED: 'badge-info',
    ACCEPTED: 'badge-success',
    ERROR: 'badge-error',
  };
  return <span className={map[status] || 'badge-neutral'}>{status}</span>;
};

const fbrBadge = (status) => {
  const map = {
    ACCEPTED: 'badge-success',
    PENDING: 'badge-warning',
    ERROR: 'badge-error',
  };
  const s = status || 'PENDING';
  return <span className={map[s] || 'badge-warning'}>{s}</span>;
};

const fmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ today: 0, monthly: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const res = await API.get(`/companies/${user.companyId}/invoices?take=20`);
      const all = res.data.invoices || [];
      setInvoices(all);
      const todayStr = new Date().toDateString();
      setStats({
        today: all
          .filter(i => new Date(i.invoiceDate).toDateString() === todayStr)
          .reduce((s, i) => s + parseFloat(i.totalInvoiceAmount || 0), 0),
        monthly: all.reduce((s, i) => s + parseFloat(i.totalInvoiceAmount || 0), 0),
        pending: all.filter(i => !i.fbrStatus || i.fbrStatus === 'PENDING').length,
        total: res.data.pagination?.total || all.length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const actions = (
    <button className="btn btn-accent btn-sm" onClick={() => navigate('/invoices/create')}>
      <IcPlus /><span>New Invoice</span>
    </button>
  );

  return (
    <Layout title={`Welcome, ${user.firstName || 'User'}`} actions={actions}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's Sales"
          value={fmt(stats.today)}
          sub="Invoiced today"
          color="#0C3D5E"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          delay={1}
        />
        <StatCard
          label="Monthly Sales"
          value={fmt(stats.monthly)}
          sub="Last 20 invoices"
          color="#00875A"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          delay={2}
        />
        <StatCard
          label="Pending FBR"
          value={String(stats.pending)}
          sub="Awaiting submission"
          color="#D97706"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          delay={3}
        />
        <StatCard
          label="Total Invoices"
          value={String(stats.total)}
          sub="All time"
          color="#2563EB"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          delay={4}
        />
      </div>

      {/* Recent Invoices */}
      <div className="card animate-fade-up anim-delay-4">
        <div className="card-header">
          <span className="card-title">Recent Invoices</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/invoices/create')}>
            <IcPlus /> Create
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="empty-title">No invoices yet</div>
            <div className="empty-desc mb-4">Create your first FBR-compliant invoice to get started</div>
            <button className="btn btn-primary" onClick={() => navigate('/invoices/create')}>
              <IcPlus /> Create First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="t-right">Amount</th>
                  <th className="t-right">Tax</th>
                  <th className="t-center">Status</th>
                  <th className="t-center">FBR</th>
                  <th className="t-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <span className="font-semibold text-neutral-800 font-numeric text-xs">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-neutral-800">{inv.customer?.businessName}</span>
                    </td>
                    <td className="text-neutral-500 text-xs">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="t-right font-semibold font-numeric">
                      {fmt(inv.totalInvoiceAmount)}
                    </td>
                    <td className="t-right text-xs text-neutral-500 font-numeric">
                      {fmt(inv.totalSalesTax)}
                    </td>
                    <td className="t-center">{statusBadge(inv.status)}</td>
                    <td className="t-center">{fbrBadge(inv.fbrStatus)}</td>
                    <td className="t-center">
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}/pdf`)}
                        className="btn btn-ghost btn-sm text-primary gap-1"
                      >
                        <IcEye /><span className="hidden sm:inline">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
