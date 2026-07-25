import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card";
import { Button } from "@/components/ui/form/button";
import { Braces } from "lucide-react";
import { PKB_PLACEHOLDERS } from "@/lib/pkb-placeholders";

type PlaceholderPanelProps = {
  onInsertPlaceholder: (key: string) => void;
};

export function PlaceholderPanel({ onInsertPlaceholder }: PlaceholderPanelProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Placeholder Dinamis</CardTitle>
        <CardDescription>
          Gunakan placeholder untuk mengganti nilai otomatis saat Step 2 berjalan. Klik tombol di samping label untuk memasukkan token ke posisi kursor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {PKB_PLACEHOLDERS.map((placeholder) => (
          <div key={placeholder.key} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-800">{placeholder.label}</p>
              <p className="text-xs text-zinc-500">{`{{${placeholder.key}}}`} &middot; {placeholder.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onInsertPlaceholder(placeholder.key)}
            >
              <Braces className="mr-1 h-4 w-4" /> Sisipkan
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
