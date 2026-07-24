import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../App';
import Layout from '../components/Layout';

const fmt = (n) => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const payBadge = (s) => {
  const map = { PAID: 'badge-success', PARTIAL: 'badge-warning', UNPAID: 'badge-error' };
  return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s || 'UNPAID'}</span>;
};

const fbrBadge = (s) => {
  const map = { ACCEPTED: 'badge-success', PENDING: 'badge-warning', ERROR: 'badge-error', CANCELLED: 'badge-neutral' };
  return <span className={`badge ${map[s] || 'badge-warning'}`}>{s || 'PENDING'}</span>;
};

function downloadCSV(customer, invoices) {
  const header = ['Date', 'Invoice No', 'Type', 'Invoice Amount', 'Paid', 'Balance', 'Payment Status', 'FBR Status'];
  let running = 0;
  const rows = invoices.map(inv => {
    const amt = parseFloat(inv.totalInvoiceAmount || 0);
    const paid = parseFloat(inv.paidAmount || 0);
    const bal = amt - paid;
    running += bal;
    return [
      new Date(inv.invoiceDate).toLocaleDateString('en-PK'),
      inv.invoiceNumber,
      inv.invoiceType || 'SALES',
      amt.toFixed(2),
      paid.toFixed(2),
      bal.toFixed(2),
      inv.paymentStatus || 'UNPAID',
      inv.fbrStatus || 'PENDING',
    ];
  });
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledger_${customer?.businessName?.replace(/\s+/g,'_') || 'customer'}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function CustomerLedgerPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, invRes] = await Promise.all([
          API.get(`/customers/${customerId}`),
          API.get(`/companies/${user.companyId}/invoices?take=500&customerId=${customerId}`),
        ]);
        setCustomer(custRes.data);
        setInvoices(invRes.data.invoices || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [customerId]);

  // Ledger calculations
  const totalBilled = invoices.reduce((s, i) => s + parseFloat(i.totalInvoiceAmount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + parseFloat(i.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalPaid;
  const totalTax = invoices.reduce((s, i) => s + parseFloat(i.totalSalesTax || 0), 0);

  // Running balance per row (oldest first for ledger)
  const sorted = [...invoices].reverse();
  let runningBalance = 0;
  const rows = sorted.map(inv => {
    const amt = parseFloat(inv.totalInvoiceAmount || 0);
    const paid = parseFloat(inv.paidAmount || 0);
    const bal = amt - paid;
    runningBalance += bal;
    return { ...inv, rowBalance: runningBalance };
  });
  // Show newest first for display
  const displayRows = [...rows].reverse();

  const actions = (
    <div className="flex gap-2">
      <button
        onClick={() => customer && downloadCSV(customer, invoices)}
        disabled={invoices.length === 0}
        className="btn btn-outline btn-sm gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
      </button>
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/customers')}>
        ← Back
      </button>
    </div>
  );

  if (loading) {
    return (
      <Layout title="Customer Ledger" actions={actions}>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout title="Customer Ledger" actions={actions}>
        <div className="card">
          <div className="empty-state">
            <div className="empty-title">Customer not found</div>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/customers')}>← Back to Customers</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Ledger — ${customer.businessName}`} actions={actions}>

      {/* Customer info bar */}
      <div className="card mb-5 animate-fade-up">
        <div className="card-body">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-neutral-900">{customer.businessName}</div>
              <div className="text-sm text-neutral-500 mt-0.5">
                {customer.registrationType}
                {customer.ntn && <span className="ml-3">NTN: <span className="font-numeric">{customer.ntn}</span></span>}
                {customer.strn && <span className="ml-3">STRN: <span className="font-numeric">{customer.strn}</span></span>}
              </div>
              {customer.address && <div className="text-xs text-neutral-400 mt-1">{customer.address}{customer.city ? `, ${customer.city}` : ''}</div>}
            </div>
            <div className="text-right">
              {customer.contactPhone && (
                <a href={`tel:${customer.contactPhone}`} className="text-sm text-primary font-medium">{customer.contactPhone}</a>
              )}
              {customer.contactEmail && (
                <div className="text-xs text-neutral-400 mt-0.5">{customer.contactEmail}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Invoices', value: invoices.length, color: '#2563EB', big: true },
          { label: 'Total Billed', value: fmt(totalBilled), color: '#0C3D5E' },
          { label: 'Total Paid', value: fmt(totalPaid), color: '#059669' },
          { label: 'Balance Due', value: fmt(totalOutstanding), color: totalOutstanding > 0 ? '#DC2626' : '#059669' },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card animate-fade-up anim-delay-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: s.big ? '2rem' : undefined }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Outstanding alert */}
      {totalOutstanding > 0 && (
        <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3 animate-fade-up">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <div className="text-sm font-semibold text-red-800">
              {fmt(totalOutstanding)} outstanding balance
            </div>
            <div className="text-xs text-red-600 mt-0.5">
              {invoices.filter(i => i.paymentStatus !== 'PAID').length} unpaid/partial invoice(s) pending
            </div>
          </div>
        </div>
      )}

      {/* Ledger table */}
      <div className="card animate-fade-up anim-delay-3">
        <div className="card-header">
          <span className="card-title">Transaction Ledger</span>
          <span className="text-sm text-neutral-400">{invoices.length} invoice(s)</span>
        </div>

        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="empty-title">No invoices for this customer</div>
            <div className="empty-desc mb-4">Create an invoice to start the ledger</div>
            <button className="btn btn-primary" onClick={() => navigate('/invoices/create')}>
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th className="t-right">Billed</th>
                  <th className="t-right">Paid</th>
                  <th className="t-right">Balance</th>
                  <th className="t-right">Running Total</th>
                  <th className="t-center">FBR</th>
                  <th className="t-center">Payment</th>
                  <th className="t-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(inv => {
                  const amt = parseFloat(inv.totalInvoiceAmount || 0);
                  const paid = parseFloat(inv.paidAmount || 0);
                  const bal = amt - paid;
                  return (
                    <tr key={inv.id}>
                      <td className="text-xs text-neutral-500">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/pdf`)}
                          className="font-numeric text-xs font-semibold text-primary hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="t-right font-numeric text-sm font-semibold text-neutral-800">
                        {parseFloat(amt).toLocaleString('en-PK', {maximumFractionDigits:0})}
                      </td>
                      <td className="t-right font-numeric text-sm text-green-700">
                        {paid > 0 ? parseFloat(paid).toLocaleString('en-PK', {maximumFractionDigits:0}) : '—'}
                      </td>
                      <td className="t-right font-numeric text-sm font-semibold" style={{ color: bal > 0 ? '#DC2626' : '#059669' }}>
                        {parseFloat(bal).toLocaleString('en-PK', {maximumFractionDigits:0})}
                      </td>
                      <td className="t-right font-numeric text-xs text-neutral-500">
                        {parseFloat(inv.rowBalance).toLocaleString('en-PK', {maximumFractionDigits:0})}
                      </td>
                      <td className="t-center">{fbrBadge(inv.fbrStatus)}</td>
                      <td className="t-center">{payBadge(inv.paymentStatus)}</td>
                      <td className="t-center">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/pdf`)}
                          className="btn btn-ghost btn-sm text-primary"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F0F7FF', fontWeight: 700 }}>
                  <td colSpan={2} className="font-bold text-primary">TOTAL</td>
                  <td className="t-right font-numeric font-bold text-neutral-800">{parseFloat(totalBilled).toLocaleString('en-PK',{maximumFractionDigits:0})}</td>
                  <td className="t-right font-numeric font-bold text-green-700">{parseFloat(totalPaid).toLocaleString('en-PK',{maximumFractionDigits:0})}</td>
                  <td className="t-right font-numeric font-bold" style={{ color: totalOutstanding > 0 ? '#DC2626' : '#059669' }}>
                    {parseFloat(totalOutstanding).toLocaleString('en-PK',{maximumFractionDigits:0})}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Tax summary */}
      {totalTax > 0 && (
        <div className="card mt-4 animate-fade-up">
          <div className="card-body">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Total GST Charged to this customer</span>
              <span className="font-numeric font-bold text-green-700">{fmt(totalTax)}</span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
