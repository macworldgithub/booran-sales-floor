'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, leadApi, inventoryApi } from './api';
import { LoginScreen } from '@/components/auth/LoginScreen';
export interface AuthUser {
  id: string; email: string; name: string;
  role: 'principal' | 'manager' | 'consultant' | 'super_admin';
  site: string; allowedSites: string[]; avatar?: string; title?: string;
}
interface AuthContextValue {
  user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean;
  authError: string | null;
  locations: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as AuthUser;
  return typeof user.id === 'string' && typeof user.site === 'string' &&
    ['super_admin', 'manager'].includes(user.role) && Array.isArray(user.allowedSites) && user.allowedSites.length > 0;
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setAuthError(null);
    authApi.me().then((result) => {
      if (!active) return;
      if (!result.success || !isAuthUser(result.data)) throw new Error('The authentication service is not configured correctly.');
      setUser(result.data);
    })
      .catch((error) => { if (active && error.status !== 401) setAuthError(error.message); })
      .finally(() => { if (active) setIsLoading(false); });
    const expired = () => { setUser(null); setAuthError(null); };
    window.addEventListener('booran:unauthorized', expired);
    return () => { active = false; window.removeEventListener('booran:unauthorized', expired); };
  }, [revision]);
  useEffect(() => {
    let active = true;
    if (!user) { setLocations([]); return; }
    setLocations(user.role === 'super_admin' ? [] : [user.site]);
    Promise.allSettled([leadApi.getCrmRooftops(), inventoryApi.getInventoryRooftops()]).then((results) => {
      if (!active) return;
      const names = results.flatMap((result) => result.status === 'fulfilled' && result.value.success ? (result.value.data || []).map((rooftop) => rooftop.name) : []).filter((name): name is string => Boolean(name));
      if (user.role !== 'super_admin') names.push(user.site);
      setLocations(Array.from(new Set(names)).filter((name) => user.role === 'super_admin' || name.toLowerCase().includes(user.site.toLowerCase())).sort());
    });
    return () => { active = false; };
  }, [user?.id, user?.role, user?.site]);
  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email.trim().toLowerCase(), password);
    if (!result.success || !isAuthUser(result.data?.user)) throw new Error(result.error || 'Unable to sign in.');
    setAuthError(null);
    setUser(result.data.user);
  }, []);
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setAuthError(null);
  }, []);
  const value = { user, isAuthenticated: Boolean(user), isLoading, authError, locations, login, logout, retry: () => setRevision((current) => current + 1) };
  return <AuthContext.Provider value={value}>{isLoading ? <div role="status" className="min-h-dvh grid place-items-center bg-[#171b22] text-white">Verifying your session...</div> : user ? children : <LoginScreen />}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
