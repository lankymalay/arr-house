import React, { useState } from 'react';
import { LogIn, Shield, UserPlus } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0c0e12] flex flex-col items-center justify-center p-4 text-[#e3e6ed]">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <PirateShipIcon className="w-16 h-16 rounded-2xl shadow-xl mb-4" withBadge />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            Media Stack Hub
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            {systemName}
          </h1>
          <p className="mt-1.5 text-xs text-[#9aa0a6]">Sign in to access your media automation stack</p>
        </div>

        <div className="sonos-card p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-[#1a1e28] border border-white/[0.08] rounded-full text-sm text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#1a1e28] border border-white/[0.08] rounded-full text-sm text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-full shadow transition-all disabled:opacity-50 cursor-pointer pixel-pill"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Prompt to run setup if no admin yet */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <button
              id="btn-goto-setup"
              type="button"
              onClick={() => setForceShowSetup(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#a8c7fa]" />
              <span>First-time setup? Initialize Stack</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
