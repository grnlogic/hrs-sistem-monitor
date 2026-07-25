import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { Employee } from "@/lib/types";

interface DeactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeToDeactivate: Employee | null;
  isDeactivating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeactivateDialog({
  open,
  onOpenChange,
  employeeToDeactivate,
  isDeactivating,
  onConfirm,
  onCancel,
}: DeactivateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Nonaktifkan Karyawan
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Anda akan menonaktifkan karyawan{" "}
                <span className="font-semibold">
                  {employeeToDeactivate?.name}
                </span>
              </p>
              <p className="text-sm text-zinc-600">
                Karyawan yang dinonaktifkan tidak akan muncul pada absensi harian dan
                dianggap tidak lagi bekerja di perusahaan. Histori datanya tetap akan dipertahankan.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            disabled={isDeactivating}
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeactivating}
            className="bg-red-600 hover:bg-zinc-800"
          >
            {isDeactivating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Memproses...
              </>
            ) : (
              "Nonaktifkan Karyawan"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
