import { useCallback, useEffect, useState } from 'react';
import type { User, UserContextType, UserSession } from './def';
import { UserContext } from './context';
import { authLogin, authRegister, authRefresh, authVerify, setAuthToken, loadStoredToken, onAuthError } from '@/lib/api/api';


const initialSession: UserSession = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: undefined,
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(initialSession);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      const { user } = await authLogin(email, password);
      setSession({ user: mapBackendUser(user), isAuthenticated: true, isLoading: false, error: undefined });
    } catch (error) {
      setAuthToken(null);
      setSession({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion',
      });
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setSession({ user: null, isAuthenticated: false, isLoading: false, error: undefined });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      const { user } = await authRegister(email, password, name);
      setSession({ user: mapBackendUser(user), isAuthenticated: true, isLoading: false, error: undefined });
    } catch (error) {
      setAuthToken(null);
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inscription',
      }));
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSession(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates } : null,
        isLoading: false,
      }));
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      }));
    }
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<User['preferences']>) => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSession(prev => ({
        ...prev,
        user: prev.user
          ? {
              ...prev.user,
              preferences: { ...prev.user.preferences, ...preferences },
            }
          : null,
        isLoading: false,
      }));
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      }));
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      const token = loadStoredToken();
      if (!token) throw new Error('Non authentifié');
      const { user } = await authRefresh();
      setSession({ user: mapBackendUser(user), isAuthenticated: true, isLoading: false, error: undefined });
    } catch (error) {
      setAuthToken(null);
      setSession({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Session expirée',
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setSession(prev => ({ ...prev, error: undefined }));
  }, []);

  // Mapping backend -> User local (placeholder jusqu’à adaptation backend complète)
  function mapBackendUser(u: any): User { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: u.id,
      email: u.email,
      name: u.name || u.email.split('@')[0],
      role: 'user',
      avatar: undefined,
      preferences: { theme: 'light', language: 'fr' },
      documents: [],
      folders: []
    };
  }

  // Auto-initialisation au montage
  useEffect(() => {
    // handler global 401
    onAuthError(() => {
      setSession({ user: null, isAuthenticated: false, isLoading: false, error: 'Session expirée' });
    });
    const token = loadStoredToken();
    if (!token) {
      setSession(prev => ({ ...prev, isLoading: false }));
      return;
    }
    (async () => {
      try {
        // D'abord verify (rapide). Si échec 401 => tenter refresh puis re-verify.
        let verifiedUser: any | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
          const { user } = await authVerify();
          verifiedUser = user;
  } catch {
          // tentative refresh
          try {
            const { user } = await authRefresh();
            verifiedUser = user;
          } catch {
            setAuthToken(null);
          }
        }
        if (verifiedUser) {
          setSession({ user: mapBackendUser(verifiedUser), isAuthenticated: true, isLoading: false, error: undefined });
        } else {
          setSession(prev => ({ ...prev, isLoading: false }));
        }
  } catch {
        setAuthToken(null);
        setSession(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    })();
  }, []);

  const value: UserContextType = {
    session,
    login,
    logout,
    register,
    updateProfile,
    updatePreferences,
    refreshSession,
    clearError,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
