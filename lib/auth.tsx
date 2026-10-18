'use client';
import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { advanceSessionGeneration, authApi, leadApi, inventoryApi } from './api';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { useRefreshOnResume } from './use-refresh-on-resume';
export interface AuthUser {
  id: string; email: string; name: string;
  role: 'principal' | 'manager' | 'consultant' | 'super_admin';
  site: string; allowedSites: string[]; avatar?: string; title?: string;
}
interface AuthContextValue {
  user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean;
  authError: string | null;
  locations: string[];
  locationsError: string | null;
  reloadLocations: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as AuthUser;
  return typeof user.id === 'string' && typeof user.site === 'string' && typeof user.email === 'string' && typeof user.name === 'string' &&
    ['super_admin', 'manager'].includes(user.role) && Array.isArray(user.allowedSites) && user.allowedSites.length > 0 && user.allowedSites.every((site) => typeof site === 'string');
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [locationsRevision, setLocationsRevision] = useState(0);
  const [loadedLocationsScope, setLoadedLocationsScope] = useState('');
  const scopeKey = user ? JSON.stringify([user.id, user.role, user.site, user.allowedSites]) : 'signed-out';
  const sessionVersion = useRef(0);
  const [revision, setRevision] = useState(0);
  useRefreshOnResume(() => { if (user) setLocationsRevision((value) => value + 1); });
  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    const current = () => active && sessionVersion.current === version;
    const controller = new AbortController();
    setIsLoading(true);
    setAuthError(null);
    authApi.me({ signal: controller.signal }).then((result) => {
      if (!current()) return;
      if (!result.success || !isAuthUser(result.data)) throw new Error('The authentication service is not configured correctly.');
      setUser(result.data);
    })
      .catch((error) => { if (current() && error.status !== 401) setAuthError(error.message); })
      .finally(() => { if (current()) setIsLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [revision]);
  useEffect(() => {
    const expired = () => { sessionVersion.current += 1; setUser(null); setAuthError(null); setIsLoading(false); };
    window.addEventListener('booran:unauthorized', expired);
    const changed = (event: StorageEvent) => {
      if (event.key !== 'booran:session-changed') return;
      advanceSessionGeneration();
      sessionVersion.current += 1;
      setUser(null);
      setRevision((value) => value + 1);
    };
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('booran:unauthorized', expired); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    let pending = false;
    const version = sessionVersion.current;
    const controller = new AbortController();
    const verify = async () => {
      if (pending || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const result = await authApi.me({ signal: controller.signal });
        if (active && version === sessionVersion.current && isAuthUser(result.data)) {
          setUser((previous) => JSON.stringify(previous) === JSON.stringify(result.data) ? previous : result.data);
        }
      } catch { /* Transient network errors do not destroy a valid local session. */ }
      finally { pending = false; }
    };
    const interval = window.setInterval(verify, 60000);
    document.addEventListener('visibilitychange', verify);
    window.addEventListener('online', verify);
    return () => { active = false; controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', verify); window.removeEventListener('online', verify); };
  }, [user?.id]);
  useEffect(() => {
    let active = true;
    if (!user) { setLocations([]); return; }
    setLocations([]);
    setLocationsError(null);
    Promise.allSettled([leadApi.getCrmRooftops(), inventoryApi.getInventoryRooftops()]).then((results) => {
      if (!active) return;
      const names = results.flatMap((result) => result.status === 'fulfilled' && result.value.success ? (result.value.data || []).map((rooftop) => rooftop.name) : []).filter((name): name is string => typeof name === 'string' && Boolean(name.trim()));
      setLocations(Array.from(new Set(names)).sort()); // Both endpoints enforce the user's site boundary.
      setLoadedLocationsScope(scopeKey);
      if (results.some((result) => result.status === 'rejected') || !names.length) setLocationsError('The dealership directory could not be fully loaded. Retry to refresh available dealerships.');
    });
    return () => { active = false; };
  }, [scopeKey, locationsRevision]);
  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email.trim().toLowerCase(), password);
    if (!result.success || !isAuthUser(result.data?.user)) throw new Error(result.error || 'Unable to sign in.');
    advanceSessionGeneration();
    sessionVersion.current += 1;
    setAuthError(null);
    setIsLoading(false);
    setUser(result.data.user);
    try { localStorage.setItem('booran:session-changed', String(Date.now())); } catch {}
  }, []);
  const logout = useCallback(async () => {
    await authApi.logout();
    advanceSessionGeneration();
    sessionVersion.current += 1;
    setUser(null);
    setAuthError(null);
    try { localStorage.setItem('booran:session-changed', String(Date.now())); } catch {}
  }, []);
  const value = { user, isAuthenticated: Boolean(user), isLoading, authError, locations: loadedLocationsScope === scopeKey ? locations : [], locationsError: loadedLocationsScope === scopeKey ? locationsError : null, reloadLocations: () => setLocationsRevision((current) => current + 1), login, logout, retry: () => setRevision((current) => current + 1) };
  return <AuthContext.Provider value={value}>{isLoading ? <div role="status" className="min-h-dvh grid place-items-center bg-[#171b22] text-white">Verifying your session...</div> : user ? <Fragment key={scopeKey}>{children}</Fragment> : <LoginScreen />}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
