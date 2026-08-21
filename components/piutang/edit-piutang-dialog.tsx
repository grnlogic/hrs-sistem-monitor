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
import { piutangAPI } from "@/lib/api";

export type PiutangItem = {
  id: string;
  saldoAwal: number | string;
  jumlahCicilan: number | string;
  sisaSaldo: number | string;
  aktif?: boolean;
  cicilan?: Array<any>;
};

interface EditPiutangDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piutang: PiutangItem | null;
  onSuccess: () => void;
}

export function EditPiutangDialog({
  open,
  onOpenChange,
  piutang,
  onSuccess,
}: EditPiutangDialogProps) {
  const [saldoAwal, setSaldoAwal] = useState<string>("");
  const [jumlahCicilan, setJumlahCicilan] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (piutang) {
      setSaldoAwal(String(piutang.saldoAwal ?? ""));
      setJumlahCicilan(String(piutang.jumlahCicilan ?? ""));
      setErrorMsg("");
    }
  }, [piutang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!piutang) return;
    setErrorMsg("");

    const saldoAwalNum = Number(saldoAwal);
    const jumlahCicilanNum = Number(jumlahCicilan);

    if (isNaN(saldoAwalNum) || saldoAwalNum <= 0) {
      setErrorMsg("Saldo awal harus berupa angka lebih besar dari 0");
      return;
    }

    if (isNaN(jumlahCicilanNum) || jumlahCicilanNum <= 0) {
      setErrorMsg("Jumlah cicilan per minggu harus berupa angka lebih besar dari 0");
      return;
    }

    try {
      setSubmitting(true);
      await piutangAPI.update(piutang.id, {
        saldoAwal: saldoAwalNum,
        jumlahCicilan: jumlahCicilanNum,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengupdate data piutang");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 font-bold">Edit Data Piutang</DialogTitle>
          <DialogDescription>
            Ubah nilai saldo awal dan/atau jumlah cicilan per minggu untuk piutang ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-600 block mb-1">
              Saldo Awal (Rp)
            </label>
            <Input
              type="number"
              min={1}
              required
              value={saldoAwal}
              onChange={(e) => setSaldoAwal(e.target.value)}
              placeholder="Masukkan nominal saldo awal..."
              className="rounded-xl h-10 px-3 py-1 text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Sisa saldo akan dihitung ulang secara otomatis berdasarkan histori cicilan yang sudah dibayarkan.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600 block mb-1">
              Cicilan per Minggu (Rp)
            </label>
            <Input
              type="number"
              min={1}
              required
              value={jumlahCicilan}
              onChange={(e) => setJumlahCicilan(e.target.value)}
              placeholder="Masukkan nominal cicilan..."
              className="rounded-xl h-10 px-3 py-1 text-sm"
            />
          </div>

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
              type="submit"
              disabled={submitting}
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm px-4"
            >
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
