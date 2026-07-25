import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'FBR Compliant Invoices',
    desc: 'Issue FBR-verified tax invoices with IRN, QR code, and full SRB/FBR V1.12 compliance. Zero manual errors.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Submission',
    desc: 'One-click FBR submission with automatic retry. Get your FBR invoice number and QR code in seconds.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Customer Management',
    desc: 'Maintain NTN/STRN-linked buyer records. Auto-apply registered vs unregistered tax rules.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
      </svg>
    ),
    title: 'Inventory Tracking',
    desc: 'Live stock counts with reorder alerts. HS codes, MRP for Third Schedule, service vs goods — all covered.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Reports & Analytics',
    desc: 'Monthly revenue charts, top customers, outstanding payments. Export CSV for your accountant.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Multi-User & Secure',
    desc: 'ADMIN, STAFF, ACCOUNTANT roles. JWT auth with auto-refresh. Your data is completely isolated.',
  },
];

const plans = [
  {
    name: 'Trial',
    price: 'Free',
    period: '',
    highlight: false,
    badge: null,
    perks: [
      '5 free invoices',
      'FBR submission',
      'Customer & product management',
      'PDF generation',
      'Email support',
    ],
    cta: 'Start Free',
    ctaAction: 'register',
  },
  {
    name: 'Professional',
    price: 'PKR 2,500',
    period: '/ month',
    highlight: true,
    badge: 'Most Popular',
    perks: [
      'Unlimited invoices',
      'FBR auto-retry',
      'Inventory with reorder alerts',
      'Customer portal',
      'Quotation → Invoice convert',
      'Revenue reports & CSV export',
      'Up to 5 users',
      'Priority support',
    ],
    cta: 'Sign Up Now',
    ctaAction: 'register',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    highlight: false,
    badge: null,
    perks: [
      'Everything in Professional',
      'Unlimited users',
      'Dedicated onboarding',
      'Custom integrations',
      'SLA-backed uptime',
      'WhatsApp support',
    ],
    cta: 'Contact Us',
    ctaAction: 'contact',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const handleCta = (action) => {
    if (action === 'register') navigate('/login');
    else if (action === 'contact') window.location.href = 'mailto:support@cheminvoice.com';
  };

  return (
    <div className="min-h-screen bg-white text-neutral-800" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: '#0C3D5E' }}>C</div>
            <span className="font-semibold text-neutral-900 text-lg">ChemInvoice Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-1.5"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: '#0C3D5E' }}
            >
              Sign Up Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            FBR V1.12 Certified · IRIS Compatible
          </div>
          <h1 className="text-5xl font-extrabold text-neutral-900 leading-tight mb-6" style={{ textWrap: 'balance' }}>
            FBR-Compliant Invoicing<br />
            <span style={{ color: '#0C3D5E' }}>Built for Pakistani Businesses</span>
          </h1>
          <p className="text-xl text-neutral-500 mb-10 leading-relaxed max-w-2xl mx-auto">
            Issue, submit, and track FBR tax invoices in seconds. Full sales tax compliance with automatic IRN generation, QR codes, and retry logic.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-base font-semibold text-white px-8 py-3.5 rounded-xl transition-all hover:opacity-90 shadow-lg"
              style={{ background: '#0C3D5E', boxShadow: '0 4px 20px rgba(12,61,94,0.35)' }}
            >
              Sign Up Now — It's Free
            </button>
            <span className="text-sm text-neutral-400">5 invoices free · No credit card needed</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6 bg-neutral-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-neutral-900 mb-3">Everything you need to stay FBR-compliant</h2>
            <p className="text-neutral-500">Purpose-built for manufacturers, traders, and service providers in Pakistan.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-100 hover:border-blue-100 hover:shadow-sm transition-all">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: '#EBF4FA', color: '#0C3D5E' }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="py-10 px-6 border-y border-neutral-100">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { val: '100%', label: 'FBR V1.12 Compliant' },
            { val: '< 2s', label: 'Invoice Generation' },
            { val: '3%', label: 'Further Tax Auto-Applied' },
            { val: 'SSL', label: 'Encrypted End-to-End' },
          ].map((s, i) => (
            <div key={i} className="min-w-24">
              <div className="text-2xl font-extrabold" style={{ color: '#0C3D5E', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-neutral-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-neutral-500">Start free, upgrade when you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-7 border transition-all ${
                  plan.highlight
                    ? 'border-transparent text-white shadow-xl'
                    : 'border-neutral-200 bg-white'
                }`}
                style={plan.highlight ? { background: '#0C3D5E', boxShadow: '0 8px 32px rgba(12,61,94,0.3)' } : {}}
              >
                {plan.badge && (
                  <div className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 bg-yellow-400 text-yellow-900">
                    {plan.badge}
                  </div>
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
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className={plan.highlight ? 'text-blue-100' : 'text-neutral-600'}>{p}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCta(plan.ctaAction)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight
                      ? 'bg-white text-[#0C3D5E] hover:bg-blue-50'
                      : 'border border-neutral-300 text-neutral-700 hover:border-[#0C3D5E] hover:text-[#0C3D5E]'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6" style={{ background: '#EBF4FA' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">Ready to go FBR-compliant?</h2>
          <p className="text-neutral-500 mb-8">Join businesses across Pakistan issuing verified invoices with ChemInvoice Pro.</p>
          <button
            onClick={() => navigate('/login')}
            className="text-base font-semibold text-white px-8 py-3.5 rounded-xl hover:opacity-90 transition-all"
            style={{ background: '#0C3D5E', boxShadow: '0 4px 20px rgba(12,61,94,0.3)' }}
          >
            Sign Up Now — Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-100 text-center text-sm text-neutral-400">
        © {new Date().getFullYear()} ChemInvoice Pro · FBR V1.12 · Built in Pakistan
      </footer>
    </div>
  );
}
