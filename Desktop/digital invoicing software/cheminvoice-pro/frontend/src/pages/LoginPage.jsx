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
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(0 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>
  </svg>
);

const features = [
  { emoji: '🏛️', title: 'FBR IRIS Compliant', desc: 'SRO 1413(I)/2025 · Auto sales tax' },
  { emoji: '🔐', title: 'Enterprise Security', desc: 'JWT auth · 256-bit encryption' },
  { emoji: '📊', title: 'Real-time Reporting', desc: 'Tax summaries · Export ready' },
  { emoji: '📧', title: 'Customer Portal', desc: 'Email invoices · Online access' },
];

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, login);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, reg);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
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
              <div className="text-white font-display font-bold text-xl leading-none">ChemInvoice Pro</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>FBR-Compliant Invoicing</div>
            </div>
          </div>

          <h2 className="text-white font-display font-bold text-3xl leading-snug mb-4 text-balance">
            Professional invoicing for Pakistan's chemical industry
          </h2>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Automate FBR compliance, generate tax invoices in seconds, and give your customers a professional portal experience.
          </p>

          <div className="space-y-4">
            {features.map(f => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  {f.emoji}
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
            © 2025 ChemInvoice Pro · Pakistan · FBR Licensed
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
            <span className="font-display font-bold text-neutral-800">ChemInvoice Pro</span>
          </div>

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
                  {loading ? <><Spinner /> Creating account…</> : 'Create Account & Start'}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-neutral-400 mt-5">
              🔒 256-bit encrypted · FBR licensed · Pakistan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
