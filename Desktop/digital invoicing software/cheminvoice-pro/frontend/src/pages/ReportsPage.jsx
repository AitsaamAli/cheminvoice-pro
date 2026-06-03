import { useState, useEffect } from 'react';
import { API } from '../App';
import Layout from '../components/Layout';

const fmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const fbrBadge = (s) => {
  const v = s || 'PENDING';
  const map = { ACCEPTED: 'badge-success', PENDING: 'badge-warning', ERROR: 'badge-error' };
  return <span className={map[v] || 'badge-warning'}>{v}</span>;
};

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
        `/companies/${user.companyId}/invoices?take=1000&startDate=${range.startDate}&endDate=${range.endDate}`
      );
      setInvoices(res.data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totals = invoices.reduce(
    (a, i) => ({
      count: a.count + 1,
      taxable: a.taxable + parseFloat(i.totalTaxableValue || 0),
      tax: a.tax + parseFloat(i.totalSalesTax || 0),
      amount: a.amount + parseFloat(i.totalInvoiceAmount || 0),
    }),
    { count: 0, taxable: 0, tax: 0, amount: 0 }
  );

  const setD = (k) => (e) => setRange(r => ({ ...r, [k]: e.target.value }));

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
            <div className="flex gap-2 pb-0.5">
              <button
                onClick={() => setRange({
                  startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0],
                })}
                className="btn btn-outline btn-sm"
              >This Month</button>
              <button
                onClick={() => setRange({
                  startDate: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0],
                })}
                className="btn btn-outline btn-sm"
              >This Year</button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Invoices', value: totals.count, color: '#2563EB' },
          { label: 'Taxable Value', value: fmt(totals.taxable), color: '#0C3D5E' },
          { label: 'Sales Tax Collected', value: fmt(totals.tax), color: '#059669' },
          { label: 'Grand Total', value: fmt(totals.amount), color: '#D97706' },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card animate-fade-up anim-delay-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: i === 0 ? '2.25rem' : '1.25rem' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

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
                    <th className="t-right">Taxable Value</th>
                    <th className="t-right">Tax Amount</th>
                    <th className="t-right">Total</th>
                    <th className="t-center">FBR Status</th>
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
                      <td className="t-right font-numeric">{fmt(inv.totalTaxableValue)}</td>
                      <td className="t-right font-numeric text-green-700 font-semibold">{fmt(inv.totalSalesTax)}</td>
                      <td className="t-right font-numeric font-bold text-neutral-800">{fmt(inv.totalInvoiceAmount)}</td>
                      <td className="t-center">{fbrBadge(inv.fbrStatus)}</td>
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
