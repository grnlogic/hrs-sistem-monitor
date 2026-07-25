import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";

interface UnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlockPassword: string;
  onPasswordChange: (password: string) => void;
  unlockError: string;
  isUnlocking: boolean;
  onUnlock: () => void;
  onCancel: () => void;
  pendingUnlockAction: "preview" | "export";
}

export function UnlockDialog({
  open,
  onOpenChange,
  unlockPassword,
  onPasswordChange,
  unlockError,
  isUnlocking,
  onUnlock,
  onCancel,
  pendingUnlockAction,
}: UnlockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verifikasi Akses Data Sensitif</DialogTitle>
          <DialogDescription>
            Masukkan password operator untuk membuka data sensitif pada mode
            {pendingUnlockAction === "export"
              ? " export"
              : " preview all data"}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Masukkan password"
            value={unlockPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUnlock();
              }
            }}
          />

          {unlockError && (
            <Alert variant="destructive">
              <AlertDescription>{unlockError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isUnlocking}
          >
            Batal
          </Button>
          <Button onClick={onUnlock} disabled={isUnlocking}>
            {isUnlocking ? "Memverifikasi..." : "Buka Akses"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
