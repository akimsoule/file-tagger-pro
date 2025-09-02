import { useCallback, useState } from 'react';
import type { Settings, SettingsContextType } from './def';
import { SettingsContext } from './context';
import type { SortBy, ViewMode } from '../query/def';

const defaultSettings: Settings = {
  theme: 'system',
  language: 'fr',
  defaultViewMode: 'grid',
  defaultSortBy: 'name',
  showHiddenFiles: false,
  showFileExtensions: true,
  autoExpandFolders: false,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    defaultViewMode: settings.defaultViewMode,
    defaultSortBy: settings.defaultSortBy,
    showHiddenFiles: settings.showHiddenFiles,
    showFileExtensions: settings.showFileExtensions,
    autoExpandFolders: settings.autoExpandFolders,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
