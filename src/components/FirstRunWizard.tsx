import React, { useState } from 'react';
import { ShieldCheck, Server, ArrowRight, Check, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { PirateShipIcon } from './PirateShipIcon';

interface FirstRunWizardProps {
  onCompleted?: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onCompleted }) => {
  const { setupAdmin } = useAuth();
  const { success, error } = useToast();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [systemName, setSystemName] = useState('Arr House');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      error('Validation Error', 'Please choose an admin username');
      return;
    }
    if (password.length < 6) {
      error('Password Too Short', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      error('Passwords Do Not Match', 'Please ensure both password fields match');
      return;
    }

    setSubmitting(true);
    const res = await setupAdmin(username.trim(), password, systemName.trim());
    setSubmitting(false);

    if (res.success) {
      success('System Initialized', 'Welcome to Arr House! Your administrator profile is ready.');
      onCompleted?.();
    } else {
      error('Setup Failed', res.error || 'Failed to initialize system');
    }
  };

  return (
    <div className="min-h-screen bg-[#070a10] flex flex-col items-center justify-center p-4 selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <PirateShipIcon className="w-16 h-16 rounded-2xl shadow-2xl shadow-cyan-950/80 mb-3" withBadge />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Server className="w-3.5 h-3.5" />
            Media Stack Ready
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl flex items-center justify-center gap-2.5">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
              Arr House
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Unified control center for your personal *arr media stack: Sonarr, Radarr, Lidarr, and Prowlarr.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/60">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-800/80 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">First-Run Setup Wizard</h2>
              <p className="text-xs text-slate-400">
                Create the primary administrator account. Service URLs, ports, and API keys can be configured anytime in Settings.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Dashboard Name
              </label>
              <input
                id="setup-system-name"
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="Arr House"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Username
              </label>
              <input
                id="setup-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    id="setup-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="setup-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            <button
              id="setup-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Initializing Arr House...</span>
              ) : (
                <>
                  <span>Complete Setup & Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
