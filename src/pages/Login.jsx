import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI, authAPI } from '@/api/backendClient';

export default function Login() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    const trimmed = secret.trim();
    if (!trimmed) {
      setError('Please enter the secret phrase.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authAPI.setSharedSecret(trimmed);
      // Quick check that the secret works against the API
      await portfolioAPI.getDashboard();
      setStatus('Connected. Redirecting...');
      // Full page reload to re-initialize AuthContext with the new cookie
      setTimeout(() => window.location.href = '/', 500);
    } catch (err) {
      setError(err.message || 'Could not verify access. Please check the secret phrase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white shadow-sm border border-slate-200 rounded-2xl p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Family access</p>
          <h1 className="text-2xl font-semibold text-slate-900">Enter secret phrase</h1>
          <p className="text-sm text-slate-500">
            Use the shared phrase to unlock the portfolio. It will be stored in a secure httpOnly cookie.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Secret phrase</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Enter shared secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {status && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {status}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Connecting...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
