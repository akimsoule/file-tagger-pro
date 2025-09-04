import type { SortBy, ViewMode } from '../query/def';

export interface Settings {
  theme: string;
  language: string;
  defaultViewMode: ViewMode;
  defaultSortBy: SortBy;
}

export interface SettingsContextType {
  // State
  settings: Settings;
  
  // Methods
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  
  // Getters
  defaultViewMode: ViewMode;
  defaultSortBy: SortBy;
}
