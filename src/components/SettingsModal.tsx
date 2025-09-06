import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Settings as SettingsIcon, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ViewMode, SortBy } from "@/types";
import { useUser } from "@/hooks/useUser";

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { logout, session } = useUser();

  const themes = [
    { value: "system", label: "Système" },
    { value: "light", label: "Clair" },
    { value: "dark", label: "Sombre" },
  ];

  const languages = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
  ];

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
        {/* Header plein écran (sans user/logout) */}
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-2 sm:py-3 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-gradient text-white">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-semibold leading-none">
                Paramètres
              </h2>
              <p className="hidden sm:block text-xs text-muted-foreground">
                Personnalisez votre expérience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" />
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
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
                      {themes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="language">Langue</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) =>
                      updateSettings({ language: value })
                    }
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

          <Card>
            <CardHeader>
              <CardTitle>Affichage des fichiers</CardTitle>
              <CardDescription>
                Définissez vos préférences par défaut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mode d'affichage par défaut</Label>
                {/* Les Select ci-dessous supposent que le provider de Query synchronise avec Settings */}
                <Select
                  value={settings.defaultViewMode}
                  onValueChange={(value: ViewMode) =>
                    updateSettings({ defaultViewMode: value })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grille</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Tri par défaut</Label>
                <Select
                  value={settings.defaultSortBy}
                  onValueChange={(value: SortBy) =>
                    updateSettings({ defaultSortBy: value })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nom</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Taille</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          {/* Compte utilisateur / Déconnexion */}
          <Card>
            <CardHeader>
              <CardTitle>Compte</CardTitle>
              <CardDescription>
                Informations de l’utilisateur et déconnexion
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {session?.user?.name || session?.user?.email || "Utilisateur"}
                </div>
                {session?.user?.email && (
                  <div className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await logout();
                  }}
                >
                  Déconnexion
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Réinitialisation des paramètres */}
          <Card>
            <CardHeader>
              <CardTitle>Réinitialisation</CardTitle>
              <CardDescription>
                Rétablir les paramètres par défaut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Cette action rétablit tous les paramètres à leurs valeurs par
                  défaut.
                </p>
                <Button variant="destructive" onClick={resetSettings}>
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>

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
