import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Islamabad', 'AJK', 'Gilgit-Baltistan'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const IcAlert = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const AtomLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

const features = [
  { icon: '🏛️', title: 'FBR IRIS Compliant', desc: 'SRO 1413(I)/2025 · All 28 scenarios · Auto tax' },
  { icon: '💰', title: 'Further Tax Automation', desc: 'SN002 — 3% auto-added for unregistered buyers' },
  { icon: '📊', title: 'Monthly Return Export', desc: 'Breakdown by tax rate · CSV + PDF ready' },
  { icon: '🔐', title: 'Enterprise Security', desc: 'JWT auth · IDOR protection · Audit logs' },
];

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [pendingError, setPendingError] = useState(false);
  const navigate = useNavigate();

  const [login, setLogin] = useState({ email: '', password: '' });
  const [reg, setReg] = useState({
    email: '', password: '', firstName: '', lastName: '',
    businessName: '', ntn: '', strn: '', address: '', province: 'Punjab', city: '',
  });

  const setL = (k) => (e) => setLogin(p => ({ ...p, [k]: e.target.value }));
  const setR = (k) => (e) => setReg(p => ({ ...p, [k]: typeof e === 'string' ? e : e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setPendingError(false);
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, login);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg.startsWith('PENDING_APPROVAL:')) {
        setPendingError(true);
      } else {
        setError(msg || 'Login failed. Please check your credentials.');
      }
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, reg);
      if (data.pending) {
        setRegistered(true);
      }
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.details?.[0]?.message || d?.error || 'Registration failed';
      setError(msg);
    } finally { setLoading(false); }
  };

  const switchTab = (t) => { setTab(t); setError(''); };

  return (
    <div className="min-h-screen flex">
      {/* ── Brand Panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-shrink-0 p-12 relative overflow-hidden"
        style={{ width: 460, background: '#0C3D5E' }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Decorative glow */}
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(240,165,0,0.12) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-primary">
              <span className="w-6 h-6"><AtomLogo /></span>
            </div>
            <div>
              <div className="text-white font-display font-bold text-xl leading-none">Nizaam.com</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>FBR Digital Invoicing</div>
            </div>
          </div>

          <h2 className="text-white font-display font-bold text-3xl leading-snug mb-4 text-balance">
            Pakistan ka Smart FBR Invoicing Platform
          </h2>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Har business ke liye — manufacturer ho, trader ho ya service provider. FBR compliance, tax invoices, aur customer portal ek jagah par.
          </p>

          <div className="space-y-4">
            {features.map(f => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  {f.icon}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm leading-none mb-1">{f.title}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer badge */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <span className="w-2 h-2 bg-green-400 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>All systems operational</span>
          </div>
          <div className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.22)' }}>
            © 2026 Nizaam.com · Pakistan · FBR Digital Invoicing
          </div>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-neutral-50">
        <div className="w-full" style={{ maxWidth: 420 }}>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-accent">
              <span className="w-4 h-4"><AtomLogo /></span>
            </div>
            <span className="font-display font-bold text-neutral-800">Nizaam Invoicing Softwares</span>
          </div>

          {/* Registration submitted — pending approval screen */}
          {registered ? (
            <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 4px 24px rgba(12,61,94,0.1)', border: '1px solid #DDE3EC' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#D1FAE5' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Registration Submitted!</h2>
              <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                Aap ka account review ke liye bhej diya gaya hai.<br />
                Hum jald hi approve karein ge aur aap ko email milegi.
              </p>
              <div className="rounded-xl p-4 text-left" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <p className="text-xs text-blue-700 font-semibold mb-1">Next Steps:</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>✓ Hum aap ki details verify karein ge</li>
                  <li>✓ Approval ke baad email aayegi</li>
                  <li>✓ Email mil ne ke baad yahan login karein</li>
                </ul>
              </div>
              <button
                onClick={() => { setRegistered(false); setTab('login'); }}
                className="mt-5 text-sm text-neutral-500 hover:text-neutral-800 underline"
              >
                Login page pe jayen
              </button>
            </div>
          ) : (

          <div className="bg-white rounded-2xl p-7" style={{ boxShadow: '0 4px 24px rgba(12,61,94,0.1)', border: '1px solid #DDE3EC' }}>
            {/* Tab toggle */}
            <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6">
              {['login', 'register'].map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    tab === t
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Pending approval error */}
            {pendingError && (
              <div className="rounded-xl p-4 mb-5 flex gap-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Account pending approval</p>
                  <p className="text-xs text-amber-700 mt-0.5">Aap ka account abhi review mein hai. Approval ke baad email aayegi.</p>
                </div>
              </div>
            )}
            {/* Error */}
            {error && (
              <div className="alert alert-error mb-5">
                <IcAlert /><span>{error}</span>
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="form-group">
                  <label className="form-label req">Email Address</label>
                  <input type="email" required className="form-input" placeholder="you@company.com"
                    value={login.email} onChange={setL('email')} />
                </div>
                <div className="form-group">
                  <label className="form-label req">Password</label>
                  <input type="password" required className="form-input" placeholder="Your password"
                    value={login.password} onChange={setL('password')} />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-1">
                  {loading ? <><Spinner /> Signing in…</> : 'Sign In to Dashboard'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label req">First Name</label>
                    <input type="text" required className="form-input" placeholder="Ali"
                      value={reg.firstName} onChange={setR('firstName')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Last Name</label>
                    <input type="text" required className="form-input" placeholder="Ahmed"
                      value={reg.lastName} onChange={setR('lastName')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label req">Email Address</label>
                  <input type="email" required className="form-input" placeholder="you@company.com"
                    value={reg.email} onChange={setR('email')} />
                </div>
                <div className="form-group">
                  <label className="form-label req">Password</label>
                  <input type="password" required minLength={8} className="form-input" placeholder="Min. 8 characters"
                    value={reg.password} onChange={setR('password')} />
                </div>
                <div className="form-group">
                  <label className="form-label req">Business Name</label>
                  <input type="text" required className="form-input" placeholder="Your Company Pvt. Ltd."
                    value={reg.businessName} onChange={setR('businessName')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">NTN</label>
                    <input type="text" className="form-input" placeholder="1234567" maxLength={7}
                      value={reg.ntn} onChange={e => setReg(p => ({ ...p, ntn: e.target.value.replace(/\D/g,'') }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">STRN</label>
                    <input type="text" className="form-input" placeholder="1234567890123" maxLength={13}
                      value={reg.strn} onChange={e => setReg(p => ({ ...p, strn: e.target.value.replace(/\D/g,'') }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" placeholder="Street address, Area"
                    value={reg.address} onChange={setR('address')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Province</label>
                    <select className="form-select" value={reg.province} onChange={setR('province')}>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-input" placeholder="Lahore"
                      value={reg.city} onChange={setR('city')} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-accent btn-lg w-full mt-1">
                  {loading ? <><Spinner /> Submitting…</> : 'Submit Registration Request'}
                </button>
                <p className="text-xs text-neutral-400 text-center mt-2">After registration, our team will review and approve your account.</p>
              </form>
            )}

            <p className="text-center text-xs text-neutral-400 mt-5">
              🔒 256-bit encrypted · FBR licensed · Pakistan
            </p>
          </div>

          )} {/* end registered conditional */}
        </div>
      </div>
    </div>
  );
}
