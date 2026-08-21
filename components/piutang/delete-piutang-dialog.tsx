"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/overlay/dialog";
import { Button } from "@/components/ui/form/button";
import { AlertTriangle } from "lucide-react";
import { piutangAPI } from "@/lib/api";
import type { PiutangItem } from "./edit-piutang-dialog";

interface DeletePiutangDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piutang: PiutangItem | null;
  onSuccess: () => void;
}

export function DeletePiutangDialog({
  open,
  onOpenChange,
  piutang,
  onSuccess,
}: DeletePiutangDialogProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (open) {
      setErrorMsg("");
    }
  }, [open]);

  const handleConfirmDelete = async () => {
    if (!piutang) return;
    setErrorMsg("");

    try {
      setSubmitting(true);
      await piutangAPI.delete(piutang.id);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus data piutang");
    } finally {
      setSubmitting(false);
    }
  };

  const cicilanCount = piutang?.cicilan?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0" /> Konfirmasi Hapus Piutang
          </DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus data piutang ini secara permanen?
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        {piutang && cicilanCount > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              Peringatan Riwayat Cicilan
            </p>
            <p>
              Piutang ini sudah memiliki <span className="font-bold">{cicilanCount}</span> riwayat cicilan. Riwayat tersebut akan ikut terhapus secara permanen dari database.
            </p>
          </div>
        )}

        <DialogFooter className="pt-4 border-t flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-zinc-500 hover:bg-zinc-100"
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm px-4"
          >
            {submitting ? "Menghapus..." : "Ya, Hapus Piutang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
