import React, { useState, useEffect } from 'react';
import { 
  Server, 
  RotateCw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  FolderTree, 
  Users, 
  Trash2, 
  Download,
  Sun,
  Moon,
  HardDrive,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import type { ServiceConfig, ServiceId, User, UserRole } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { getBuildInfo } from '../version.js';

interface SettingsViewProps {
  onRefreshStack: () => void;
  user?: User | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshStack, user: propUser }) => {
  const { success, error } = useToast();
  const { user: authUser, isAdmin: authIsAdmin } = useAuth();
  const user = propUser || authUser;
  const isAdmin = user ? user.role === 'admin' : authIsAdmin;

  const [activeTab, setActiveTab] = useState<'services' | 'users' | 'deployment'>('services');
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>('sonarr');
  const [services, setServices] = useState<Record<ServiceId, ServiceConfig>>({} as any);
  const [systemName, setSystemName] = useState('Arr House');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; version?: string; errorMessage?: string }>>({});
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('standard');
  const [creatingUser, setCreatingUser] = useState(false);

  // Profiles and root folders for selected service
  const [serviceProfiles, setServiceProfiles] = useState<{ qualityProfiles: any[]; rootFolders: any[] }>({
    qualityProfiles: [],
    rootFolders: []
  });

  // Fetch settings from server
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || {});
        setSystemName('Arr House');
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  // Fetch users if admin
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  // Fetch profiles for selected service
  const fetchProfiles = async (svcId: ServiceId) => {
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch(`/api/settings/profiles/${svcId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setServiceProfiles(data);
      }
    } catch (e) {
      console.error('Failed to fetch profiles', e);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedServiceId) {
      fetchProfiles(selectedServiceId);
    }
  }, [selectedServiceId]);

  const handleUpdateServiceField = (field: keyof ServiceConfig, value: any) => {
    if (!services[selectedServiceId]) return;
    setServices(prev => ({
      ...prev,
      [selectedServiceId]: {
        ...prev[selectedServiceId],
        [field]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) {
      error('Access Denied', 'Only administrators can modify service configurations.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          services,
          systemName: 'Arr House'
        })
      });

      if (res.ok) {
        success('Settings Saved', 'Connection profiles and stack settings updated');
        onRefreshStack();
      } else {
        error('Save Failed', 'Could not persist settings');
      }
    } catch (e: any) {
      error('Network Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const svc = services[selectedServiceId];
    if (!svc) return;

    setTesting(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          baseUrl: svc.baseUrl,
          port: svc.disablePort ? null : svc.port,
          disablePort: !!svc.disablePort,
          apiKey: svc.apiKey,
          useSsl: svc.useSsl
        })
      });

      const data = await res.json();
      setTestResults(prev => ({ ...prev, [selectedServiceId]: data }));

      if (data.success) {
        setServices(prev => ({
          ...prev,
          [selectedServiceId]: {
            ...prev[selectedServiceId],
            status: 'connected',
            version: data.version,
            latencyMs: data.latencyMs
          }
        }));
        onRefreshStack();
        success(`${svc.name} Connected`, `Version: ${data.version} • Latency: ${data.latencyMs}ms`);
      } else {
        setServices(prev => ({
          ...prev,
          [selectedServiceId]: {
            ...prev[selectedServiceId],
            status: 'error'
          }
        }));
        error(`${svc.name} Test Failed`, data.errorMessage || 'Could not connect to service endpoint');
      }
    } catch (e: any) {
      error('Connection Test Error', e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    setCreatingUser(true);
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });

      if (res.ok) {
        success('User Created', `Account "${newUsername}" provisioned`);
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        const data = await res.json();
        error('Failed to Create User', data.error || 'Server rejected request');
      }
    } catch (e: any) {
      error('Error', e.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        success('User Deleted', `Account "${username}" removed`);
        fetchUsers();
      } else {
        const data = await res.json();
        error('Delete Failed', data.error || 'Could not delete user');
      }
    } catch (e: any) {
      error('Error', e.message);
    }
  };

  const currentService = services[selectedServiceId];
  const currentTestResult = testResults[selectedServiceId];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Nav Tabs - Pixel M3 Segmented Bar */}
      <div className="flex items-center justify-between gap-4 pb-2 flex-wrap">
        <div className="inline-flex p-1.5 rounded-full bg-[#151b29] border border-[#26334a] gap-1 shadow-sm">
          <button
            id="settings-tab-services"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer pixel-pill ${
              activeTab === 'services'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40 border border-indigo-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Service Profiles</span>
          </button>

          {isAdmin && (
            <button
              id="settings-tab-users"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer pixel-pill ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40 border border-indigo-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts</span>
            </button>
          )}

          <button
            id="settings-tab-deployment"
            onClick={() => setActiveTab('deployment')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer pixel-pill ${
              activeTab === 'deployment'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40 border border-indigo-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>TrueNAS &amp; Docker</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <a
              href="/api/system/export-config"
              download="arr-house-config.json"
              title="Export configuration backup"
              className="px-4 py-2 bg-[#14171f] hover:bg-[#1a1e28] text-white text-xs font-bold rounded-full border border-white/[0.08] transition-all flex items-center gap-2 pixel-pill"
            >
              <Download className="w-3.5 h-3.5 text-[#b4e3be]" />
              <span className="hidden sm:inline">Export Backup</span>
            </a>
          )}

          {activeTab === 'services' && isAdmin && (
            <button
              id="save-settings-btn"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-5 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full shadow transition-all flex items-center gap-2 cursor-pointer pixel-pill disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Service Selector Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] block mb-2 px-1">
              Stack Services
            </span>

            {(['sonarr', 'radarr', 'lidarr', 'prowlarr'] as ServiceId[]).map((id) => {
              const svc = services[id];
              const isSelected = selectedServiceId === id;
              const isConnected = svc?.status === 'connected';

              const formattedUrl = (() => {
                if (!svc || !svc.baseUrl || svc.baseUrl.includes('[YOUR_URL]')) {
                  return 'Not configured';
                }
                const base = svc.baseUrl.trim();
                if (svc.disablePort || !svc.port || /:[0-9]+($|\/)/.test(base)) {
                  return base;
                }
                return `${base}:${svc.port}`;
              })();

              return (
                <button
                  key={id}
                  id={`service-select-${id}`}
                  onClick={() => setSelectedServiceId(id)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1a1e28] border-white/20 text-white shadow-md'
                      : 'bg-[#14171f] border-white/[0.06] hover:border-white/10 text-[#9aa0a6]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm block capitalize text-white">{id}</span>
                    <span className="text-[11px] text-[#9aa0a6] truncate block mt-0.5 font-mono">
                      {formattedUrl}
                    </span>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isConnected ? 'bg-[#b4e3be]' : 'bg-[#5f6368]'
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Service Configuration Form */}
          {currentService && (
            <div className="lg:col-span-3 space-y-6">
              <div className="sonos-card p-6">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 mb-5">
                  <div>
                    <h3 className="text-base font-extrabold text-white capitalize font-sans tracking-tight">
                      {currentService.name} Configuration Profile
                    </h3>
                    <p className="text-xs text-[#9aa0a6] mt-0.5">
                      Enter internal host IP or domain for container or LAN networking.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      id="test-connection-btn"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-4 py-2 bg-[#1a1e28] hover:bg-[#222734] text-white text-xs font-bold rounded-full border border-white/[0.08] flex items-center gap-2 transition-colors cursor-pointer pixel-pill disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-[#a8c7fa]' : ''}`} />
                      <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* Test Connection Banner if run */}
                {currentTestResult && (
                  <div className={`p-4 rounded-2xl border mb-5 flex items-start gap-3 text-xs ${
                    currentTestResult.success 
                      ? 'bg-[#b4e3be]/10 border-[#b4e3be]/30 text-white'
                      : 'bg-[#f28b82]/10 border-[#f28b82]/30 text-white'
                  }`}>
                    {currentTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-[#b4e3be] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#f28b82] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {currentTestResult.success ? 'Connection Successful' : 'Connection Failed'}
                      </p>
                      <p className="text-[#9aa0a6] mt-0.5 text-[11px] font-mono">
                        {currentTestResult.errorMessage || `Version: ${currentTestResult.version} • Latency: ${currentTestResult.latencyMs}ms`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                      Base URL / Hostname
                    </label>
                    <input
                      id={`input-base-url-${currentService.id}`}
                      type="text"
                      value={currentService.baseUrl}
                      onChange={(e) => handleUpdateServiceField('baseUrl', e.target.value)}
                      placeholder="e.g. https://sonarr.yourdomain.com or http://192.168.1.100"
                      className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                      Port
                    </label>
                    <input
                      id={`input-port-${currentService.id}`}
                      type="text"
                      disabled={!!currentService.disablePort}
                      value={currentService.disablePort ? 'Disabled (Tunnel)' : (currentService.port ?? '')}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        handleUpdateServiceField('port', val === '' ? null : Number(val));
                      }}
                      placeholder={currentService.disablePort ? 'No port' : 'e.g. 8989'}
                      className={`w-full px-4 py-2.5 border rounded-full text-xs font-mono focus:outline-none ${
                        currentService.disablePort
                          ? 'bg-[#0c0e12] border-white/[0.05] text-[#5f6368] cursor-not-allowed'
                          : 'bg-[#1a1e28] border-white/[0.08] text-white placeholder-[#9aa0a6] focus:border-white/30'
                      }`}
                    />
                  </div>
                </div>

                {/* Cloudflare tunnel / disable port toggle */}
                <div className="mt-4 p-4 rounded-2xl bg-[#1a1e28] border border-white/[0.06] flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-white block">Cloudflare Tunnel / Reverse Proxy (Disable Port)</span>
                    <span className="text-[#9aa0a6] text-[11px] block mt-0.5">
                      Enable if accessing {currentService.name} via Cloudflare Tunnels, custom domain, or standard HTTPS port 443. Arr House will not append any port number.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      id={`toggle-disable-port-${currentService.id}`}
                      type="checkbox"
                      checked={!!currentService.disablePort}
                      onChange={(e) => handleUpdateServiceField('disablePort', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#0c0e12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b4e3be]"></div>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>API Key</span>
                    <span className="text-[10px] text-[#9aa0a6] font-normal">
                      Located in {currentService.name} Settings &gt; General &gt; Security
                    </span>
                  </label>
                  <input
                    id={`input-api-key-${currentService.id}`}
                    type="password"
                    value={currentService.apiKey || ''}
                    onChange={(e) => handleUpdateServiceField('apiKey', e.target.value)}
                    placeholder={currentService.apiKey ? '••••••••••••' : 'Enter API Key'}
                    className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#9aa0a6] focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>

                <div className="mt-5 flex items-center gap-6 pt-4 border-t border-white/[0.07]">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white font-medium">
                    <input
                      type="checkbox"
                      checked={currentService.enabled}
                      onChange={(e) => handleUpdateServiceField('enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#0c0e12] text-white"
                    />
                    <span>Service Enabled</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white font-medium">
                    <input
                      type="checkbox"
                      checked={currentService.useSsl}
                      onChange={(e) => handleUpdateServiceField('useSsl', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#0c0e12] text-white"
                    />
                    <span>Use HTTPS / SSL</span>
                  </label>
                </div>
              </div>

              {/* Profiles & Root Folders Display */}
              <div className="sonos-card p-6">
                <h4 className="text-sm font-extrabold text-white mb-3.5 flex items-center gap-2 font-sans tracking-tight">
                  <FolderTree className="w-4 h-4 text-[#a8c7fa]" />
                  <span>Quality Profiles & Storage Roots</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quality Profiles */}
                  <div className="bg-[#1a1e28] p-4 rounded-2xl border border-white/[0.06]">
                    <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-wider block mb-2.5">
                      Available Quality Profiles
                    </span>
                    <div className="space-y-1.5">
                      {serviceProfiles.qualityProfiles.map((p) => (
                        <div key={p.id} className="text-xs text-white py-1.5 px-3 rounded-xl bg-[#14171f] border border-white/[0.05] flex items-center justify-between">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-[10px] font-mono text-[#a8c7fa]">ID {p.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Root Folders */}
                  <div className="bg-[#1a1e28] p-4 rounded-2xl border border-white/[0.06]">
                    <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-wider block mb-2.5">
                      Configured Host Folders
                    </span>
                    <div className="space-y-1.5">
                      {serviceProfiles.rootFolders.map((r) => (
                        <div key={r.id} className="text-xs text-white py-1.5 px-3 rounded-xl bg-[#14171f] border border-white/[0.05] flex items-center justify-between font-mono">
                          <span className="truncate">{r.path}</span>
                          {r.freeSpaceBytes && (
                            <span className="text-[10px] text-[#b4e3be] shrink-0 ml-2 font-mono">
                              {(r.freeSpaceBytes / 1e12).toFixed(1)} TB Free
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab (Admin Only) */}
      {activeTab === 'users' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create User Form */}
          <div className="sonos-card p-6">
            <h3 className="text-base font-extrabold text-white mb-1 font-sans tracking-tight">Create Account</h3>
            <p className="text-xs text-[#9aa0a6] mb-5">
              Add read-only accounts for family or standard users for media search.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  id="create-user-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. guest"
                  className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  id="create-user-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
                  Role Permissions
                </label>
                <select
                  id="create-user-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 bg-[#1a1e28] border border-white/[0.08] rounded-full text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
                >
                  <option value="standard">Standard (Search, View &amp; Request Media)</option>
                  <option value="readonly">Read-Only (View Library &amp; Calendar only)</option>
                  <option value="admin">Administrator (Full Access &amp; Settings)</option>
                </select>
              </div>

              <button
                id="create-user-submit-btn"
                type="submit"
                disabled={creatingUser}
                className="w-full py-3 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full shadow transition-all cursor-pointer disabled:opacity-50 pixel-pill mt-2"
              >
                {creatingUser ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="lg:col-span-2 theme-card p-6">
            <h3 className="text-base font-extrabold text-white mb-4 font-sans tracking-tight">Active User Accounts</h3>

            <div className="divide-y divide-[#26334a]">
              {users.map((u) => (
                <div key={u.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{u.username}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                        u.role === 'admin' 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                          : u.role === 'standard'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                      Created: {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-full hover:bg-white/[0.08] transition-colors cursor-pointer pixel-pill"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TrueNAS SCALE & Docker Deployment Tab */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="theme-card p-6 border-indigo-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-sm">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    TrueNAS SCALE Installation &amp; 1-Click Updates
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Configure TrueNAS SCALE to monitor GitHub for new releases and update with a single click.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Automated GHCR Pipeline Ready</span>
                </span>
              </div>
            </div>

            {/* Current Running Build Card */}
            <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Installed Container Version:</span>
                <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  {getBuildInfo().version}
                </span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  b.{getBuildInfo().buildId}
                </span>
                <span className="text-slate-400 hidden md:inline text-[11px]">
                  ({getBuildInfo().formattedDate})
                </span>
              </div>

              <div className="text-[11px] text-slate-400">
                Updates automatically every time TrueNAS pulls the latest container.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Step-by-Step TrueNAS instructions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1 */}
              <div className="theme-card p-6 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[11px] text-indigo-300 font-extrabold">1</span>
                  <span>GitHub Automated Build &amp; Container Registry</span>
                </div>
                <h4 className="text-sm font-bold text-white">How TrueNAS Detects GitHub Updates</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  TrueNAS SCALE cannot update directly from raw Git source code—it checks container registries (like GitHub Container Registry, <code className="text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">ghcr.io</code>) for newer image digests.
                </p>
                <div className="bg-[#10141e] p-3.5 rounded-2xl border border-[#26334a] text-xs text-slate-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>This repo already includes <code className="text-indigo-300 font-mono">.github/workflows/docker-publish.yml</code> which builds and pushes multi-architecture images (<span className="font-mono text-cyan-300">amd64 / arm64</span>) automatically when you push code or tags.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Ensure Package Visibility is Public:</strong> On GitHub, navigate to your repository or user profile &gt; <strong>Packages</strong> &gt; <strong>arr-house</strong> &gt; <strong>Package settings</strong> &gt; <strong>Change visibility</strong> &gt; select <strong>Public</strong>. This allows TrueNAS to query and pull updates without needing API keys.</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Electric Eel & Dragonfish */}
              <div className="theme-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[11px] text-indigo-300 font-extrabold">2</span>
                  <span>Install in TrueNAS SCALE</span>
                </div>

                {/* 24.10 Option */}
                <div className="p-4 rounded-2xl bg-[#10141e] border border-[#26334a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">TrueNAS SCALE 24.10+ (Electric Eel)</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">Native Docker Compose</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1 leading-relaxed">
                    <li>In TrueNAS, go to <strong>Apps</strong> &gt; <strong>Discover Apps</strong> &gt; click <strong>Custom App</strong> (or <strong>Install via Docker Compose</strong>).</li>
                    <li>Paste the Docker Compose template from the right sidebar.</li>
                    <li>Update your volume path to your desired ZFS dataset (e.g. <code className="text-slate-200 font-mono">/mnt/tank/appdata/arr-house</code>).</li>
                    <li>Click <strong>Save &amp; Install</strong>.</li>
                  </ol>
                </div>

                {/* 24.04 Option */}
                <div className="p-4 rounded-2xl bg-[#10141e] border border-[#26334a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">TrueNAS SCALE 24.04 / 23.10 (Dragonfish / Cobia)</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">Custom App Form</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1 leading-relaxed">
                    <li>Go to <strong>Apps</strong> &gt; <strong>Discover Apps</strong> &gt; <strong>Custom App</strong>.</li>
                    <li><strong>Application Name:</strong> <code className="text-white font-mono">arr-house</code></li>
                    <li><strong>Image repository:</strong> <code className="text-white font-mono">ghcr.io/&lt;your-username&gt;/arr-house</code> (Image tag: <code className="text-white font-mono">latest</code>).</li>
                    <li><strong>Port Forwarding:</strong> Host Port <code className="text-white font-mono">3000</code> &rarr; Container Port <code className="text-white font-mono">3000</code>.</li>
                    <li><strong>Storage (Host Path):</strong> Set Host Path to your dataset and Mount Path to <code className="text-white font-mono">/app/data</code>.</li>
                  </ol>
                </div>
              </div>

              {/* Step 3: Updating Custom Apps */}
              <div className="theme-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[11px] text-indigo-300 font-extrabold">3</span>
                  <span>How to Update Custom Apps in TrueNAS (Where to find the option)</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <strong>Why "Check for Updates" is missing:</strong> TrueNAS SCALE's global "Check for Updates" button is <em>only</em> shown for official Catalog apps. For <strong>Custom Apps</strong> using GitHub Docker images, use one of the two standard methods below:
                </div>

                <div className="space-y-3">
                  {/* Method A */}
                  <div className="p-4 rounded-2xl bg-[#10141e] border border-[#26334a] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Method A: With <code>pull_policy: always</code> (Easiest for 24.10+)</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">Recommended</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      In the Compose template below, we included <code className="text-indigo-300 font-mono">pull_policy: always</code>. Whenever a new version is pushed to GitHub, you simply click the <strong>three dots (&vellip;)</strong> on the Arr House app card in TrueNAS &rarr; click <strong>Restart</strong>. TrueNAS will query GitHub, pull the newest image layer, and restart automatically.
                    </p>
                  </div>

                  {/* Method B */}
                  <div className="p-4 rounded-2xl bg-[#10141e] border border-[#26334a] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Method B: "Manage Container Images" (All TrueNAS Versions)</span>
                    </div>
                    <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-1 leading-relaxed">
                      <li>In TrueNAS, go to <strong>Apps</strong>.</li>
                      <li>In the top right corner, click the <strong>three dots (&vellip;)</strong> or <strong>Settings</strong> button &rarr; select <strong>Manage Container Images</strong>.</li>
                      <li>Find <code className="text-slate-200 font-mono">ghcr.io/&lt;username&gt;/arr-house</code> in the list, click its <strong>&vellip;</strong> menu &rarr; click <strong>Pull</strong> (or click <strong>Pull Image</strong> at the top right).</li>
                      <li>Go back to <strong>Installed Apps</strong>, click <strong>Restart</strong> (or click <strong>Edit</strong> and then <strong>Save</strong>) on Arr House to apply the new image.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Docker Compose Snippet */}
            <div className="space-y-6">
              <div className="theme-card p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      docker-compose.yml
                    </span>
                    <button
                      onClick={() => {
                        const snippet = `services:
  arr-house:
    image: ghcr.io/<your-github-username>/arr-house:latest
    pull_policy: always
    container_name: arr-house
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - ARR_DATA_DIR=/app/data
    volumes:
      - /mnt/tank/appdata/arr-house:/app/data`;
                        navigator.clipboard.writeText(snippet);
                        setCopiedCompose(true);
                        success('Copied to Clipboard', 'docker-compose.yml ready to paste in TrueNAS');
                        setTimeout(() => setCopiedCompose(false), 2500);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer pixel-pill"
                    >
                      {copiedCompose ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCompose ? 'Copied!' : 'Copy YAML'}</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-2xl bg-[#0e121a] border border-[#26334a] font-mono text-[11px] text-slate-200 leading-relaxed overflow-x-auto select-all">
{`services:
  arr-house:
    image: ghcr.io/<your-github-username>/arr-house:latest
    pull_policy: always
    container_name: arr-house
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - ARR_DATA_DIR=/app/data
    volumes:
      - /mnt/tank/appdata/arr-house:/app/data`}
                  </pre>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Replace <code className="text-indigo-300">&lt;your-github-username&gt;</code> and <code className="text-indigo-300">/mnt/tank/appdata/arr-house</code> with your TrueNAS pool path.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#26334a] space-y-2 text-xs text-slate-300">
                  <div className="font-bold text-white">Need zero-touch background updates?</div>
                  <p className="text-[11px] text-slate-400">
                    Install <strong>Watchtower</strong> from the TrueNAS app catalog or docker compose. It will monitor GitHub Container Registry on a schedule and automatically update without needing any manual clicks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
