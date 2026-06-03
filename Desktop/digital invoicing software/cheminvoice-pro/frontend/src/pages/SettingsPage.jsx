import { useState } from 'react';
import Layout from '../components/Layout';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'AJK', 'Gilgit-Baltistan'];

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [company, setCompany] = useState({
    businessName: user.businessName || '',
    ntn: '',
    strn: '',
    address: '',
    province: 'Punjab',
    city: '',
    contactPhone: '',
    contactEmail: '',
  });

  const set = (k) => (e) => setCompany(c => ({ ...c, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const taxRates = [
    { rate: '0%', label: 'Zero-Rated', desc: 'Exempt goods', color: '#5B6B8A' },
    { rate: '5%', label: 'Reduced', desc: 'Essential goods', color: '#2563EB' },
    { rate: '10%', label: 'Reduced', desc: 'Semi-essential', color: '#7C3AED' },
    { rate: '18%', label: 'Standard GST', desc: 'Default rate', color: '#D97706' },
  ];

  return (
    <Layout title="Settings">
      <div className="max-w-3xl space-y-5">
        {/* Company Info */}
        <div className="card animate-fade-up">
          <div className="card-header">
            <div>
              <div className="card-title">Company Information</div>
              <div className="text-xs text-neutral-400 mt-0.5">Your FBR-registered business details</div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label className="form-label req">Business Name</label>
                <input type="text" className="form-input" value={company.businessName} onChange={set('businessName')} placeholder="Your Registered Business Name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NTN</label>
                  <input type="text" className="form-input font-numeric" value={company.ntn} onChange={set('ntn')} placeholder="7-digit NTN" maxLength={7} />
                </div>
                <div className="form-group">
                  <label className="form-label">STRN</label>
                  <input type="text" className="form-input font-numeric" value={company.strn} onChange={set('strn')} placeholder="13-digit STRN" maxLength={13} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" value={company.address} onChange={set('address')} placeholder="Registered address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Province</label>
                  <select className="form-select" value={company.province} onChange={set('province')}>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" value={company.city} onChange={set('city')} placeholder="City" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input type="tel" className="form-input" value={company.contactPhone} onChange={set('contactPhone')} placeholder="+92-21-111-222-333" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input type="email" className="form-input" value={company.contactEmail} onChange={set('contactEmail')} placeholder="info@company.com" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <><Spinner /> Saving…</> : 'Save Changes'}
                </button>
                {saved && (
                  <span className="badge badge-success">✓ Changes saved</span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* FBR Settings */}
        <div className="card animate-fade-up anim-delay-1">
          <div className="card-header">
            <div>
              <div className="card-title">FBR Integration</div>
              <div className="text-xs text-neutral-400 mt-0.5">IRIS API configuration</div>
            </div>
            <span className="badge badge-warning">Sandbox Mode</span>
          </div>
          <div className="card-body">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <div className="text-sm font-semibold text-amber-800">You are in Sandbox Mode</div>
                <div className="text-xs text-amber-700 mt-0.5">
                  Invoices are submitted to FBR's test environment. Switch to Production when your IRIS credentials are verified.
                </div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm">
              Switch to Production Mode
            </button>
          </div>
        </div>

        {/* Tax Rates */}
        <div className="card animate-fade-up anim-delay-2">
          <div className="card-header">
            <div>
              <div className="card-title">Pakistan GST Rates</div>
              <div className="text-xs text-neutral-400 mt-0.5">Rates per SRO 1413(I)/2025</div>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {taxRates.map(t => (
                <div key={t.rate} className="p-4 rounded-xl border border-neutral-200 text-center bg-neutral-50">
                  <div className="font-display font-bold text-2xl mb-1" style={{ color: t.color }}>{t.rate}</div>
                  <div className="text-xs font-semibold text-neutral-700">{t.label}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Configure per-product tax rates in the Products section. These are the available GST rates in Pakistan.
            </p>
          </div>
        </div>

        {/* Account Info */}
        <div className="card animate-fade-up anim-delay-3">
          <div className="card-header">
            <div className="card-title">Account</div>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary font-display font-bold text-lg">
                {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-neutral-800">{user.firstName} {user.lastName}</div>
                <div className="text-sm text-neutral-500">{user.email}</div>
                <span className="badge badge-primary mt-1">{user.role || 'ADMIN'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
