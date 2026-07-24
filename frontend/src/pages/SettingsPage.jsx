import { useState, useEffect } from 'react';
import { API } from '../App';
import Layout from '../components/Layout';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'AJK', 'Gilgit-Baltistan'];

const BUSINESS_TYPES = [
  { value: 'MANUFACTURER',    label: '🏭 Manufacturer',           desc: 'Production & assembly' },
  { value: 'TRADER',          label: '🛒 Trader / Distributor',   desc: 'Buy & sell goods' },
  { value: 'SERVICE_PROVIDER',label: '💼 Service Provider',       desc: 'Consulting, agency, etc.' },
  { value: 'RETAILER',        label: '🏪 Retailer / Shop',        desc: 'Walk-in customers' },
  { value: 'RESTAURANT',      label: '🍽️ Restaurant / Food',     desc: 'Food & beverage' },
  { value: 'MEDICAL',         label: '💊 Medical / Pharmacy',     desc: 'Healthcare products' },
  { value: 'CONSTRUCTION',    label: '🏗️ Construction',          desc: 'Civil & infrastructure' },
  { value: 'IT_FREELANCER',   label: '💻 IT / Freelancer',        desc: 'Software, design, digital' },
  { value: 'AGRICULTURE',     label: '🌾 Agriculture',            desc: 'Farm & agri products' },
  { value: 'AUTO_WORKSHOP',   label: '🚗 Auto / Workshop',        desc: 'Vehicles & repairs' },
  { value: 'IMPORT_EXPORT',   label: '📦 Import / Export',        desc: 'International trade' },
  { value: 'EDUCATION',       label: '🏫 Education / NGO',        desc: 'Training & non-profit' },
];

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const taxRates = [
  { rate: '0%',  label: 'Zero-Rated',  desc: 'Exempt goods',     color: '#5B6B8A' },
  { rate: '5%',  label: 'Reduced',     desc: '[VERIFY rate]',    color: '#2563EB' },
  { rate: '10%', label: 'Reduced',     desc: '[VERIFY rate]',    color: '#7C3AED' },
  { rate: '18%', label: 'Standard GST',desc: 'Default rate',     color: '#D97706' },
];

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [companyId, setCompanyId] = useState(user.companyId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fbrMode, setFbrMode] = useState('sandbox');
  const [company, setCompany] = useState({
    businessName: '',
    ntn: '',
    strn: '',
    address: '',
    province: 'Punjab',
    city: '',
    contactPhone: '',
    contactEmail: '',
    businessType: 'MANUFACTURER',
    logoBase64: '',
  });
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    API.get('/auth/me').then(({ data }) => {
      const c = data.company || {};
      setCompanyId(data.companyId || c.id || user.companyId || '');
      setCompany({
        businessName: c.businessName || '',
        ntn: c.ntn || '',
        strn: c.strn || '',
        address: c.address || '',
        province: c.province || 'Punjab',
        city: c.city || '',
        contactPhone: c.contactPhone || '',
        contactEmail: c.contactEmail || '',
        businessType: c.businessType || 'MANUFACTURER',
        logoBase64: c.logoBase64 || '',
      });
      if (c.logoBase64) setLogoPreview(c.logoBase64);
      setFbrMode(c.fbrMode || 'sandbox');
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setCompany(c => ({ ...c, [k]: e.target.value }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { setError('Logo 1.5MB se chhota hona chahiye'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target.result;
      setLogoPreview(b64);
      setCompany(c => ({ ...c, logoBase64: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview('');
    setCompany(c => ({ ...c, logoBase64: '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false); setError('');
    try {
      await API.put(`/companies/${companyId}`, company);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Save fail ho gayi — dobara try karein');
    } finally {
      setSaving(false);
    }
  };

  const ntnOk  = /^[0-9]{7}$/.test(company.ntn);
  const strnOk = /^[0-9]{13}$/.test(company.strn);

  if (loading) {
    return (
      <Layout title="Settings">
        <div className="max-w-3xl space-y-5">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <div className="max-w-3xl space-y-5">

        {/* Company Info */}
        <div className="card animate-fade-up">
          <div className="card-header">
            <div>
              <div className="card-title">Company Information</div>
              <div className="text-xs text-neutral-400 mt-0.5">FBR-registered business details</div>
            </div>
            <div className="flex gap-2">
              {ntnOk  && <span className="badge badge-success">NTN ✓</span>}
              {strnOk && <span className="badge badge-success">STRN ✓</span>}
              {(!ntnOk || !strnOk) && <span className="badge badge-warning">FBR incomplete</span>}
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSave} className="space-y-4">
              {/* Business Type */}
              <div className="form-group">
                <label className="form-label req">Business Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {BUSINESS_TYPES.map(bt => (
                    <label
                      key={bt.value}
                      className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                        company.businessType === bt.value
                          ? 'border-primary bg-blue-50 ring-1 ring-primary'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="radio" name="businessType" value={bt.value}
                        checked={company.businessType === bt.value}
                        onChange={set('businessType')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-semibold text-neutral-800">{bt.label}</div>
                        <div className="text-xs text-neutral-400">{bt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label req">Business Name</label>
                <input type="text" className="form-input" value={company.businessName} onChange={set('businessName')} placeholder="Registered business name" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">NTN <span className="text-xs text-neutral-400">(7 digits)</span></label>
                  <input
                    type="text" className={`form-input font-numeric ${company.ntn && !ntnOk ? 'border-red-400' : ''}`}
                    value={company.ntn} onChange={set('ntn')} placeholder="1234567" maxLength={7}
                  />
                  {company.ntn && !ntnOk && <p className="text-xs text-red-500 mt-1">NTN 7 digits hona chahiye</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">STRN <span className="text-xs text-neutral-400">(13 digits)</span></label>
                  <input
                    type="text" className={`form-input font-numeric ${company.strn && !strnOk ? 'border-red-400' : ''}`}
                    value={company.strn} onChange={set('strn')} placeholder="1234567890123" maxLength={13}
                  />
                  {company.strn && !strnOk && <p className="text-xs text-red-500 mt-1">STRN 13 digits hona chahiye</p>}
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

              {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <><Spinner /> Saving…</> : 'Save Changes'}
                </button>
                {saved && <span className="badge badge-success">✓ Saved</span>}
              </div>
            </form>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="card animate-fade-up anim-delay-1">
          <div className="card-header">
            <div>
              <div className="card-title">Company Logo</div>
              <div className="text-xs text-neutral-400 mt-0.5">PDF invoices mein appear hoga — PNG/JPG, max 1.5MB</div>
            </div>
            {logoPreview && <span className="badge badge-success">Logo set ✓</span>}
          </div>
          <div className="card-body">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center bg-neutral-50 overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                  : <span className="text-xs text-neutral-400 text-center px-2">No logo</span>}
              </div>
              <div className="space-y-2">
                <label className="btn btn-secondary btn-sm cursor-pointer">
                  {logoPreview ? '↑ Change Logo' : '↑ Upload Logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoPreview && (
                  <button type="button" onClick={removeLogo} className="btn btn-ghost btn-sm text-danger ml-2">
                    × Remove
                  </button>
                )}
                <p className="text-xs text-neutral-400">Save Changes button se save hoga. White background automatically remove ho jaega PDF mein.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FBR Settings */}
        <div className="card animate-fade-up anim-delay-2">
          <div className="card-header">
            <div>
              <div className="card-title">FBR Integration</div>
              <div className="text-xs text-neutral-400 mt-0.5">IRIS PRAL API configuration</div>
            </div>
            <span className={`badge ${fbrMode === 'sandbox' ? 'badge-warning' : 'badge-success'}`}>
              {fbrMode === 'sandbox' ? 'Sandbox Mode' : 'Production'}
            </span>
          </div>
          <div className="card-body space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${fbrMode === 'sandbox' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${fbrMode === 'sandbox' ? 'text-amber-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                {fbrMode === 'sandbox' ? (
                  <>
                    <div className="text-sm font-semibold text-amber-800">Sandbox Mode Active</div>
                    <div className="text-xs text-amber-700 mt-1">
                      Invoices FBR ke test environment mein jaa rahi hain. Jab IRIS portal par sab scenarios pass ho jayein tab production mode use karein.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-green-800">Production Mode Active</div>
                    <div className="text-xs text-green-700 mt-1">
                      Invoices live FBR system mein submit ho rahi hain. Real IRN numbers generate ho rahay hain.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <svg className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <div className="text-sm">
                <div className="font-semibold text-neutral-700">FBR Token</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Token backend server pe <code className="bg-neutral-200 px-1 rounded">FBR_SECURITY_TOKEN</code> environment variable mein configure hai. Security ke liye yahan show nahi kiya jata.
                </div>
              </div>
            </div>

            <div className="text-xs text-neutral-400 border-t border-neutral-100 pt-4">
              Mode change karne ke liye: Vercel dashboard → Environment Variables → <code className="bg-neutral-100 px-1 rounded">FBR_MODE</code> = <code className="bg-neutral-100 px-1 rounded">production</code>
            </div>
          </div>
        </div>

        {/* Tax Rates Reference */}
        <div className="card animate-fade-up anim-delay-3">
          <div className="card-header">
            <div>
              <div className="card-title">Pakistan GST Rates</div>
              <div className="text-xs text-neutral-400 mt-0.5">Per SRO 1413(I)/2025 — [VERIFY current SRO with tax consultant]</div>
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
              Products section mein per-product tax rate set karein. 5% aur 10% rates FBR ki applicable SRO se confirm karein.
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
                {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'}
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
