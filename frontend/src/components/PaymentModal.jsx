import { useState } from 'react';
import { API } from '../App';

const METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'];

export default function PaymentModal({ invoice, onClose, onSaved }) {
  const existing = parseFloat(invoice.paidAmount || 0);
  const total = parseFloat(invoice.totalInvoiceAmount || 0);
  const balance = Math.max(0, total - existing);

  const [receiving, setReceiving] = useState(balance.toFixed(2));
  const [method, setMethod] = useState('CASH');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const newCumulative = Math.min(existing + (parseFloat(receiving) || 0), total);
  const newStatus = newCumulative >= total ? 'PAID' : newCumulative > 0 ? 'PARTIAL' : 'UNPAID';

  const fmt = n => `PKR ${parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = async () => {
    const amt = parseFloat(receiving);
    if (!amt || amt <= 0) { setError('Amount enter karein'); return; }
    setSaving(true); setError('');
    try {
      await API.patch(`/invoices/${invoice.id}/payment`, {
        paidAmount: parseFloat(newCumulative.toFixed(2)),
        paymentStatus: newStatus,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Save fail ho gayi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Payment Record</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Invoice summary */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Invoice</span>
              <span className="font-semibold font-numeric text-xs text-neutral-700">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Amount</span>
              <span className="font-semibold font-numeric">{fmt(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Already Paid</span>
              <span className="font-semibold font-numeric text-green-700">{fmt(existing)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-neutral-200 pt-1.5 mt-1">
              <span className="text-neutral-700 font-semibold">Balance Due</span>
              <span className="font-bold font-numeric text-red-600">{fmt(balance)}</span>
            </div>
          </div>

          {/* Amount being received */}
          <div className="form-group">
            <label className="form-label req">Amount Receiving Now (PKR)</label>
            <input
              type="number"
              className="form-input font-numeric"
              value={receiving}
              onChange={e => setReceiving(e.target.value)}
              min="0.01"
              max={balance}
              step="0.01"
              placeholder="0.00"
            />
          </div>

          {/* Payment method */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Preview */}
          {parseFloat(receiving) > 0 && (
            <div className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold border ${
              newStatus === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <span>New Status</span>
              <span>{newStatus === 'PAID' ? '✅ FULLY PAID' : `⏳ PARTIAL — ${fmt(newCumulative)} paid`}</span>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
              {saving
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : 'Record Payment'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
