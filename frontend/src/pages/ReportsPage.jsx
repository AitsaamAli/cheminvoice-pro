import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from '../components/Layout';
import { generateReportPDF, printCurrentPage } from '../utils/pdfGenerator';

const fmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const fmtN = (n) => parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });

const fbrBadge = (s) => {
  const map = { ACCEPTED: 'badge-success', PENDING: 'badge-warning', ERROR: 'badge-error', CANCELLED: 'badge-neutral' };
  return <span className={map[s] || 'badge-warning'}>{s || 'PENDING'}</span>;
};
const payBadge = (s) => {
  const map = { PAID: 'badge-success', PARTIAL: 'badge-warning', UNPAID: 'badge-error' };
  return <span className={map[s] || 'badge-neutral'}>{s || 'UNPAID'}</span>;
};

function downloadCSV(rows, filename) {
  const header = ['Invoice No', 'Date', 'Customer', 'Type', 'Taxable Value', 'Sales Tax', 'Total Amount', 'FBR Status', 'Payment Status', 'FBR IRN'];
  const lines = [header, ...rows.map(inv => [
    inv.invoiceNumber,
    new Date(inv.invoiceDate).toLocaleDateString('en-PK'),
    inv.customer?.businessName || '',
    inv.invoiceType || '',
    parseFloat(inv.totalTaxableValue || 0).toFixed(2),
    parseFloat(inv.totalSalesTax || 0).toFixed(2),
    parseFloat(inv.totalInvoiceAmount || 0).toFixed(2),
    inv.fbrStatus || 'PENDING',
    inv.paymentStatus || 'UNPAID',
    inv.fbrInvoiceNumber || '',
  ])];
  const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel Urdu
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'aging'
  const [company, setCompany] = useState(null);
  const [pdfing, setPdfing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);
  const today = new Date();
  const [range, setRange] = useState({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  });

  useEffect(() => {
    API.get('/auth/me').then(r => setCompany(r.data?.company || null)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [range]);

  const handleMarkPaid = async (inv) => {
    setMarkingPaid(inv.id);
    try {
      await API.patch(`/invoices/${inv.id}/payment`, {
        paidAmount: parseFloat(inv.totalInvoiceAmount),
        paymentStatus: 'PAID',
      });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Payment update fail ho gayi');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfing(true);
    try {
      await generateReportPDF(invoices, company, range, totals);
    } catch (e) {
      alert('PDF generate nahi hui: ' + (e.message || e));
    } finally {
      setPdfing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get(
        `/companies/${user.companyId}/invoices?take=500&startDate=${range.startDate}&endDate=${range.endDate}`
      );
      setInvoices(res.data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const setD = (k) => (e) => setRange(r => ({ ...r, [k]: e.target.value }));

  // Overall totals
  const totals = invoices.reduce(
    (a, i) => ({
      count: a.count + 1,
      taxable: a.taxable + parseFloat(i.totalTaxableValue || 0),
      tax: a.tax + parseFloat(i.totalSalesTax || 0),
      amount: a.amount + parseFloat(i.totalInvoiceAmount || 0),
      unpaid: a.unpaid + (i.paymentStatus !== 'PAID' ? parseFloat(i.totalInvoiceAmount || 0) - parseFloat(i.paidAmount || 0) : 0),
    }),
    { count: 0, taxable: 0, tax: 0, amount: 0, unpaid: 0 }
  );

  // Monthly return breakdown by tax rate — critical for FBR filing
  const byRate = [0, 5, 10, 18].map(rate => {
    const rateInvoices = invoices.filter(inv =>
      inv.fbrStatus === 'ACCEPTED' // only accepted invoices count for return
    );
    // This is an approximation — ideally item-level. For exact, fetch invoice items.
    const rateTax = invoices
      .filter(i => i.fbrStatus === 'ACCEPTED')
      .reduce((s, i) => {
        const effectiveRate = parseFloat(i.totalSalesTax || 0) / Math.max(parseFloat(i.totalTaxableValue || 1), 1) * 100;
        return Math.round(effectiveRate) === rate ? s + parseFloat(i.totalSalesTax || 0) : s;
      }, 0);
    const rateTaxable = invoices
      .filter(i => i.fbrStatus === 'ACCEPTED')
      .reduce((s, i) => {
        const effectiveRate = parseFloat(i.totalSalesTax || 0) / Math.max(parseFloat(i.totalTaxableValue || 1), 1) * 100;
        return Math.round(effectiveRate) === rate ? s + parseFloat(i.totalTaxableValue || 0) : s;
      }, 0);
    return { rate, taxable: rateTaxable, tax: rateTax };
  }).filter(r => r.taxable > 0 || r.tax > 0);

  const acceptedCount = invoices.filter(i => i.fbrStatus === 'ACCEPTED').length;
  const filename = `invoices_${range.startDate}_to_${range.endDate}.csv`;

  // Aging report: unpaid invoices grouped by how overdue they are
  const nowMs = Date.now();
  const agingBuckets = [
    { label: 'Current (0–30 days)', min: 0, max: 30, color: '#059669', items: [] },
    { label: '31–60 days', min: 31, max: 60, color: '#D97706', items: [] },
    { label: '61–90 days', min: 61, max: 90, color: '#EA580C', items: [] },
    { label: '90+ days', min: 91, max: Infinity, color: '#DC2626', items: [] },
  ];
  invoices
    .filter(i => i.paymentStatus !== 'PAID' && i.status !== 'CANCELLED')
    .forEach(inv => {
      const agedays = Math.floor((nowMs - new Date(inv.invoiceDate).getTime()) / 86400000);
      const bal = parseFloat(inv.totalInvoiceAmount || 0) - parseFloat(inv.paidAmount || 0);
      const bucket = agingBuckets.find(b => agedays >= b.min && agedays <= b.max);
      if (bucket) bucket.items.push({ ...inv, agedays, balance: bal });
    });
  const agingTotal = agingBuckets.reduce((s, b) => s + b.items.reduce((ss, i) => ss + i.balance, 0), 0);

  return (
    <Layout title="Sales Reports">
      {/* Date filter */}
      <div className="card mb-5 animate-fade-up">
        <div className="card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={range.startDate} onChange={setD('startDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={range.endDate} onChange={setD('endDate')} />
            </div>
            <div className="flex gap-2 pb-0.5 flex-wrap">
              <button onClick={() => setRange({
                startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0],
              })} className="btn btn-outline btn-sm">This Month</button>
              <button onClick={() => setRange({
                startDate: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0],
              })} className="btn btn-outline btn-sm">This Year</button>
              <button
                onClick={() => downloadCSV(invoices, filename)}
                disabled={invoices.length === 0}
                className="btn btn-outline btn-sm gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                CSV
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={invoices.length === 0 || pdfing}
                className="btn btn-primary btn-sm gap-1"
              >
                {pdfing
                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                }
                PDF
              </button>
              <button
                onClick={printCurrentPage}
                disabled={invoices.length === 0}
                className="btn btn-outline btn-sm gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Invoices', value: totals.count, color: '#2563EB', big: true },
          { label: 'Taxable Value', value: fmt(totals.taxable), color: '#0C3D5E' },
          { label: 'Sales Tax Collected', value: fmt(totals.tax), color: '#059669' },
          { label: 'Outstanding', value: fmt(totals.unpaid), color: '#DC2626' },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card animate-fade-up anim-delay-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: s.big ? '2.25rem' : '1.1rem' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Return Breakdown — for FBR filing */}
      {byRate.length > 0 && (
        <div className="card mb-5 animate-fade-up anim-delay-2">
          <div className="card-header">
            <span className="card-title">FBR Monthly Return Summary</span>
            <span className="text-xs text-neutral-400">{acceptedCount} accepted invoices only</span>
          </div>
          <div className="card-body">
            <p className="text-xs text-neutral-500 mb-4">
              Yeh breakdown FBR Sales Tax Return form ke liye hai — har rate ka alag row IRIS mein enter karein.
            </p>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tax Rate</th>
                    <th className="t-right">Taxable Value (PKR)</th>
                    <th className="t-right">Output Tax (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {byRate.map(r => (
                    <tr key={r.rate}>
                      <td><span className="badge badge-primary">{r.rate}%</span></td>
                      <td className="t-right font-numeric font-semibold">{fmtN(r.taxable)}</td>
                      <td className="t-right font-numeric font-semibold text-green-700">{fmtN(r.tax)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F0F7FF', fontWeight: 700 }}>
                    <td className="font-bold text-primary">TOTAL</td>
                    <td className="t-right font-numeric text-primary">{fmtN(totals.taxable)}</td>
                    <td className="t-right font-numeric text-green-700">{fmtN(totals.tax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          className={`btn btn-sm ${activeTab === 'invoices' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('invoices')}
        >
          Invoice Details
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'aging' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('aging')}
        >
          Aging Report
          {agingTotal > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: '#DC2626', color: '#fff' }}>
              {agingBuckets.reduce((s,b)=>s+b.items.length,0)}
            </span>
          )}
        </button>
      </div>

      {/* Aging Report Tab */}
      {activeTab === 'aging' && (
        <div className="space-y-4 animate-fade-up">
          {/* Aging summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {agingBuckets.map((b, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{b.label}</div>
                <div className="stat-value" style={{ color: b.color, fontSize: '1rem' }}>
                  {fmt(b.items.reduce((s,i)=>s+i.balance,0))}
                </div>
                <div className="stat-sub">{b.items.length} invoice(s)</div>
              </div>
            ))}
          </div>

          {/* Aging detail per bucket */}
          {agingBuckets.map((bucket, bi) => bucket.items.length > 0 && (
            <div key={bi} className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: bucket.color }}></div>
                  <span className="card-title">{bucket.label}</span>
                </div>
                <span className="text-sm font-numeric font-semibold" style={{ color: bucket.color }}>
                  {fmt(bucket.items.reduce((s,i)=>s+i.balance,0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th className="t-center">Age (days)</th>
                      <th className="t-right">Total</th>
                      <th className="t-right">Paid</th>
                      <th className="t-right">Balance</th>
                      <th className="t-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bucket.items.sort((a,b) => b.agedays - a.agedays).map(inv => (
                      <tr key={inv.id}>
                        <td className="font-numeric text-xs font-semibold text-primary">{inv.invoiceNumber}</td>
                        <td className="font-medium">{inv.customer?.businessName}</td>
                        <td className="text-xs text-neutral-500">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-PK', {day:'2-digit',month:'short',year:'numeric'})}
                        </td>
                        <td className="t-center">
                          <span className="font-numeric font-bold text-sm" style={{ color: bucket.color }}>{inv.agedays}</span>
                        </td>
                        <td className="t-right font-numeric text-sm">{fmtN(inv.totalInvoiceAmount)}</td>
                        <td className="t-right font-numeric text-sm text-green-700">{fmtN(inv.paidAmount || 0)}</td>
                        <td className="t-right font-numeric font-bold text-sm" style={{ color: bucket.color }}>
                          {fmtN(inv.balance)}
                        </td>
                        <td className="t-center">{payBadge(inv.paymentStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {agingTotal === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon-box">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div className="empty-title" style={{ color: '#059669' }}>All Caught Up!</div>
                <div className="empty-desc">Is period mein koi outstanding invoice nahi hai</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice table */}
      {activeTab === 'invoices' && (
      <div className="card animate-fade-up anim-delay-3">
        <div className="card-header">
          <span className="card-title">Invoice Details</span>
          <span className="text-sm text-neutral-400">{invoices.length} invoices</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-11" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
            </div>
            <div className="empty-title">No invoices in this period</div>
            <div className="empty-desc">Adjust the date range to see results</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th className="t-right">Taxable</th>
                    <th className="t-right">Tax</th>
                    <th className="t-right">Total</th>
                    <th className="t-center">FBR</th>
                    <th className="t-center">Payment</th>
                    <th className="t-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="font-numeric text-xs font-semibold text-primary">{inv.invoiceNumber}</td>
                      <td className="text-xs text-neutral-500">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td className="font-medium">{inv.customer?.businessName}</td>
                      <td className="t-right font-numeric text-sm">{fmtN(inv.totalTaxableValue)}</td>
                      <td className="t-right font-numeric text-sm text-green-700 font-semibold">{fmtN(inv.totalSalesTax)}</td>
                      <td className="t-right font-numeric font-bold text-neutral-800">{fmtN(inv.totalInvoiceAmount)}</td>
                      <td className="t-center">{fbrBadge(inv.fbrStatus)}</td>
                      <td className="t-center">{payBadge(inv.paymentStatus)}</td>
                      <td className="t-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}/pdf`)}
                            className="btn btn-ghost btn-sm text-primary"
                            title="View PDF"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {inv.paymentStatus !== 'PAID' && inv.fbrStatus !== 'CANCELLED' && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              disabled={markingPaid === inv.id}
                              className="btn btn-ghost btn-sm text-green-600"
                              title="Mark Paid"
                            >
                              {markingPaid === inv.id
                                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              }
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals footer */}
            <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4">
              <div className="flex flex-wrap justify-end gap-8">
                <div className="text-right">
                  <div className="text-xs text-neutral-500 mb-0.5">Total Taxable</div>
                  <div className="font-display font-bold text-neutral-800 font-numeric">{fmt(totals.taxable)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500 mb-0.5">Total Sales Tax</div>
                  <div className="font-display font-bold text-green-700 font-numeric">{fmt(totals.tax)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500 mb-0.5">Grand Total</div>
                  <div className="font-display font-bold text-primary font-numeric text-lg">{fmt(totals.amount)}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </Layout>
  );
}
