import { UserProvider } from './user/provider';
import { SettingsProvider } from './settings/provider';
import { TagProvider } from './tag/provider';
import { FileProvider } from './file/provider';
import { QueryProvider } from './query/provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <SettingsProvider>
        <TagProvider>
          <FileProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </FileProvider>
        </TagProvider>
      </SettingsProvider>
    </UserProvider>
  );
}
