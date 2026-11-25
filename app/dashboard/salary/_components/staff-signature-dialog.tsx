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
import { Input } from "@/components/ui/form/input";

export type StaffSignatures = {
  diketahuiOleh: string;
  dibuatOleh: string;
  catatan: string;
};

type StaffSignatureDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  signatures: StaffSignatures;
  onSave: (signatures: StaffSignatures) => void;
};

export function StaffSignatureDialog(props: StaffSignatureDialogProps) {
  const { isOpen, onClose, signatures, onSave } = props;

  const [diketahuiOleh, setDiketahuiOleh] = useState(signatures.diketahuiOleh || "SELVIE GUSTIARINI");
  const [dibuatOleh, setDibuatOleh] = useState(signatures.dibuatOleh || "SUCI");
  const [catatan, setCatatan] = useState(signatures.catatan || "");

  useEffect(() => {
    if (isOpen) {
      setDiketahuiOleh(signatures.diketahuiOleh || "SELVIE GUSTIARINI");
      setDibuatOleh(signatures.dibuatOleh || "SUCI");
      setCatatan(signatures.catatan || "");
    }
  }, [signatures, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diketahuiOleh.trim() || !dibuatOleh.trim()) return;
    onSave({
      diketahuiOleh: diketahuiOleh.trim(),
      dibuatOleh: dibuatOleh.trim(),
      catatan: catatan.trim(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Informasi Penandatangan Rekapitulasi</DialogTitle>
          <DialogDescription>
            Tentukan penandatangan dan catatan untuk rekapitulasi gaji Staff periode berjalan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-zinc-600 block mb-1">
              Diketahui Oleh (Nama / Jabatan)
            </label>
            <Input
              type="text"
              required
              placeholder="Contoh: SELVIE GUSTIARINI"
              value={diketahuiOleh}
              onChange={(e) => setDiketahuiOleh(e.target.value)}
              className="rounded-xl h-10 px-3 py-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600 block mb-1">
              Dibuat Oleh (Nama / Staff Payroll)
            </label>
            <Input
              type="text"
              required
              placeholder="Contoh: SUCI"
              value={dibuatOleh}
              onChange={(e) => setDibuatOleh(e.target.value)}
              className="rounded-xl h-10 px-3 py-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600 block mb-1">
              Catatan Rekapitulasi (Opsional)
            </label>
            <textarea
              placeholder="Masukkan catatan khusus jika diperlukan..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full text-sm rounded-xl border border-zinc-200 p-3 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
            />
          </div>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-zinc-500 hover:bg-zinc-100"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm px-4"
            >
              Simpan Tanda Tangan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
