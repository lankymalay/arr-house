import React, { useState, useEffect } from 'react';
import { 
  Server, 
  KeyRound, 
  Users, 
  Save, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Shield,
  Trash2,
  Download,
  FolderTree
} from 'lucide-react';
import type { ServiceId, ServiceConfig, User, UserRole, QualityProfile, RootFolder } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

interface SettingsViewProps {
  onRefreshStack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshStack }) => {
  const { user, isAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'services' | 'users'>('services');
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>('sonarr');
  
  // Settings state
  const [services, setServices] = useState<Record<ServiceId, ServiceConfig>>({} as any);
  const [systemName, setSystemName] = useState<string>('Arr House');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Quality profiles & root folders preview
  const [serviceProfiles, setServiceProfiles] = useState<{ qualityProfiles: QualityProfile[]; rootFolders: RootFolder[] }>({
    qualityProfiles: [],
    rootFolders: []
  });

  // Users state (Admin)
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('standard');
  const [creatingUser, setCreatingUser] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('arr_token');
      const res = await fetch('/api/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || {});
        setSystemName(data.systemName || 'Arr House');
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users if admin
  const fetchUsers = async () => {
    if (!isAdmin) return;
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
          systemName
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
            status: 'error',
            errorMessage: data.errorMessage
          }
        }));
        error(`${svc.name} Unreachable`, data.errorMessage || 'Failed to ping service');
      }
    } catch (err: any) {
      error('Connection Test Error', err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 6) {
      error('Validation Error', 'Username and minimum 6-character password required.');
      return;
    }

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
          username: newUsername.trim(),
          password: newPassword,
          role: newRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('User Created', `Created account for ${newUsername} (${newRole})`);
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        error('Create User Failed', data.error || 'Could not create account');
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
      {/* Top Nav Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            id="settings-tab-services"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Service Profiles</span>
          </button>

          {isAdmin && (
            <button
              id="settings-tab-users"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Management</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <a
              href="/api/system/export-config"
              download="arr-house-config.json"
              title="Export configuration backup"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export Backup</span>
            </a>
          )}

          {activeTab === 'services' && isAdmin && (
            <button
              id="save-settings-btn"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Service Selector Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
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
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-bold text-sm block capitalize">{id}</span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {formattedUrl}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Service Configuration Form */}
          {currentService && (
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-white capitalize">
                      {currentService.name} Configuration Profile
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Enter internal host IP or domain for container or LAN networking.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      id="test-connection-btn"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* Test Connection Banner if run */}
                {currentTestResult && (
                  <div className={`p-3.5 rounded-xl border mb-5 flex items-start gap-3 text-xs ${
                    currentTestResult.success 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}>
                    {currentTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {currentTestResult.success ? 'Connection Successful' : 'Connection Failed'}
                      </p>
                      <p className="text-slate-300 mt-0.5 text-[11px]">
                        {currentTestResult.errorMessage || `Version: ${currentTestResult.version} • Latency: ${currentTestResult.latencyMs}ms`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Base URL / Hostname
                    </label>
                    <input
                      id={`input-base-url-${currentService.id}`}
                      type="text"
                      value={currentService.baseUrl}
                      onChange={(e) => handleUpdateServiceField('baseUrl', e.target.value)}
                      placeholder="e.g. https://sonarr.yourdomain.com or http://192.168.1.100"
                      className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3.5 py-2 border rounded-xl text-xs font-mono focus:outline-none ${
                        currentService.disablePort
                          ? 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-950/80 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Cloudflare tunnel / disable port toggle */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">Cloudflare Tunnel / Reverse Proxy (Disable Port)</span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Enable this if you access {currentService.name} via Cloudflare Tunnels, custom domain, or standard HTTPS port 443. Arr House will not append any port number.
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
                    <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>API Key</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Located in {currentService.name} Settings &gt; General &gt; Security
                    </span>
                  </label>
                  <input
                    id={`input-api-key-${currentService.id}`}
                    type="password"
                    value={currentService.apiKey || ''}
                    onChange={(e) => handleUpdateServiceField('apiKey', e.target.value)}
                    placeholder={currentService.apiKey ? '••••••••••••' : 'Enter API Key'}
                    className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="mt-4 flex items-center gap-6 pt-3 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={currentService.enabled}
                      onChange={(e) => handleUpdateServiceField('enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-cyan-600 bg-slate-950"
                    />
                    <span>Service Enabled</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={currentService.useSsl}
                      onChange={(e) => handleUpdateServiceField('useSsl', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-cyan-600 bg-slate-950"
                    />
                    <span>Use HTTPS / SSL</span>
                  </label>
                </div>
              </div>

              {/* Profiles & Root Folders Display */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-cyan-400" />
                  <span>Quality Profiles & Root Storage</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quality Profiles */}
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Available Quality Profiles
                    </span>
                    <div className="space-y-1">
                      {serviceProfiles.qualityProfiles.map((p) => (
                        <div key={p.id} className="text-xs text-slate-300 py-1 px-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                          <span>{p.name}</span>
                          <span className="text-[10px] font-mono text-cyan-400">ID {p.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Root Folders */}
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Configured Host Folders
                    </span>
                    <div className="space-y-1">
                      {serviceProfiles.rootFolders.map((r) => (
                        <div key={r.id} className="text-xs text-slate-300 py-1 px-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between font-mono">
                          <span className="truncate">{r.path}</span>
                          {r.freeSpaceBytes && (
                            <span className="text-[10px] text-emerald-400 shrink-0 ml-2">
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
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Create Account</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add read-only accounts for family or standard users for media search.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  id="create-user-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. guest"
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  id="create-user-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Role Permissions
                </label>
                <select
                  id="create-user-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
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
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-900/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Active User Accounts</h3>

            <div className="divide-y divide-slate-800">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{u.username}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        u.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : u.role === 'standard'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Created: {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
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
    </div>
  );
};
