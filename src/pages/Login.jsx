import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI } from '@/api/backendClient';

export default function Login() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const saveSecret = (value, persist) => {
    sessionStorage.setItem('shared_secret', value);
    if (persist) {
      localStorage.setItem('shared_secret', value);
      localStorage.setItem('secret_phrase', value);
    } else {
      localStorage.removeItem('shared_secret');
      localStorage.removeItem('secret_phrase');
    }
  };

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
    saveSecret(trimmed, remember);

    try {
      // Quick check that the secret works against the API
      await portfolioAPI.getDashboard();
      setStatus('Connected. Redirecting...');
      // Full page reload to re-initialize AuthContext with the new secret
      setTimeout(() => window.location.href = '/', 500);
    } catch (err) {
      // Keep the stored secret but surface the error
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
            Use the shared phrase to unlock the portfolio. It will be sent as a secure header to the API.
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

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
            />
            Remember on this device
          </label>

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
