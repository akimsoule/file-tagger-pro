import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import { useSettings } from '@/hooks/useSettings';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme={settings.theme}
      enableSystem
      disableTransitionOnChange
    >
      <ThemeSync />
      {children}
    </NextThemeProvider>
  );
}

function ThemeSync() {
  const { settings } = useSettings();
  const { setTheme } = useTheme();
  useEffect(() => {
    // Synchronise next-themes avec les paramètres app (light | dark | system)
    setTheme(settings.theme);
  }, [settings.theme, setTheme]);
  return null;
}
