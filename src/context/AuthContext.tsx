import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../types.js';

interface AuthContextType {
  user: User | null;
  initialized: boolean | null;
  needsSetup: boolean;
  loading: boolean;
  systemName: string;
  isAdmin: boolean;
  canEdit: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setupAdmin: (username: string, password: string, systemName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to parse response safely, preventing JSON syntax errors on HTML responses
async function parseApiResponse(res: Response, defaultAction = 'request'): Promise<{ success: boolean; data?: any; error?: string }> {
  const contentType = res.headers.get('content-type') || '';
  let payload: any = null;

  if (contentType.includes('application/json')) {
    try {
      payload = await res.json();
    } catch {
      // Ignore json parse error and proceed to fallback
    }
  } else {
    // Non-JSON response (e.g. reverse proxy HTML or express error)
    const text = await res.text();
    const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) {
      const cleaned = preMatch[1].replace(/<[^>]+>/g, '').trim();
      return { success: false, error: cleaned };
    }
    return { 
      success: false, 
      error: `Server returned non-JSON response (${res.status} ${res.statusText || 'Error'}). Check server logs or volume permissions.` 
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: payload?.error || `Action failed with status ${res.status} (${res.statusText || 'Error'})`
    };
  }

  if (payload) {
    return { success: true, data: payload };
  }

  return { success: false, error: `Invalid empty response during ${defaultAction}` };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [systemName, setSystemName] = useState<string>('Arr House');

  const getStoredToken = () => localStorage.getItem('arr_token') || '';

  const refreshStatus = useCallback(async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/auth/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const parsed = await parseApiResponse(res, 'status check');
      if (parsed.success && parsed.data) {
        setInitialized(parsed.data.initialized);
        setNeedsSetup(parsed.data.needsSetup ?? !parsed.data.initialized);
        setUser(parsed.data.user);
        if (parsed.data.systemName) setSystemName(parsed.data.systemName);
      } else {
        // Fallback to setup if uninitialized or server not ready
        setInitialized(false);
        setNeedsSetup(true);
      }
    } catch (err) {
      console.error('Failed to fetch auth status', err);
      setInitialized(false);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const parsed = await parseApiResponse(res, 'login');
      if (!parsed.success || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to sign in' };
      }

      const data = parsed.data;
      if (data.token) {
        localStorage.setItem('arr_token', data.token);
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const setupAdmin = async (username: string, password: string, customSystemName?: string) => {
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, systemName: customSystemName })
      });
      const parsed = await parseApiResponse(res, 'admin setup');
      if (!parsed.success || !parsed.data) {
        return { success: false, error: parsed.error || 'Failed to initialize' };
      }

      const data = parsed.data;
      if (data.token) {
        localStorage.setItem('arr_token', data.token);
      }
      setUser(data.user);
      setInitialized(true);
      setNeedsSetup(false);
      if (customSystemName) setSystemName(customSystemName);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Setup network error' };
    }
  };

  const logout = async () => {
    try {
      const token = getStoredToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      localStorage.removeItem('arr_token');
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'standard';

  return (
    <AuthContext.Provider
      value={{
        user,
        initialized,
        needsSetup,
        loading,
        systemName,
        isAdmin,
        canEdit,
        login,
        setupAdmin,
        logout,
        refreshStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
