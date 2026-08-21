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

type NonStaffSignatureDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  signatures: {
    diketahuiOleh: string;
    dibuatOleh: string;
    catatan: string;
    kikipingOleh?: string;
    kikipingNominal?: number;
  };
  onSave: (signatures: {
    diketahuiOleh: string;
    dibuatOleh: string;
    catatan: string;
    kikipingOleh?: string;
    kikipingNominal?: number;
  }) => void;
  onCancel: () => void;
};

export function NonStaffSignatureDialog(props: NonStaffSignatureDialogProps) {
  const { isOpen, onClose, signatures, onSave, onCancel } = props;

  const [diketahuiOleh, setDiketahuiOleh] = useState(signatures.diketahuiOleh || "SELVIE GUSTIARINI");
  const [dibuatOleh, setDibuatOleh] = useState(signatures.dibuatOleh || "SUCI");
  const [catatan, setCatatan] = useState(signatures.catatan || "");
  const [kikipingOleh, setKikipingOleh] = useState(signatures.kikipingOleh || "");
  const [kikipingNominal, setKikipingNominal] = useState<number>(signatures.kikipingNominal ?? 0);

  // Update local states if signatures prop changes
  useEffect(() => {
    setDiketahuiOleh(signatures.diketahuiOleh || "SELVIE GUSTIARINI");
    setDibuatOleh(signatures.dibuatOleh || "SUCI");
    setCatatan(signatures.catatan || "");
    setKikipingOleh(signatures.kikipingOleh || "");
    setKikipingNominal(signatures.kikipingNominal ?? 0);
  }, [signatures, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diketahuiOleh.trim() || !dibuatOleh.trim()) return;
    onSave({ diketahuiOleh, dibuatOleh, catatan, kikipingOleh, kikipingNominal });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onCancel();
      }
    }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Informasi Penandatangan Rekapitulasi</DialogTitle>
          <DialogDescription>
            Tentukan penandatangan slip rekapitulasi gaji non-staff untuk periode berjalan.
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-600 block mb-1">
                Kikiping Oleh (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Contoh: SELVIE / JONI"
                value={kikipingOleh}
                onChange={(e) => setKikipingOleh(e.target.value)}
                className="rounded-xl h-10 px-3 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 block mb-1">
                Nominal Kikiping (Opsional)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={kikipingNominal || 0}
                onChange={(e) => setKikipingNominal(Number(e.target.value || 0))}
                className="rounded-xl h-10 px-3 py-1 text-sm"
              />
            </div>
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
              onClick={onCancel}
              className="rounded-xl text-zinc-500 hover:bg-zinc-100"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm px-4"
            >
              Lanjutkan ke Rekap
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
