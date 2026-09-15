import React, { useState } from 'react';
import { LogIn, KeyRound, Shield, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { FirstRunWizard } from './FirstRunWizard.js';
import { PirateShipIcon } from './PirateShipIcon';

export const LoginView: React.FC = () => {
  const { login, systemName, needsSetup, initialized } = useAuth();
  const { success, error } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forceShowSetup, setForceShowSetup] = useState(false);

  // If system needs setup or user clicked to launch setup
  if (needsSetup || initialized === false || forceShowSetup) {
    return <FirstRunWizard onCompleted={() => window.location.reload()} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      error('Missing Credentials', 'Please enter both username and password');
      return;
    }

    setSubmitting(true);
    const res = await login(username.trim(), password);
    setSubmitting(false);

    if (res.success) {
      success('Authenticated', `Welcome back, ${username}!`);
    } else {
      error('Login Failed', res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#070a10] flex flex-col items-center justify-center p-4 selection:bg-cyan-500/20 selection:text-cyan-200">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <PirateShipIcon className="w-16 h-16 rounded-2xl shadow-2xl shadow-cyan-950/80 mb-3" withBadge />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            Media Stack Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {systemName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to access your media stack</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/60">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Prompt to run setup if no admin yet */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              id="btn-goto-setup"
              type="button"
              onClick={() => setForceShowSetup(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>First-time setup? Create Admin Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
