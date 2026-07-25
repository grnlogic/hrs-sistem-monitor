"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/overlay/dialog";
import { Loader2 } from "lucide-react";

type ImportLoadingDialogProps = {
  isImporting: boolean;
};

export function ImportLoadingDialog({ isImporting }: ImportLoadingDialogProps) {
  return (
    <Dialog open={isImporting} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Memproses Data Excel</DialogTitle>
          <DialogDescription>
            Mohon tunggu, sistem sedang membaca dan mengimport data karyawan.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="h-10 w-10 text-zinc-700 animate-spin mb-4" />
          <p className="text-sm font-medium text-zinc-700 animate-pulse">
            Menyimpan data ke database...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
