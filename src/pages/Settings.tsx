import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { FileManagerSidebar } from '@/components/FileManagerSidebar';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ViewMode, SortBy } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Settings = () => {
  const { settings, updateSettings, resetSettings } = useSettings();

  const viewModes: { value: ViewMode; label: string }[] = [
    { value: 'grid', label: 'Grille' },
    { value: 'list', label: 'Liste' },
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'name', label: 'Nom' },
    { value: 'date', label: 'Date de modification' },
    { value: 'size', label: 'Taille' },
    { value: 'type', label: 'Type' },
  ];

  const themes = [
    { value: 'system', label: 'Système' },
    { value: 'light', label: 'Clair' },
    { value: 'dark', label: 'Sombre' },
  ];

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FileManagerSidebar />
        
        <main className="flex-1 flex flex-col">
          <header className="flex items-center gap-1 sm:gap-4 p-1 sm:p-4 border-b border-border bg-card/50">
            <SidebarTrigger className="shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="p-1 sm:p-2 rounded-lg bg-primary-gradient">
                <SettingsIcon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-semibold text-foreground leading-none">
                  Paramètres
                </h1>
                <p className="hidden sm:block text-sm text-muted-foreground">Personnalisez votre expérience</p>
              </div>
            </div>
          </header>

          <div className="flex-1 p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full">
            {/* Apparence */}
            <Card>
              <CardHeader>
                <CardTitle>Apparence</CardTitle>
                <CardDescription>
                  Personnalisez l'apparence de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme">Thème</Label>
                    <Select
                      value={settings.theme}
                      onValueChange={(value) => updateSettings({ theme: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sélectionner un thème" />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme.value} value={theme.value}>
                            {theme.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="language">Langue</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => updateSettings({ language: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sélectionner une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Affichage des fichiers */}
            <Card>
              <CardHeader>
                <CardTitle>Affichage des fichiers</CardTitle>
                <CardDescription>
                  Configurez comment les fichiers sont affichés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="defaultViewMode">Mode d'affichage par défaut</Label>
                    <Select
                      value={settings.defaultViewMode}
                      onValueChange={(value: ViewMode) => 
                        updateSettings({ defaultViewMode: value })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sélectionner un mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {viewModes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="defaultSortBy">Tri par défaut</Label>
                    <Select
                      value={settings.defaultSortBy}
                      onValueChange={(value: SortBy) => 
                        updateSettings({ defaultSortBy: value })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sélectionner un tri" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>


                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={resetSettings}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
