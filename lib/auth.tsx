'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setToken, clearToken, getToken } from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'principal' | 'manager' | 'consultant' | 'super_admin';
  title?: string;
  site?: string;
  avatar?: string;
}

const DEFAULT_USER: AuthUser = {
  id: 'user-megan-1',
  name: 'Megan Taylor',
  email: 'megant@booranmotors.com.au',
  role: 'manager',
  title: 'Group Marketing & Operations',
  site: 'Booran Motors Group - All Locations',
  avatar: 'MT',
};

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'principal' | 'manager' | 'consultant') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        setUser(DEFAULT_USER);
        return;
      }
      try {
        const res = await authApi.me();
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          setUser(DEFAULT_USER);
        }
      } catch {
        setUser(DEFAULT_USER);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password?: string) => {
    try {
      const res = await authApi.login(email, password);
      if (res.success && res.data) {
        setToken(res.data.access_token);
        setUser(res.data.user);
      }
    } catch {
      // Local fallback
      setUser({
        id: 'user-megan-1',
        name: email.toLowerCase().includes('paul') ? 'Paul Booran' : 'Megan Taylor',
        email: email || 'megant@booranmotors.com.au',
        role: email.toLowerCase().includes('paul') ? 'principal' : 'manager',
        title: email.toLowerCase().includes('paul') ? 'Dealer Principal' : 'Group Marketing & Operations',
        site: 'Booran Motors Group - All Locations',
        avatar: email.toLowerCase().includes('paul') ? 'PB' : 'MT',
      });
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    clearToken();
    setUser(null);
  }, []);

  const switchRole = useCallback((role: 'principal' | 'manager' | 'consultant') => {
    if (role === 'principal') {
      setUser({
        id: 'user-paul-1',
        name: 'Paul Booran',
        email: 'paul.booran@booranmotors.com.au',
        role: 'principal',
        title: 'Dealer Principal',
        site: 'Booran Motors Group - All Locations',
        avatar: 'PB',
      });
    } else if (role === 'manager') {
      setUser(DEFAULT_USER);
    } else {
      setUser({
        id: 'user-lewis-1',
        name: 'Lewis Dannock',
        email: 'lewis.dannock@booranmotors.com.au',
        role: 'consultant',
        title: 'Senior Automotive Consultant',
        site: 'BYD South Morang',
        avatar: 'LD',
      });
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
