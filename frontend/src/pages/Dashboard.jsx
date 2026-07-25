import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from '../components/Layout';
import PaymentModal from '../components/PaymentModal';

const IcTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

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
const IcSend = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcWA = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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

const fbrBadge = (status) => {
  const map = { ACCEPTED: 'badge-success', PENDING: 'badge-warning', ERROR: 'badge-error', CANCELLED: 'badge-neutral' };
  const s = status || 'PENDING';
  return <span className={`badge ${map[s] || 'badge-warning'}`}>{s}</span>;
};

const payBadge = (status) => {
  const map = { PAID: 'badge-success', PARTIAL: 'badge-warning', UNPAID: 'badge-error' };
  const s = status || 'UNPAID';
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
};

const fmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const fmtK = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v.toFixed(0);
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function RevenueChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-sm text-neutral-400">No data for this year yet</div>
  );
  const max = Math.max(...data.map(d => d.amount), 1);
  const currentMonth = new Date().getMonth();
  return (
    <div className="flex items-end gap-1.5 h-32 w-full">
      {data.map((d, i) => {
        const h = Math.max((d.amount / max) * 100, d.amount > 0 ? 4 : 0);
        const isCurrent = d.monthIdx === currentMonth;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1" title={`${d.label}: PKR ${d.amount.toLocaleString('en-PK')}`}>
            <div className="text-xs text-neutral-500 font-numeric truncate" style={{ fontSize: '0.6rem' }}>
              {d.amount > 0 ? fmtK(d.amount) : ''}
            </div>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${h}%`,
                minHeight: d.amount > 0 ? '4px' : '0',
                background: isCurrent ? '#0C3D5E' : '#93B4C8',
                opacity: d.amount > 0 ? 1 : 0.2,
              }}
            />
            <div className="text-neutral-400" style={{ fontSize: '0.6rem' }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function TopCustomers({ data }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-24 text-sm text-neutral-400">No data yet</div>
  );
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="space-y-3">
      {data.map((c, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: ['#0C3D5E','#1A5276','#2874A6','#2E86C1','#3498DB'][i], fontSize: '0.6rem' }}>
                {i + 1}
              </div>
              <span className="text-sm font-medium text-neutral-800 truncate max-w-32">{c.name}</span>
            </div>
            <span className="text-xs font-numeric font-semibold text-neutral-600">{fmtK(c.amount)}</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(c.amount / max) * 100}%`, background: ['#0C3D5E','#1A5276','#2874A6','#2E86C1','#3498DB'][i] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function whatsappMsg(inv) {
  const date = new Date(inv.invoiceDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const amt = parseFloat(inv.totalInvoiceAmount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  const paid = parseFloat(inv.paidAmount || 0);
  const total = parseFloat(inv.totalInvoiceAmount || 0);
  const balance = total - paid;
  const status = inv.paymentStatus === 'PAID' ? 'PAID ✅' : `Outstanding: PKR ${balance.toLocaleString('en-PK', {maximumFractionDigits:0})}`;
  const msg = `Assalam o Alaikum *${inv.customer?.businessName || ''}*\n\nInvoice No: *${inv.invoiceNumber}*\nDate: ${date}\nTotal Amount: *PKR ${amt}*\nPayment: ${status}\n\nPlease confirm receipt. JazakAllah.`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({ today: 0, monthly: 0, pending: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [paymentInv, setPaymentInv] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    load();
    loadChart();
    API.get(`/companies/${user.companyId}`)
      .then(r => setCompany(r.data.company))
      .catch(() => {});
    API.get(`/companies/${user.companyId}/products?lowStock=true`)
      .then(r => setLowStock(r.data.products || []))
      .catch(() => {});
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
        outstanding: all
          .filter(i => i.paymentStatus !== 'PAID' && i.fbrStatus === 'ACCEPTED')
          .reduce((s, i) => s + (parseFloat(i.totalInvoiceAmount || 0) - parseFloat(i.paidAmount || 0)), 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadChart = async () => {
    const year = new Date().getFullYear();
    try {
      const res = await API.get(`/companies/${user.companyId}/invoices?take=500&startDate=${year}-01-01&endDate=${year}-12-31`);
      const all = res.data.invoices || [];

      // Monthly totals
      const monthAmounts = Array(12).fill(0);
      all.forEach(inv => {
        const m = new Date(inv.invoiceDate).getMonth();
        monthAmounts[m] += parseFloat(inv.totalInvoiceAmount || 0);
      });
      setChartData(MONTHS.map((label, i) => ({ label, monthIdx: i, amount: monthAmounts[i] })));

      // Top 5 customers
      const custMap = {};
      all.forEach(inv => {
        const name = inv.customer?.businessName || 'Unknown';
        if (!custMap[name]) custMap[name] = { name, amount: 0, count: 0 };
        custMap[name].amount += parseFloat(inv.totalInvoiceAmount || 0);
        custMap[name].count++;
      });
      const top5 = Object.values(custMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      setTopCustomers(top5);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitFBR = async (inv) => {
    if (!confirm(`Invoice ${inv.invoiceNumber} ko FBR mein submit karein?`)) return;
    setSubmitting(inv.id);
    try {
      const res = await API.post(`/invoices/${inv.id}/submit-fbr`, {});
      if (res.data.alreadyAccepted) {
        alert('Invoice pehle se FBR mein accept ho chuki hai.');
      } else {
        alert(`FBR Submit Successful!\nIRN: ${res.data.fbrInvoiceNumber}`);
      }
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'FBR submission fail ho gayi');
    } finally {
      setSubmitting(null);
    }
  };


  const handleCancel = async (inv) => {
    if (!confirm(`Invoice ${inv.invoiceNumber} cancel karein? Yeh undo nahi ho sakti.`)) return;
    setCancelling(inv.id);
    try {
      await API.delete(`/invoices/${inv.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Cancel fail ho gayi');
    } finally {
      setCancelling(null);
    }
  };

  const actions = (
    <button className="btn btn-accent btn-sm" onClick={() => navigate('/invoices/create')}>
      <IcPlus /><span>New Invoice</span>
    </button>
  );

  return (
    <Layout title={`Welcome, ${user.firstName || 'User'}`} actions={actions}>
      {/* Trial / Suspended banner */}
      {company?.subscriptionStatus === 'SUSPENDED' && (
        <div className="mb-5 rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-sm font-medium text-red-800">
            Your account is suspended. New invoices are blocked. Please contact support to reactivate.
          </span>
        </div>
      )}
      {company?.subscriptionStatus === 'TRIAL' && (
        <div className="mb-5 rounded-xl px-5 py-3.5 flex items-center justify-between gap-3"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-medium text-amber-800">
              Free trial: <strong>{company.trialInvoicesUsed}</strong> of <strong>{company.trialInvoiceLimit}</strong> invoices used.
              {company.trialInvoicesUsed >= company.trialInvoiceLimit
                ? ' Trial limit reached — upgrade to continue.'
                : ` ${company.trialInvoiceLimit - company.trialInvoicesUsed} remaining.`}
            </span>
          </div>
          <a href="mailto:support@cheminvoice.com" className="text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap underline">
            Upgrade Now
          </a>
        </div>
      )}
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
          label="Recent Sales"
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
          label="Outstanding"
          value={fmt(stats.outstanding)}
          sub="Unpaid receivables"
          color="#DC2626"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
          delay={4}
        />
      </div>

      {/* Chart + Top Customers row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue bar chart */}
        <div className="card lg:col-span-2 animate-fade-up anim-delay-4">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue</div>
              <div className="text-xs text-neutral-400 mt-0.5">{new Date().getFullYear()} — all invoices</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#0C3D5E' }}></span>
                Current month
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#93B4C8' }}></span>
                Past months
              </span>
            </div>
          </div>
          <div className="card-body pt-2">
            <RevenueChart data={chartData} />
          </div>
        </div>

        {/* Top 5 Customers */}
        <div className="card animate-fade-up anim-delay-5">
          <div className="card-header">
            <div>
              <div className="card-title">Top Customers</div>
              <div className="text-xs text-neutral-400 mt-0.5">By revenue this year</div>
            </div>
          </div>
          <div className="card-body">
            <TopCustomers data={topCustomers} />
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="card animate-fade-up anim-delay-5 mb-5" style={{ borderColor: '#F0A500', borderWidth: 1 }}>
          <div className="card-header" style={{ background: '#FFFBEB' }}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="card-title text-amber-700">Low Stock Alert</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">{lowStock.length} products</span>
            </div>
            <button className="btn btn-ghost btn-sm text-xs" onClick={() => navigate('/products')}>View All →</button>
          </div>
          <div className="card-body pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <div>
                    <div className="text-xs font-semibold text-neutral-800 truncate max-w-28">{p.productName}</div>
                    <div className="text-xs text-amber-600 font-numeric mt-0.5">Stock: {p.stockQuantity} / Min: {p.reorderLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="card animate-fade-up anim-delay-5">
        <div className="card-header">
          <span className="card-title">Recent Invoices</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/invoices/create')}>
            <IcPlus /> Create
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-12" />)}
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
                  <th className="t-center">FBR</th>
                  <th className="t-center">Payment</th>
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
                    <td className="t-center">{fbrBadge(inv.fbrStatus)}</td>
                    <td className="t-center">{payBadge(inv.paymentStatus)}</td>
                    <td className="t-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* FBR submit */}
                        {inv.fbrStatus === 'PENDING' && (
                          <button
                            onClick={() => handleSubmitFBR(inv)}
                            disabled={submitting === inv.id}
                            className="btn btn-sm gap-1"
                            style={{ background: '#F0A500', color: '#fff', fontSize: '0.7rem', padding: '4px 8px' }}
                            title="FBR ko submit karein"
                          >
                            {submitting === inv.id
                              ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                              : <IcSend />}
                            <span className="hidden sm:inline">FBR</span>
                          </button>
                        )}
                        {/* Pay / Partial payment */}
                        {inv.paymentStatus !== 'PAID' && inv.fbrStatus !== 'CANCELLED' && (
                          <button
                            onClick={() => setPaymentInv(inv)}
                            className="btn btn-sm gap-1"
                            style={{ background: '#059669', color: '#fff', fontSize: '0.7rem', padding: '4px 8px' }}
                            title="Payment record karein"
                          >
                            <IcCheck />
                            <span className="hidden sm:inline">Pay</span>
                          </button>
                        )}
                        {/* WhatsApp share */}
                        <a
                          href={whatsappMsg(inv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm gap-1"
                          style={{ background: '#25D366', color: '#fff', fontSize: '0.7rem', padding: '4px 8px' }}
                          title="WhatsApp par invoice share karein"
                        >
                          <IcWA />
                          <span className="hidden sm:inline">WA</span>
                        </a>
                        {/* View */}
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/pdf`)}
                          className="btn btn-ghost btn-sm text-primary gap-1"
                          title="View invoice"
                        >
                          <IcEye /><span className="hidden sm:inline">View</span>
                        </button>
                        {/* Cancel */}
                        {inv.fbrStatus !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(inv)}
                            disabled={cancelling === inv.id}
                            className="btn btn-ghost btn-sm text-danger gap-1"
                            title="Invoice cancel karein"
                          >
                            {cancelling === inv.id
                              ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                              : <IcTrash />}
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

      {paymentInv && (
        <PaymentModal
          invoice={paymentInv}
          onClose={() => setPaymentInv(null)}
          onSaved={() => { load(); setPaymentInv(null); }}
        />
      )}
    </Layout>
  );
}
