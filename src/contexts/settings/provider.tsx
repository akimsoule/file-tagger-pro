import { useCallback, useState } from 'react';
import type { Settings, SettingsContextType } from './def';
import { SettingsContext } from './context';
import type { SortBy, ViewMode } from '../query/def';

const defaultSettings: Settings = {
  theme: 'system',
  language: 'fr',
  defaultViewMode: 'grid',
  defaultSortBy: 'name',
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('file-tagger-settings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        ...newSettings,
      };
      localStorage.setItem('file-tagger-settings', JSON.stringify(updated));
      return updated;
    });
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
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
