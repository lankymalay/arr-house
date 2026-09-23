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
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import type { ServiceConfig, ServiceId, User, UserRole } from '../types.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { formatServiceWebUrl } from '../utils/serviceUrl.js';

interface SettingsViewProps {
  onRefreshStack: () => void;
  user?: User | null;
  servicesStatus?: Array<{ 
    id: string; 
    name: string; 
    status: string; 
    version?: string; 
    latencyMs?: number; 
    port?: number; 
    disablePort?: boolean;
  }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshStack, user: propUser, servicesStatus = [] }) => {
  const { success, error } = useToast();
  const { user: authUser, isAdmin: authIsAdmin } = useAuth();
  const { refreshSettings: refreshGlobalSettings, updateServices } = useSettings();
  const user = propUser || authUser;
  const isAdmin = user ? user.role === 'admin' : authIsAdmin;

  const [activeTab, setActiveTab] = useState<'services' | 'users'>('services');
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
        const loadedServices = data.services || {};
        setServices(loadedServices);
        updateServices(loadedServices);
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
        [field]: value,
        // Reset connection status when connectivity-related fields change
        ...(['baseUrl', 'port', 'apiKey', 'useSsl', 'disablePort'].includes(field)
          ? { status: 'untested' as const }
          : {})
      }
    }));
    // Clear any stale test result for this service
    if (['baseUrl', 'port', 'apiKey', 'useSsl', 'disablePort'].includes(field)) {
      setTestResults(prev => {
        const next = { ...prev };
        delete next[selectedServiceId];
        return next;
      });
    }
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
        updateServices(services);
        refreshGlobalSettings();
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
  const currentWebUrl = formatServiceWebUrl(currentService);

  // Re-test all configured services and update their live status
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const handleRefreshAllStatus = async () => {
    setRefreshingStatus(true);
    const token = localStorage.getItem('arr_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const serviceIds: ServiceId[] = ['sonarr', 'radarr', 'lidarr', 'prowlarr'];

    try {
      const results = await Promise.allSettled(
        serviceIds.map(async (id) => {
          const svc = services[id];
          if (!svc?.baseUrl || !svc?.apiKey) {
            // No config — mark as untested
            return { id, success: false, noConfig: true };
          }
          const res = await fetch('/api/settings/test-connection', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              serviceId: id,
              baseUrl: svc.baseUrl,
              port: svc.disablePort ? null : svc.port,
              disablePort: !!svc.disablePort,
              apiKey: svc.apiKey,
              useSsl: svc.useSsl
            })
          });
          const data = await res.json();
          return { id, ...data };
        })
      );

      setServices(prev => {
        const next = { ...prev };
        results.forEach((result, i) => {
          const id = serviceIds[i];
          if (result.status === 'fulfilled') {
            const data = result.value;
            if (data.noConfig) {
              next[id] = { ...next[id], status: 'untested' as any };
            } else if (data.success) {
              next[id] = { ...next[id], status: 'connected', version: data.version, latencyMs: data.latencyMs };
            } else {
              next[id] = { ...next[id], status: 'error' };
            }
          } else {
            next[id] = { ...next[id], status: 'error' };
          }
        });
        return next;
      });

      onRefreshStack();
    } catch (e) {
      console.error('Refresh status failed', e);
    } finally {
      setRefreshingStatus(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Nav Tabs - Pixel M3 Segmented Bar */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 pb-1 sm:pb-2 flex-wrap">
        <div className="inline-flex p-1 sm:p-1.5 rounded-full bg-[#151b29] border border-[#26334a] gap-1 shadow-sm overflow-x-auto max-w-full">
          <button
            id="settings-tab-services"
            onClick={() => setActiveTab('services')}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill shrink-0 ${
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
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer pixel-pill shrink-0 ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40 border border-indigo-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'services' && isAdmin && (
            <button
              id="save-settings-btn"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 sm:px-5 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-bold rounded-full shadow transition-all flex items-center gap-2 cursor-pointer pixel-pill disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Stack Services Live Status Panel */}
      <div className="bg-[#121824] border border-[#2d3c54] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            {(() => {
              const allIds: ServiceId[] = ['sonarr', 'radarr', 'lidarr', 'prowlarr'];
              const configured = allIds.filter(id => services[id]?.baseUrl && services[id]?.apiKey);
              const connected = configured.filter(id => services[id]?.status === 'connected');
              const dotClass = configured.length === 0
                ? 'bg-slate-500'
                : connected.length === configured.length
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : connected.length > 0
                ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]';
              return <span className={`w-2 h-2 rounded-full ${dotClass}`} />;
            })()}
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Stack Services Status
            </h2>
          </div>
          <button
            onClick={handleRefreshAllStatus}
            disabled={refreshingStatus}
            title="Test all service connections"
            className="text-xs text-indigo-400 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer pixel-pill font-medium disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshingStatus ? 'Testing...' : 'Refresh Status'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {(['sonarr', 'radarr', 'lidarr', 'prowlarr'] as ServiceId[]).map((id) => {
            const svc = services[id];
            const liveStatus = servicesStatus?.find(s => s.id === id);
            // Use local svc.status as source of truth (it gets reset on config change and updated on test)
            // Only fall back to liveStatus if svc has no status set
            const effectiveStatus = svc?.status || liveStatus?.status || 'untested';
            const isConnected = effectiveStatus === 'connected';
            const isError = effectiveStatus === 'error';
            const isSelected = activeTab === 'services' && selectedServiceId === id;

            const name = id === 'sonarr' ? 'Sonarr' : id === 'radarr' ? 'Radarr' : id === 'lidarr' ? 'Lidarr' : 'Prowlarr';
            const role = id === 'sonarr' ? 'TV Shows' : id === 'radarr' ? 'Movies' : id === 'lidarr' ? 'Music' : 'Indexers';
            
            return (
              <button
                key={id}
                id={`settings-status-${id}`}
                onClick={() => {
                  setActiveTab('services');
                  setSelectedServiceId(id);
                }}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[84px] ${
                  isSelected
                    ? 'bg-[#1c263a] border-indigo-500/80 shadow-md shadow-indigo-950/30 ring-1 ring-indigo-500/50'
                    : 'bg-[#161e2e] border-[#26334a] hover:border-[#3a4c6e] hover:bg-[#1a2336]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm text-white capitalize truncate">{name}</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">({role})</span>
                  </div>
                  {/* Status Light Dot */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isConnected
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : isError
                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                        : 'bg-slate-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 font-mono mt-auto pt-1">
                  <span className={`text-[11px] font-semibold capitalize font-sans ${
                    isConnected ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {isConnected ? 'Connected' : isError ? 'Offline' : 'Standby'}
                  </span>
                  {liveStatus?.latencyMs ? (
                    <span className="text-[10px] text-slate-400">{liveStatus.latencyMs}ms</span>
                  ) : svc?.port ? (
                    <span className="text-[10px] text-slate-400">:{svc.port}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
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

              const formattedUrl = formatServiceWebUrl(svc) || 'Not configured';

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

                  <div className="flex items-center gap-2.5 sm:gap-3">
                    {currentWebUrl && (
                      <a
                        id="service-open-webui-btn"
                        href={currentWebUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 sm:px-4 py-2 bg-[#1a1e28] hover:bg-[#253046] text-white text-xs font-bold rounded-full border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer pixel-pill shadow-sm shrink-0"
                        title={`Open ${currentService.name} Web UI in new tab (${currentWebUrl})`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0" />
                        <span>Open Web UI</span>
                      </a>
                    )}

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
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateServiceField('baseUrl', val);
                        // If typing https:// and no port is in the host, auto-check useSsl and disablePort for tunnel/reverse proxy convenience
                        if (val.startsWith('https://') && !/:[0-9]+($|\/)/.test(val)) {
                          handleUpdateServiceField('useSsl', true);
                          handleUpdateServiceField('disablePort', true);
                        }
                      }}
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
    </div>
  );
};
