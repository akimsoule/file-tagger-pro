import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import {
  deleteUserMegaConfig,
  saveUserMegaConfig,
  testUserMegaCredentials,
  type UserMegaConfigInfo,
} from "@/lib/api/api-mega-config";

interface MegaConfigSectionProps {
  megaConfig: UserMegaConfigInfo | null;
  onConfigUpdate: (config: UserMegaConfigInfo | null) => void;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  error?: string;
}

export function MegaConfigSection({
  megaConfig,
  onConfigUpdate,
  loading,
  onLoadingChange,
  error,
}: MegaConfigSectionProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(megaConfig?.email || "");
  const [password, setPassword] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const handleDelete = async () => {
    try {
      onLoadingChange(true);
      await deleteUserMegaConfig();
      onConfigUpdate(null);
      setEmail("");
      setPassword("");
      toast({
        title: "MEGA",
        description: "Configuration supprimée",
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible de supprimer la configuration",
        variant: "destructive",
      });
    } finally {
      onLoadingChange(false);
    }
  };

  const handleTest = async () => {
    try {
      onLoadingChange(true);
      setTestLoading(true);
      const test = await testUserMegaCredentials(email.trim(), password);

      if (!test?.ok) {
        throw new Error(test?.message || "Connexion MEGA impossible");
      }

      toast({
        title: "MEGA",
        description: "Connexion validée",
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Test de connexion MEGA échoué",
        variant: "destructive",
      });
    } finally {
      onLoadingChange(false);
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      onLoadingChange(true);

      // 1) Tester la connexion MEGA
      const test = await testUserMegaCredentials(email.trim(), password);

      if (!test?.ok) {
        throw new Error(test?.message || "Connexion MEGA impossible");
      }

      toast({
        title: "MEGA",
        description: "Connexion validée, sauvegarde en cours…",
      });

      // 2) Sauvegarder si test OK
      const res = await saveUserMegaConfig(email.trim(), password);
      onConfigUpdate(res.config);
      setPassword(""); // clear password after save
      toast({ title: "MEGA", description: res.message });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible d'enregistrer les identifiants",
        variant: "destructive",
      });
    } finally {
      onLoadingChange(false);
    }
  };

  const isFormValid = email && password;
  const isDeleteDisabled = loading || !megaConfig;
  const isFormDisabled = loading || !isFormValid;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stockage MEGA</CardTitle>
        <CardDescription>
          Configurez vos identifiants MEGA. Le mot de passe n'est jamais stocké en clair.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Label htmlFor="mega-email">Email MEGA</Label>
            <Input
              id="mega-email"
              type="email"
              autoComplete="username"
              className="w-full sm:w-72"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@domaine.com"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Label htmlFor="mega-password">Mot de passe</Label>
            <Input
              id="mega-password"
              type="password"
              autoComplete="current-password"
              className="w-full sm:w-72"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" disabled={isDeleteDisabled} onClick={handleDelete}>
              Supprimer
            </Button>

            <Button variant="outline" disabled={isFormDisabled} onClick={handleTest}>
              {testLoading ? (
                <span className="inline-flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test en cours…
                </span>
              ) : (
                "Tester"
              )}
            </Button>

            <Button disabled={isFormDisabled} onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
