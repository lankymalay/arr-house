import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ServiceConfig, ServiceId } from '../types.js';
import { formatServiceWebUrl } from '../utils/serviceUrl.js';

interface SettingsContextType {
  services: Record<string, ServiceConfig>;
  getServiceUrl: (serviceId: string) => string;
  refreshSettings: () => Promise<void>;
  updateServices: (newServices: Record<string, any>) => void;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const CACHE_KEY = 'arr_service_settings_cache';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Record<string, ServiceConfig>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}
    }
    return {};
  });
  const [loading, setLoading] = useState(false);

  const updateServices = useCallback((newServices: Record<string, any>) => {
    if (!newServices || typeof newServices !== 'object') return;
    setServices(prev => {
      const merged = { ...prev, ...newServices };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    });
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('arr_token') : null;
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let loaded = false;
      // 1. Try authenticated /api/settings
      try {
        const res = await fetch('/api/settings', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.services) {
            updateServices(data.services);
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('Error fetching /api/settings:', err);
      }

      // 2. Fallback to /api/settings/service-urls if /api/settings failed or unauthenticated
      if (!loaded) {
        try {
          const res = await fetch('/api/settings/service-urls');
          if (res.ok) {
            const data = await res.json();
            if (data && data.services) {
              updateServices(data.services);
            }
          }
        } catch (err) {
          console.warn('Error fetching /api/settings/service-urls:', err);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh settings in SettingsContext', err);
    } finally {
      setLoading(false);
    }
  }, [updateServices]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const getServiceUrl = useCallback((serviceId: string): string => {
    if (!serviceId) return '';
    const key = serviceId.toLowerCase();
    const svc = services[key] || services[serviceId];
    if (!svc) return '';
    
    // First calculate URL directly based on the service's baseUrl, port, and SSL settings
    const computed = formatServiceWebUrl(svc);
    if (computed) return computed;

    // Fallback to pre-calculated webUrl if present
    if ((svc as any).webUrl) {
      return (svc as any).webUrl;
    }
    return '';
  }, [services]);

  return (
    <SettingsContext.Provider value={{ services, getServiceUrl, refreshSettings, updateServices, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider
    return {
      services: {},
      getServiceUrl: () => '',
      refreshSettings: async () => {},
      updateServices: () => {},
      loading: false
    };
  }
  return context;
}
