'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const { login } = useAuth();

  // Login state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Bootstrap state
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [bPhone, setBPhone] = useState('');
  const [bName, setBName] = useState('');
  const [bPassword, setBPassword] = useState('');
  const [bConfirm, setBConfirm] = useState('');
  const [bError, setBError] = useState('');
  const [bSuccess, setBSuccess] = useState('');
  const [bLoading, setBLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setLoginError('Cannot reach the server. Make sure the backend is running on port 3001.');
      } else {
        setLoginError(msg);
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setBError('');
    setBSuccess('');
    if (bPassword !== bConfirm) {
      setBError('Passwords do not match.');
      return;
    }
    if (bPassword.length < 6) {
      setBError('Password must be at least 6 characters.');
      return;
    }
    setBLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bPhone.trim(), name: bName.trim(), password: bPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Bootstrap failed');
      setBSuccess(`Admin account created for ${data.phone}. You can now sign in.`);
      setPhone(bPhone.trim());
      setShowBootstrap(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bootstrap failed';
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setBError('Cannot reach the server. Make sure the backend is running on port 3001.');
      } else {
        setBError(msg);
      }
    } finally {
      setBLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-green-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-2xl font-bold">SR</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Sitroom</h1>
            <p className="text-sm text-gray-500 mt-1">Election Situation Room</p>
          </div>
        </div>

        {/* Success banner from bootstrap */}
        {bSuccess && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {bSuccess}
          </div>
        )}

        {!showBootstrap ? (
          <>
            {/* Login card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in</h2>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>

                {loginError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {loginLoading && <Spinner size="sm" className="text-white" />}
                  {loginLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>

            <button
              onClick={() => { setShowBootstrap(true); setBSuccess(''); }}
              className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              First time? Set up the admin account →
            </button>
          </>
        ) : (
          <>
            {/* Bootstrap card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900">First-time setup</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Creates the first admin account. This endpoint is automatically disabled once any user exists.
              </p>

              <form onSubmit={handleBootstrap} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    required
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    placeholder="e.g. Chukwuemeka Eze"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={bPhone}
                    onChange={(e) => setBPhone(e.target.value)}
                    placeholder="08012345678"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={bPassword}
                    onChange={(e) => setBPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    required
                    value={bConfirm}
                    onChange={(e) => setBConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className={inputClass}
                  />
                </div>

                {bError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {bError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60 transition-colors"
                >
                  {bLoading && <Spinner size="sm" className="text-white" />}
                  {bLoading ? 'Creating account…' : 'Create admin account'}
                </button>
              </form>
            </div>

            <button
              onClick={() => setShowBootstrap(false)}
              className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
