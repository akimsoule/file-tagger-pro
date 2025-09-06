import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import React from 'react';
import type { ViewMode, SortBy } from '@/types';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, resetSettings } = useSettings();

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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><SettingsIcon className="h-4 w-4"/> Paramètres</DialogTitle>
          <DialogDescription>Personnalisez votre expérience</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Personnalisez l'apparence de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="theme">Thème</Label>
                  <Select value={settings.theme} onValueChange={(value) => updateSettings({ theme: value })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sélectionner un thème" />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="language">Langue</Label>
                  <Select value={settings.language} onValueChange={(value) => updateSettings({ language: value })}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
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
              <CardDescription>Définissez vos préférences par défaut</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mode d'affichage par défaut</Label>
                {/* Les Select ci-dessous supposent que le provider de Query synchronise avec Settings */}
                <Select value={settings.defaultViewMode} onValueChange={(value: ViewMode) => updateSettings({ defaultViewMode: value })}>
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
                <Select value={settings.defaultSortBy} onValueChange={(value: SortBy) => updateSettings({ defaultSortBy: value })}>
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

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={onClose}>Fermer</Button>
            <Button variant="destructive" onClick={resetSettings}>Réinitialiser</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
