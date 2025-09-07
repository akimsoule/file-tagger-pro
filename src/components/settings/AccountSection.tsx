import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountSectionProps {
  userName?: string;
  userEmail?: string;
  onLogout: () => Promise<void>;
}

export function AccountSection({ userName, userEmail, onLogout }: AccountSectionProps) {
  const displayName = userName || userEmail || "Utilisateur";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compte</CardTitle>
        <CardDescription>Informations de l'utilisateur et déconnexion</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
          {userEmail && <div className="text-xs text-muted-foreground truncate">{userEmail}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" onClick={onLogout}>
            Déconnexion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
