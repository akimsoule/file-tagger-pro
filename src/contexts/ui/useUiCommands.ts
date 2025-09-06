import { useContext } from 'react';
import { UiCommandContext } from './context';

export function useUiCommands() {
  const ctx = useContext(UiCommandContext);
  if (!ctx) throw new Error('useUiCommands must be used within UiCommandProvider');
  return ctx;
}
