import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Theme {
  value: string;
  label: string;
}

interface Language {
  value: string;
  label: string;
}

interface AppearanceSectionProps {
  theme: string;
  language: string;
  onThemeChange: (theme: string) => void;
  onLanguageChange: (language: string) => void;
}

const THEMES: Theme[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

const LANGUAGES: Language[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

export function AppearanceSection({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}: AppearanceSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apparence</CardTitle>
        <CardDescription>Personnalisez l'apparence de l'application</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Thème</Label>
            <Select value={theme} onValueChange={onThemeChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sélectionner un thème" />
              </SelectTrigger>
              <SelectContent className="z-[10010]">
                {THEMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="language">Langue</Label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sélectionner une langue" />
              </SelectTrigger>
              <SelectContent className="z-[10010]">
                {LANGUAGES.map((lang) => (
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
  );
}
