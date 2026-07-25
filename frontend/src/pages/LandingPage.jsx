import { useNavigate } from 'react-router-dom';

const services = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
    title: 'FBR Invoicing Software',
    urdu: 'ایف بی آر انوائسنگ سافٹ ویئر',
    desc: 'FBR V1.12 compliant tax invoices with IRN, QR code, and automatic 3% further tax. Real-time submission and retry.',
    color: '#0C3D5E',
    bg: '#EBF4FA',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h2M9 7h6m0 0V5a2 2 0 012-2h2a2 2 0 012 2v3m0 0H9"/>
      </svg>
    ),
    title: 'Point of Sale (POS)',
    urdu: 'پوائنٹ آف سیل سسٹم',
    desc: 'Fast billing at the counter. Barcode scanning, cash & card payments, receipt printing, daily sales reports.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
    ),
    title: 'ERP System',
    urdu: 'ای آر پی سسٹم',
    desc: 'Full business management — accounts, inventory, HR, payroll, purchases, and sales in one integrated platform.',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7"/>
      </svg>
    ),
    title: 'Inventory Management',
    urdu: 'اسٹاک مینجمنٹ',
    desc: 'Real-time stock tracking, reorder alerts, HS codes, MRP management, and multi-warehouse support.',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: 'Customer & Ledger',
    urdu: 'کسٹمر اور لیجر',
    desc: 'Complete customer ledger with outstanding balance, payment history, and WhatsApp invoice sharing.',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
    title: 'Reports & Analytics',
    urdu: 'رپورٹس اور انالیٹکس',
    desc: 'Monthly revenue, tax summaries, top customers, outstanding receivables. CSV export for your accountant.',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
];

const businessTypes = [
  'موبائل', 'مارکس', 'جنرل سٹور', 'کیش اینڈ کیری',
  'فاسٹ فوڈ', 'سینٹری اینڈ ہارڈویئر', 'شوز', 'گارمنٹس اینڈ کلاتھ',
  'گفٹ اینڈ ڈالر شاپ', 'بک اینڈ سٹیشنری', 'بیکری اینڈ سویٹس', 'فارمیسی',
  'ڈینٹری بیوٹر', 'الیکٹرونکس اینڈ الیکٹرک', 'فارمہ ڈسٹری بیوٹر', 'سینٹری اینڈ ہارڈویئر',
];

