import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ResetSectionProps {
  onReset: () => void;
}

export function ResetSection({ onReset }: ResetSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Réinitialisation</CardTitle>
        <CardDescription>Rétablir les paramètres par défaut</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Cette action rétablit tous les paramètres à leurs valeurs par défaut.
          </p>
          <Button variant="destructive" onClick={onReset}>
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
