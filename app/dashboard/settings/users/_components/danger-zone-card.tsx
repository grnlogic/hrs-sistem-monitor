"use client";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/display/card";

type DangerZoneCardProps = {
  dangerLoading: "absensi" | "karyawan" | "gaji" | null;
  resetDraftPeriodeAwal: string;
  resetDraftPeriodeAkhir: string;
  resetDraftKaryawanId: string;
  onSetResetDraftPeriodeAwal: (value: string) => void;
  onSetResetDraftPeriodeAkhir: (value: string) => void;
  onSetResetDraftKaryawanId: (value: string) => void;
  onClearAllAbsensi: () => void;
  onForceDeleteAllKaryawan: () => void;
  onResetDraftGajiNonStaff: () => void;
};

export function DangerZoneCard({
  dangerLoading,
  resetDraftPeriodeAwal,
  resetDraftPeriodeAkhir,
  resetDraftKaryawanId,
  onSetResetDraftPeriodeAwal,
  onSetResetDraftPeriodeAkhir,
  onSetResetDraftKaryawanId,
  onClearAllAbsensi,
  onForceDeleteAllKaryawan,
  onResetDraftGajiNonStaff,
}: DangerZoneCardProps) {
  return (
    <Card className="border-zinc-200">
      <CardHeader>
        <CardTitle className="text-red-700">Danger Zone</CardTitle>
        <CardDescription>
          Aksi di bawah ini bersifat destruktif dan tidak dapat dibatalkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-red-800">1) Force Clear Seluruh Absensi</p>
          <p className="text-xs text-red-700 mt-1">
            Menghapus semua data absensi dari seluruh karyawan.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            disabled={dangerLoading !== null}
            onClick={onClearAllAbsensi}
          >
            {dangerLoading === "absensi" ? "Menghapus Absensi..." : "Force Clear Absensi"}
          </Button>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-red-800">2) Force Delete Seluruh Karyawan (by ID)</p>
          <p className="text-xs text-red-700 mt-1">
            Menghapus seluruh data karyawan berdasarkan id karyawan, termasuk relasi data terkait.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            disabled={dangerLoading !== null}
            onClick={onForceDeleteAllKaryawan}
          >
            {dangerLoading === "karyawan" ? "Menghapus Karyawan..." : "Force Delete Seluruh Karyawan"}
          </Button>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800">3) Reset Draft Gaji Non-Staff ke Default</p>
          <p className="text-xs text-red-700">
            Menghapus draft gaji non-staff status Belum Dibayar pada periode tertentu. Data absensi tidak dihapus.
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="resetDraftPeriodeAwal">Periode Awal</Label>
              <Input
                id="resetDraftPeriodeAwal"
                type="date"
                value={resetDraftPeriodeAwal}
                onChange={(event) => onSetResetDraftPeriodeAwal(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resetDraftPeriodeAkhir">Periode Akhir</Label>
              <Input
                id="resetDraftPeriodeAkhir"
                type="date"
                value={resetDraftPeriodeAkhir}
                onChange={(event) => onSetResetDraftPeriodeAkhir(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resetDraftKaryawanId">ID Karyawan (opsional)</Label>
              <Input
                id="resetDraftKaryawanId"
                value={resetDraftKaryawanId}
                onChange={(event) => onSetResetDraftKaryawanId(event.target.value)}
                placeholder="Kosongkan untuk semua"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={dangerLoading !== null}
            onClick={onResetDraftGajiNonStaff}
          >
            {dangerLoading === "gaji" ? "Mereset Draft Gaji..." : "Reset Draft Gaji Non-Staff"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
