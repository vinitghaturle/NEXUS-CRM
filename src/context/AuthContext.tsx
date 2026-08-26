import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, loginWithEmailAndPassword, logout as firebaseLogout } from '../services/firebase';
import { callApi } from '../services/api';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
  position: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read cached profile immediately on boot to prevent flash of logged-out state
  const cachedProfile = (() => {
    try {
      const stored = localStorage.getItem('nexus_crm_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [loading, setLoading] = useState<boolean>(!cachedProfile);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchProfile = async () => {
    try {
      const crmProfile = await callApi<UserProfile>('auth.me');
      setProfile(crmProfile);
      localStorage.setItem('nexus_crm_profile', JSON.stringify(crmProfile));
    } catch (err: any) {
      console.warn('Profile sync notice:', err);
      // If we already have a cached profile, keep the session active
      const existing = localStorage.getItem('nexus_crm_profile');
      if (existing) {
        try {
          setProfile(JSON.parse(existing));
          return;
        } catch {}
      }
      setError(err.message || 'Authorization failed: User profile not registered in CRM.');
      await firebaseLogout();
      localStorage.removeItem('nexus_crm_profile');
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setError(null);
        setUser(currentUser);
        await fetchProfile();
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('nexus_crm_profile');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithEmailAndPassword(email, password);
      // Profile fetching will be triggered automatically by the onAuthStateChanged listener
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed. Please check credentials.');
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseLogout();
      localStorage.removeItem('nexus_crm_profile');
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to log out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