const plans = [
  {
    name: 'Trial',
    price: 'Free',
    period: '',
    highlight: false,
    badge: null,
    perks: ['5 free invoices', 'FBR submission', 'Customer management', 'PDF generation', 'Support'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: 'PKR 2,500',
    period: '/ month',
    highlight: true,
    badge: 'Most Popular',
    perks: ['Unlimited invoices', 'FBR auto-retry', 'Full inventory system', 'Customer portal', 'Quotations', 'Reports & CSV export', '5 users', 'Priority support'],
    cta: 'Get Started',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    highlight: false,
    badge: null,
    perks: ['Everything in Professional', 'POS integration', 'ERP modules', 'Unlimited users', 'Dedicated onboarding', 'WhatsApp support', 'SLA uptime'],
    cta: 'Contact Us',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: '#0C3D5E' }}>N</div>
            <div>
              <div className="font-bold text-neutral-900 text-sm leading-none">Nizaam Invoicing Softwares</div>
              <div className="text-xs text-neutral-400 mt-0.5">نظام انوائسنگ سافٹ ویئرز</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#services" className="hidden sm:block text-sm text-neutral-600 hover:text-neutral-900 transition-colors">Services</a>
            <a href="#pricing" className="hidden sm:block text-sm text-neutral-600 hover:text-neutral-900 transition-colors">Pricing</a>
            <button onClick={() => navigate('/login')}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-1.5">Login</button>
            <button onClick={() => navigate('/login')}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all"
              style={{ background: '#0C3D5E' }}>Sign Up Free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border"
            style={{ background: '#EBF4FA', color: '#0C3D5E', borderColor: '#BAD8EC' }}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            FBR V1.12 Certified · IRIS Compatible · Pakistan
          </div>
          <h1 className="text-5xl font-extrabold text-neutral-900 leading-tight mb-4" style={{ textWrap: 'balance' }}>
            Pakistan ka #1 Business<br />
            <span style={{ color: '#0C3D5E' }}>Management Software</span>
          </h1>
          <p className="text-lg text-neutral-500 mb-2" style={{ fontFamily: 'system-ui', direction: 'rtl' }}>
            ہر قسم کے بزنس کے لیے — انوائسنگ، پی او ایس، ای آر پی
          </p>
          <p className="text-base text-neutral-400 mb-10">Invoicing · POS · ERP · Inventory · Customer Portal</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-base font-bold text-white px-8 py-3.5 rounded-xl hover:opacity-90 transition-all"
              style={{ background: '#0C3D5E', boxShadow: '0 4px 20px rgba(12,61,94,0.35)' }}>
              Sign Up Now — Free Trial
            </button>
            <span className="text-sm text-neutral-400">No credit card · 5 free invoices · Admin approval</span>
          </div>
        </div>
      </section>

      {/* Business Types — Urdu grid like the ad */}
      <section className="py-10 px-6" style={{ background: '#F0F7FC' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-semibold text-neutral-500 mb-5 uppercase tracking-widest">Best For · ہر بزنس کے لیے بہترین</p>
          <div className="grid grid-cols-4 gap-2">
            {businessTypes.map((b, i) => {
              const colors = ['#FFE066','#B5EAD7','#87CEEB','#FFB7B2','#C7F2A4','#FFDAC1','#E2B4FF','#B5D5FF'];
              return (
                <div key={i} className="rounded-xl px-3 py-2.5 text-center font-bold text-sm"
                  style={{ background: colors[i % colors.length], color: '#1a1a2e', fontFamily: 'system-ui', direction: 'rtl' }}>
                  {b}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Our Services</h2>
            <p className="text-neutral-500">Complete business management solutions for Pakistani businesses</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-100 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                  style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <h3 className="font-bold text-neutral-900 mb-0.5">{s.title}</h3>
                <p className="text-xs text-neutral-400 mb-2" style={{ direction: 'rtl', fontFamily: 'system-ui' }}>{s.urdu}</p>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FBR Compliance strip */}
      <section className="py-12 px-6 border-y border-neutral-100">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { val: 'FBR V1.12', label: 'Certified Compliant' },
            { val: '28', label: 'Invoice Scenarios Covered' },
            { val: '3%', label: 'Further Tax Auto-Applied' },
            { val: '< 2s', label: 'Invoice Generation Time' },
            { val: 'SSL', label: 'Encrypted & Secure' },
          ].map((s, i) => (
            <div key={i} className="min-w-20">
              <div className="text-2xl font-extrabold" style={{ color: '#0C3D5E', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">How It Works</h2>
            <p className="text-neutral-500">Shuru karna bilkul aasaan hai</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Sign Up', desc: 'Form bharo — business name, email, NTN. Bilkul free.' },
              { step: '2', title: 'Admin Approval', desc: 'Hum aap ka account verify karein ge. 24 ghante mein email aayegi.' },
              { step: '3', title: 'Start Invoicing', desc: 'Login karein aur FBR-compliant invoices banana shuru karein.' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-100 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4"
                  style={{ background: '#0C3D5E' }}>{s.step}</div>
                <h3 className="font-bold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Simple Pricing</h2>
            <p className="text-neutral-500">Free se shuru karein, grow karte jao</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <div key={i}
                className={`rounded-2xl p-7 border transition-all ${plan.highlight ? 'border-transparent text-white' : 'border-neutral-200 bg-white'}`}
                style={plan.highlight ? { background: '#0C3D5E', boxShadow: '0 8px 32px rgba(12,61,94,0.3)' } : {}}>
                {plan.badge && (
                  <div className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-4 bg-yellow-400 text-yellow-900">{plan.badge}</div>
                )}
                <div className="text-sm font-medium mb-1 opacity-70">{plan.name}</div>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && <span className="text-sm opacity-60 mb-1">{plan.period}</span>}
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.perks.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                        style={{ color: plan.highlight ? '#7EC8E3' : '#0C3D5E' }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className={plan.highlight ? 'text-blue-100' : 'text-neutral-600'}>{p}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight ? 'bg-white text-[#0C3D5E] hover:bg-blue-50' : 'border border-neutral-300 text-neutral-700 hover:border-[#0C3D5E] hover:text-[#0C3D5E]'
                  }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6" style={{ background: '#0C3D5E' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Aaj hi shuru karein</h2>
          <p className="text-blue-200 mb-8">Pakistan ke hazaaron businesses apna account manage kar rahe hain Nizaam ke saath.</p>
          <button onClick={() => navigate('/login')}
            className="text-base font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all"
            style={{ background: '#F0A500', color: '#0C3D5E' }}>
            Sign Up Now — Bilkul Free
          </button>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 px-6 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: '#0C3D5E' }}>N</div>
            <span className="font-semibold text-neutral-800">Nizaam Invoicing Softwares</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 justify-center">
            <a href="https://wa.me/923000000000" className="hover:text-neutral-800 transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Support
            </a>
            <a href="mailto:info@nizaam.com" className="hover:text-neutral-800 transition-colors">info@nizaam.com</a>
          </div>
          <div className="text-xs text-neutral-400">© {new Date().getFullYear()} nizaam.com · Pakistan</div>
        </div>
      </section>
    </div>
  );
}
