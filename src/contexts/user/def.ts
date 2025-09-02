import { Document, Folder } from '../file/def';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
  preferences: {
    theme: string;
    language: string;
  };
  documents: Document[];
  folders: Folder[];
}

export interface UserSession {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface UserContextType {
  // Session state
  session: UserSession;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  
  // User operations
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
  
  // Utilities
  refreshSession: () => Promise<void>;
  clearError: () => void;
}
