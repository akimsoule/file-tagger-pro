import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Settings as SettingsIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMegaConfig } from "@/hooks/useMegaConfig";
import { useSettings } from "@/hooks/useSettings";
import { useUser } from "@/hooks/useUser";
import type { SortBy, ViewMode } from "@/types";

import { AccountSection } from "./AccountSection";
// Sections
import { AppearanceSection } from "./AppearanceSection";
import { FileDisplaySection } from "./FileDisplaySection";
import { MegaConfigSection } from "./MegaConfigSection";
import { ResetSection } from "./ResetSection";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { logout, session } = useUser();
  const {
    megaConfig,
    loading: megaLoading,
    error: megaError,
    setMegaConfig,
    setLoading: setMegaLoading,
  } = useMegaConfig(open);

  const handleThemeChange = (theme: string) => {
    updateSettings({ theme });
  };

  const handleLanguageChange = (language: string) => {
    updateSettings({ language });
  };

  const handleViewModeChange = (viewMode: ViewMode) => {
    updateSettings({ defaultViewMode: viewMode });
  };

  const handleSortByChange = (sortBy: SortBy) => {
    updateSettings({ defaultSortBy: sortBy });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="inset-0 left-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-screen max-w-none sm:rounded-none p-0 grid grid-rows-[auto,1fr] z-[10002]">
        <VisuallyHidden asChild>
          <DialogTitle>Paramètres</DialogTitle>
        </VisuallyHidden>

        {/* Header plein écran */}
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-2 sm:py-3 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-gradient text-white">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-semibold leading-none">Paramètres</h2>
              <p className="hidden sm:block text-xs text-muted-foreground">
                Personnalisez votre expérience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" />
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <AppearanceSection
            theme={settings.theme}
            language={settings.language}
            onThemeChange={handleThemeChange}
            onLanguageChange={handleLanguageChange}
          />

          <MegaConfigSection
            megaConfig={megaConfig}
            onConfigUpdate={setMegaConfig}
            loading={megaLoading}
            onLoadingChange={setMegaLoading}
            error={megaError}
          />

          <FileDisplaySection
            defaultViewMode={settings.defaultViewMode}
            defaultSortBy={settings.defaultSortBy}
            onViewModeChange={handleViewModeChange}
            onSortByChange={handleSortByChange}
          />

          <AccountSection
            userName={session?.user?.name}
            userEmail={session?.user?.email}
            onLogout={handleLogout}
          />

          <ResetSection onReset={resetSettings} />

          <div className="flex justify-between w-full pt-2">
            <Button
              variant="outline"
              className="w-full justify-center gap-2 py-3 rounded-lg shadow-sm hover:bg-accent text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
