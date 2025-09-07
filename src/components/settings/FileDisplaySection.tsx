import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortBy, ViewMode } from "@/types";

interface FileDisplaySectionProps {
  defaultViewMode: ViewMode;
  defaultSortBy: SortBy;
  onViewModeChange: (viewMode: ViewMode) => void;
  onSortByChange: (sortBy: SortBy) => void;
}

export function FileDisplaySection({
  defaultViewMode,
  defaultSortBy,
  onViewModeChange,
  onSortByChange,
}: FileDisplaySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Affichage des fichiers</CardTitle>
        <CardDescription>Définissez vos préférences par défaut</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Mode d'affichage par défaut</Label>
          <Select value={defaultViewMode} onValueChange={onViewModeChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent className="z-[10010]">
              <SelectItem value="grid">Grille</SelectItem>
              <SelectItem value="list">Liste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Tri par défaut</Label>
          <Select value={defaultSortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent className="z-[10010]">
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Taille</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
