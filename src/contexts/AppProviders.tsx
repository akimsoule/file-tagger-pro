import { FileProvider } from "./file/provider";
import { QueryProvider } from "./query/provider";
import { SettingsProvider } from "./settings/provider";
import { UserProvider } from "./user/provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <SettingsProvider>
        <FileProvider>
          <QueryProvider>{children}</QueryProvider>
        </FileProvider>
      </SettingsProvider>
    </UserProvider>
  );
}
