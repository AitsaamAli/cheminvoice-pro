import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

export default function CustomerPortalLogin() {
  const [step, setStep] = useState('email'); // email → code → dashboard
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await API.post('/customer-portal/send-code', { email });
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await API.post('/customer-portal/verify-code', {
        email,
        code
      });

      localStorage.setItem('customerToken', res.data.token);
      localStorage.setItem('customerEmail', email);
      navigate('/customer-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">ChemInvoice Pro</h1>
        <p className="text-center text-gray-600 mb-8">Customer Portal</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Enter your email to access invoices
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              We'll send you a 6-digit code via email. Check your spam folder if you don't see it.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Enter the 6-digit code sent to <span className="text-blue-600">{email}</span>
            </label>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              className="w-full mt-3 text-blue-600 hover:text-blue-800 font-semibold transition"
            >
              ← Use Different Email
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Code expires in 10 minutes
            </p>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            For registered company users, visit the <a href="/" className="text-blue-600 hover:underline">main dashboard</a>
          </p>
        </div>
      </div>
    </div>
  );
}
