import { useCallback, useState } from 'react';
import type { User, UserContextType, UserSession } from './def';
import { UserContext } from './context';
import { mockUser } from '@/data/mockData';


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
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (email === 'test@example.com' && password === 'password') {
        setSession({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          error: undefined,
        });
      } else {
        throw new Error('Identifiants invalides');
      }
    } catch (error) {
      setSession({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSession({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
      });
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      }));
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      setSession(prev => ({ ...prev, isLoading: true, error: undefined }));
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        ...mockUser,
        id: crypto.randomUUID(),
        email,
        name,
      };
      
      setSession({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });
    } catch (error) {
      setSession(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
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
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Pour la démo, on restaure le mockUser
      setSession({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });
    } catch (error) {
      setSession({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setSession(prev => ({ ...prev, error: undefined }));
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
