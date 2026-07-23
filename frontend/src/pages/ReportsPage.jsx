import { useState, useEffect } from 'react';
import { API } from '../App';
import Layout from '../components/Layout';

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
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [range, setRange] = useState({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  });

  useEffect(() => { load(); }, [range]);

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
                className="btn btn-primary btn-sm gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
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

      {/* Invoice table */}
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
    </Layout>
  );
}
