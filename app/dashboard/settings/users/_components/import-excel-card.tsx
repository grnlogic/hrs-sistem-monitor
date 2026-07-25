"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/display/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Download, Upload, Loader2 } from "lucide-react";
import type { ImportErrorRow, ImportSummary } from "./types";

const IMPORT_GUIDE_ROWS = [
  {
    kolom: "departemen",
    nilai: "Blending | Packing | Sales | Staff | Linting",
    catatan: "Gunakan salah satu nilai ini saja.",
  },
  {
    kolom: "jabatan",
    nilai: "Karyawan | Supervisor | Manager",
    catatan: "Penulisan mengikuti template.",
  },
  {
    kolom: "statusKaryawan",
    nilai: "TETAP | KONTRAK",
    catatan: "Isi salah satu agar validasi lolos.",
  },
  {
    kolom: "lokasiDefault",
    nilai: "PJP | SP | PRIMA",
    catatan: "Kode lokasi wajib persis seperti ini.",
  },
  {
    kolom: "gajiPerBulan / gajiPerHari",
    nilai: "Boleh dikosongkan (opsional).",
    catatan: "Boleh bulanan walau bukan Staff (contoh: motoris).",
  },
  {
    kolom: "tanggalMasuk",
    nilai: "YYYY-MM-DD",
    catatan: "Contoh: 2026-04-08.",
  },
  {
    kolom: "nik",
    nilai: "Angka tanpa spasi/simbol",
    catatan: "NIK harus unik (tidak boleh duplikat).",
  },
] as const;

type ImportExcelCardProps = {
  isImporting: boolean;
  importError: string;
  importMessage: string;
  importSummary: ImportSummary | null;
  importErrors: ImportErrorRow[];
  selectedImportFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onImport: () => void;
};

export function ImportExcelCard({
  isImporting,
  importError,
  importMessage,
  importSummary,
  importErrors,
  selectedImportFile,
  onFileChange,
  onDownloadTemplate,
  onImport,
}: ImportExcelCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Massal Karyawan</CardTitle>
        <CardDescription>
          Download template Excel, isi data karyawan, lalu upload kembali untuk import massal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-zinc-50 p-4 space-y-3">
          <p className="text-sm font-semibold">Tutorial Pengisian (Agar Tidak Salah Ketik)</p>
          <p className="text-sm text-muted-foreground">
            Pastikan nilai kolom mengikuti format berikut supaya proses import tidak gagal.
          </p>
          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kolom</TableHead>
                  <TableHead>Nilai yang Benar</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {IMPORT_GUIDE_ROWS.map((item) => (
                  <TableRow key={item.kolom}>
                    <TableCell className="font-medium">{item.kolom}</TableCell>
                    <TableCell>{item.nilai}</TableCell>
                    <TableCell>{item.catatan}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Tips: gunakan tombol <span className="font-semibold">Download Template Excel</span> agar nama kolom dan contoh nilai sudah sesuai standar sistem.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm">1. Download template Excel, isi data karyawan, lalu upload kembali.</p>
          <Button type="button" variant="outline" onClick={onDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template Excel
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm">2. Upload file Excel yang sudah diisi:</p>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <Input
              type="file"
              accept=".xlsx"
              onChange={onFileChange}
            />
            <Button type="button" onClick={onImport} disabled={isImporting || !selectedImportFile}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isImporting ? "Sedang Memproses..." : "Upload & Import"}
            </Button>
          </div>
          {isImporting && (
            <p className="text-sm text-zinc-700 font-medium animate-pulse mt-2">
              Sedang mengupload dan memproses data Excel, mohon tunggu...
            </p>
          )}
        </div>

        {importError && (
          <Alert variant="destructive">
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}

        {importMessage && (
          <Alert>
            <AlertDescription>{importMessage}</AlertDescription>
          </Alert>
        )}

        {importSummary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{importSummary.total}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Valid</p>
              <p className="text-lg font-semibold">{importSummary.valid}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Invalid</p>
              <p className="text-lg font-semibold">{importSummary.invalid}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Berhasil Import</p>
              <p className="text-lg font-semibold">{importSummary.imported}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground">Gagal API</p>
              <p className="text-lg font-semibold">{importSummary.failed}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Hasil import muncul di sini</p>
          {importErrors.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importErrors.map((item, index) => (
                    <TableRow key={`${item.row}-${index}`}>
                      <TableCell>{item.row}</TableCell>
                      <TableCell>{item.nama}</TableCell>
                      <TableCell>{item.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada error validasi.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
