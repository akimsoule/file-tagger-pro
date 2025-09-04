import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { useSettings } from '@/hooks/useSettings';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    // Mettre à jour le thème lorsque le paramètre change
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme={settings.theme}
      enableSystem
    >
      {children}
    </NextThemeProvider>
  );
}
