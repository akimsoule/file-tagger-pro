import { createContext } from 'react';
import type { SettingsContextType } from './def';

export const SettingsContext = createContext<SettingsContextType>(null!);
