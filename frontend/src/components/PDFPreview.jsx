import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../App';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const fmt = n => 'PKR ' + (parseFloat(n)||0).toLocaleString('en-PK', { minimumFractionDigits: 2 });
const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch { return ''; } };

const Badge = ({ status }) => {
  const m = {
    ACCEPTED: 'badge-success', PENDING: 'badge-warning', FAILED: 'badge-danger',
    CANCELLED: 'bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5 text-xs font-medium',
    SAVED: 'badge-info', DRAFT: 'badge-info',
  };
  return <span className={m[status] || 'badge-info'}>{status}</span>;
};

const Row = ({ l, v, hi }) => (
  <div className={`flex justify-between py-2.5 border-b border-dashed border-surface-3 last:border-0 ${hi ? 'font-bold text-primary' : ''}`}>
    <span className="text-sub text-sm">{l}</span>
    <span className={`text-sm ${hi ? 'text-primary text-base font-extrabold' : 'text-text-1 font-semibold'}`}>{v}</span>
  </div>
);

export default function PDFPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [emailAddr, setEmailAddr] = useState('');
  const [emailing, setEmailing] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    try {
      const res = await API.get(`/invoices/${id}`);
      const inv = res.data;
      setInvoice(inv);
      // Load company info for logo + branding
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.companyId) {
        try {
          const cr = await API.get(`/companies/${user.companyId}`);
          setCompany(cr.data?.company || cr.data);
        } catch {}
      }
    } catch (err) {
      setError('Invoice load nahi hui');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await generateInvoicePDF(invoice, company);
    } catch (e) {
      setError('PDF generate karne mein masla: ' + (e.message || String(e)));
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitToFBR = async () => {
    setSubmitting(true); setError('');
    try {
      const res = await API.post(`/invoices/${id}/submit-fbr`, {});
      alert(`Invoice FBR ko submit ho gayi!\nFBR Invoice No: ${res.data.fbrInvoiceNumber}`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'FBR submit fail');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddr.trim()) return;
    setEmailing(true); setEmailMsg('');
    try {
      await API.post(`/invoices/${id}/send-email`, { email: emailAddr });
      setEmailMsg('Invoice email ho gayi!');
      setTimeout(() => { setEmailModal(false); setEmailMsg(''); }, 1500);
    } catch (e) {
      setEmailMsg(e.response?.data?.error || 'Email fail');
    } finally {
      setEmailing(false);
    }
  };

  const whatsappMsg = () => {
    if (!invoice) return;
    const msg = `*${invoice.sellerBusinessName}*\nInvoice: ${invoice.invoiceNumber}\nDate: ${fmtDate(invoice.invoiceDate)}\n*Total: ${fmt(invoice.totalInvoiceAmount)}*\nFBR: ${invoice.fbrStatus}\n\nShukria ap ka business karne ka liye!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-sub">Loading…</div></div>;
  if (!invoice) return <div className="flex items-center justify-center min-h-screen"><div className="text-danger">Invoice nahi mili</div></div>;

  const balance = parseFloat(invoice.totalInvoiceAmount||0) - parseFloat(invoice.paidAmount||0);
  const fbrAccepted = invoice.fbrStatus === 'ACCEPTED';

  return (
    <div className="min-h-screen bg-surface-2 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Toolbar */}
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-display font-bold text-text-1">{invoice.invoiceNumber}</h1>
                <Badge status={invoice.fbrStatus} />
                <Badge status={invoice.status} />
              </div>
              <p className="text-sub text-sm">{fmtDate(invoice.invoiceDate)} · {invoice.buyerBusinessName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← Back</button>
              <button onClick={whatsappMsg} className="btn btn-sm" style={{ background:'#25D366', color:'#fff', borderColor:'#25D366' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 mr-1.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.118 1.531 5.844L0 24l6.335-1.524A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.675-.515-5.2-1.41l-.371-.218-3.763.905.952-3.648-.244-.384A9.958 9.958 0 012 12C2 6.478 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </button>
              <button onClick={() => { setEmailAddr(invoice.customer?.contactEmail||''); setEmailModal(true); }} className="btn btn-sm btn-secondary">
                ✉ Email
              </button>
              <button onClick={handleDownloadPDF} disabled={downloading} className="btn btn-primary btn-sm">
                {downloading ? '…' : '↓ PDF Download'}
              </button>
              {(invoice.status === 'SAVED' || invoice.status === 'DRAFT') && !fbrAccepted && (
                <button onClick={handleSubmitToFBR} disabled={submitting} className="btn btn-success btn-sm">
                  {submitting ? 'Submit ho rahi…' : '✓ FBR Submit'}
                </button>
              )}
            </div>
          </div>
          {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-danger px-4 py-2 text-sm">{error}</div>}
          {fbrAccepted && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 text-success px-4 py-2 text-sm font-medium">
              ✓ FBR Accepted · IRN: {invoice.fbrInvoiceNumber}
            </div>
          )}
        </div>

        {/* Invoice body */}
        <div className="card overflow-hidden">
          {/* Blue header bar */}
          <div style={{ background: 'linear-gradient(135deg, #0C3D5E 80%, #F0A500 100%)', padding: '20px 24px' }}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white font-bold text-lg leading-tight">{invoice.sellerBusinessName}</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>NTN: {invoice.sellerNtn} · STRN: {invoice.sellerStrn}</div>
                {invoice.sellerAddress && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>{invoice.sellerAddress}</div>}
              </div>
              <div className="text-right">
                <div style={{ color: '#F0A500', fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>TAX INVOICE</div>
                <div className="text-white font-mono text-sm mt-0.5">{invoice.invoiceNumber}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{fmtDate(invoice.invoiceDate)}</div>
              </div>
            </div>
          </div>

          {/* Buyer + Seller info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-surface-3">
            <div className="p-5 border-r border-surface-3">
              <div className="text-xs text-sub uppercase tracking-wide mb-2 font-semibold">Bill To</div>
              <div className="font-bold text-text-1 text-base">{invoice.buyerBusinessName}</div>
              <div className="text-sm text-sub mt-1 space-y-0.5">
                <div>Type: {invoice.buyerRegistrationType}</div>
                {invoice.buyerNtn && <div>NTN: {invoice.buyerNtn}</div>}
                {invoice.buyerStrn && <div>STRN: {invoice.buyerStrn}</div>}
                {invoice.buyerCnic && <div>CNIC: {invoice.buyerCnic}</div>}
                {invoice.buyerAddress && <div>{invoice.buyerAddress}</div>}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs text-sub uppercase tracking-wide mb-2 font-semibold">Invoice Details</div>
              <div className="space-y-1.5 text-sm">
                {[
                  ['Type', invoice.invoiceType?.replace(/_/g,' ')],
                  ['Payment', invoice.paymentMethod?.replace(/_/g,' ')],
                  invoice.paymentTerms && ['Terms', invoice.paymentTerms],
                  invoice.remarks && ['Remarks', invoice.remarks],
                  fbrAccepted && ['FBR IRN', invoice.fbrInvoiceNumber],
                ].filter(Boolean).map(([l, v]) => (
                  <div key={l} className="flex gap-2">
                    <span className="text-sub w-20 shrink-0">{l}:</span>
                    <span className="text-text-1 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0C3D5E', color: '#fff' }}>
                  {['#','Description','HS Code','Qty','Unit Price','Taxable','Tax%','Tax Amt','Total'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(invoice.items||[]).map((item, i) => (
                  <tr key={i} className={i%2===0 ? 'bg-white' : 'bg-surface-2'}>
                    <td className="px-3 py-2.5 text-sub text-xs">{String(i+1).padStart(2,'0')}</td>
                    <td className="px-3 py-2.5 text-text-1 font-medium">{item.productDescription}</td>
                    <td className="px-3 py-2.5 text-sub text-xs font-mono">{item.hsCode||'—'}</td>
                    <td className="px-3 py-2.5 text-right">{parseFloat(item.quantity).toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(item.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(item.taxableValue)}</td>
                    <td className="px-3 py-2.5 text-center">{item.taxRate}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(item.taxAmount)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary">{fmt(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-5 border-t border-surface-3">
            <div className="flex flex-col md:flex-row gap-6 justify-between">
              {/* Amount in words */}
              <div className="flex-1">
                <div className="rounded-lg p-3" style={{ background: '#EBF5FB', borderLeft: '3px solid #0C3D5E' }}>
                  <div className="text-xs text-sub mb-1 uppercase tracking-wide font-semibold">Amount in Words</div>
                  <div className="text-sm text-primary font-medium italic">
                    {(() => {
                      const n = Math.round(parseFloat(invoice.totalInvoiceAmount)||0);
                      const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
                      const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
                      const td = n => n<20?ones[n]:(tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'')).trim();
                      const th = n => n>=100?ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+td(n%100):''):td(n);
                      if (!n) return 'Rupees Zero Only';
                      const c=Math.floor(n/10000000), l=Math.floor((n%10000000)/100000), t=Math.floor((n%100000)/1000), r=n%1000;
                      return 'Rupees '+(c?th(c)+' Crore ':'')+( l?th(l)+' Lakh ':'')+( t?th(t)+' Thousand ':'')+( r?th(r):'')+' Only';
                    })()}
                  </div>
                </div>
                {invoice.fbrQrCode && (
                  <div className="mt-4 flex items-center gap-3">
                    <img src={invoice.fbrQrCode} alt="FBR QR" className="w-16 h-16 rounded" />
                    <span className="text-xs text-sub">FBR QR Code</span>
                  </div>
                )}
              </div>

              {/* Totals block */}
              <div className="w-full md:w-72 space-y-1">
                <Row l="Taxable Value" v={fmt(invoice.totalTaxableValue)} />
                <Row l="Sales Tax (GST)" v={fmt(invoice.totalSalesTax)} />
                {parseFloat(invoice.totalFurtherTax||0) > 0 && <Row l="Further Tax (3%)" v={fmt(invoice.totalFurtherTax)} />}
                <div className="rounded-lg px-4 py-3 flex justify-between items-center" style={{ background: '#0C3D5E' }}>
                  <span className="text-white font-bold">TOTAL</span>
                  <span className="text-white font-extrabold text-lg">{fmt(invoice.totalInvoiceAmount)}</span>
                </div>
                {parseFloat(invoice.paidAmount||0) > 0 && <Row l="Paid" v={fmt(invoice.paidAmount)} />}
                {balance > 0.5 ? (
                  <div className="rounded-lg px-4 py-2.5 flex justify-between items-center bg-red-600">
                    <span className="text-white font-bold text-sm">BALANCE DUE</span>
                    <span className="text-white font-bold">{fmt(balance)}</span>
                  </div>
                ) : (
                  <div className="rounded-lg px-4 py-2.5 flex justify-between items-center bg-green-600">
                    <span className="text-white font-bold text-sm">FULLY PAID</span>
                    <span className="text-white font-bold">CLEARED ✓</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Signature lines */}
          <div className="grid grid-cols-3 border-t border-surface-3 divide-x divide-surface-3">
            {['Prepared By','Authorized Signatory','Customer / Receiver'].map(s => (
              <div key={s} className="p-5 text-center">
                <div className="h-8 border-b border-surface-3 mb-2" />
                <div className="text-xs text-sub">{s}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-surface-2 border-t border-surface-3 flex justify-between items-center text-xs text-muted">
            <span>{invoice.sellerBusinessName}</span>
            <span>Per SRO 1413(I)/2025 · FBR Compliant · Nizaam.com</span>
            <span>{fmtDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-text-1 mb-4">Invoice Email Karein</h3>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input mb-4"
              placeholder="customer@example.com"
              value={emailAddr}
              onChange={e => setEmailAddr(e.target.value)}
            />
            {emailMsg && <div className={`mb-3 text-sm ${emailMsg.includes('fail')||emailMsg.includes('Error') ? 'text-danger' : 'text-success'}`}>{emailMsg}</div>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEmailModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={handleSendEmail} disabled={emailing} className="btn btn-primary btn-sm">
                {emailing ? 'Bhej rahi…' : '✉ Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
