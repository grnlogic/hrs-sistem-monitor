"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Database,
  Download,
  Upload,
  ShieldAlert,
  Building2,
  Users as UsersIcon,
  ChevronRight,
  Loader2,
  FileCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/feedback/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/overlay/dialog";
import { databaseAPI, RestorePreviewData } from "@/lib/api";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<RestorePreviewData | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Restore execution state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState("");
  const [restoreErrorMessage, setRestoreErrorMessage] = useState("");

  const isHRD = session?.user?.role === "HRD";

  useEffect(() => {
    if (session?.user?.role === "AKUNTANSI") {
      router.push("/dashboard/salary/staff");
    }
  }, [session, router]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError("");
    setExportMessage("");

    try {
      await databaseAPI.exportDatabase();
      setExportMessage("Export database berhasil! File .sql telah di-download.");
    } catch (err: any) {
      setExportError(err.message || "Gagal melakukan export database.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setRestoreErrorMessage("");
    setRestoreSuccessMessage("");
  };

  const handleOpenPreview = async () => {
    if (!selectedFile) {
      setRestoreErrorMessage("Pilih file backup .sql terlebih dahulu.");
      return;
    }

    setIsPreviewing(true);
    setRestoreErrorMessage("");
    setRestoreSuccessMessage("");

    try {
      const preview = await databaseAPI.previewRestore(selectedFile);
      setPreviewData(preview);
      setConfirmText("");
      setIsPreviewDialogOpen(true);
    } catch (err: any) {
      setRestoreErrorMessage(err.message || "Gagal membaca pratinjau file backup.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!previewData) return;
    if (confirmText.trim().toUpperCase() !== "RESTORE") return;

    setIsPreviewDialogOpen(false);
    setIsRestoring(true);
    setRestoreErrorMessage("");
    setRestoreSuccessMessage("");

    try {
      const result = await databaseAPI.executeRestore(previewData.previewId);
      setRestoreSuccessMessage(
        result.message || "Restore database berhasil! Seluruh data telah diperbarui."
      );
      setSelectedFile(null);
      setPreviewData(null);
      setConfirmText("");
    } catch (err: any) {
      setRestoreErrorMessage(err.message || "Gagal merestore database.");
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isHRD) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Memuat akses pengaturan...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Sistem</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola master data, manajemen user, serta backup & restore database HRD.
        </p>
      </div>

      {/* Navigasi Modul Pengaturan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/settings/divisi">
          <Card className="hover:border-primary/50 transition-all duration-200 cursor-pointer h-full group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                Master Divisi & Departemen
              </CardTitle>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <Building2 size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Kelola daftar nama divisi, kategori staf/non-staf, dan nominal bonus default divisi.
              </CardDescription>
              <div className="flex items-center text-xs font-medium text-primary mt-4 group-hover:translate-x-1 transition-transform">
                Buka Pengaturan Divisi <ChevronRight size={14} className="ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings/users">
          <Card className="hover:border-primary/50 transition-all duration-200 cursor-pointer h-full group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                Manajemen User & Danger Zone
              </CardTitle>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <UsersIcon size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Kelola akun akses HRD & Akuntansi, import data karyawan excel, serta pembersihan data.
              </CardDescription>
              <div className="flex items-center text-xs font-medium text-primary mt-4 group-hover:translate-x-1 transition-transform">
                Buka Manajemen User <ChevronRight size={14} className="ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Section: Backup & Restore Database */}
      <Card className="border-border">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Database size={22} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Backup & Restore Database</CardTitle>
              <CardDescription className="text-xs">
                Fitur ekspor backup database dan pemulihan (restore) PostgreSQL via file plain SQL.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Export Section */}
          <div className="rounded-xl border border-border p-5 bg-card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Download size={16} className="text-primary" />
                  Export Database (Download Backup .sql)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menghasilkan snapshot database PostgreSQL saat ini ke dalam file <code>.sql</code> (plain SQL dump).
                  File ini menyertakan skema dan seluruh baris data sehingga siap diaudit atau di-restore ulang pakai <code>psql</code>.
                </p>
              </div>
            </div>

            {exportError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Export Gagal</AlertTitle>
                <AlertDescription>{exportError}</AlertDescription>
              </Alert>
            )}

            {exportMessage && (
              <Alert variant="default" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle>Export Berhasil</AlertTitle>
                <AlertDescription>{exportMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2 font-medium"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Membuat Dump SQL...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Database Sekarang
                </>
              )}
            </Button>
          </div>

          {/* Import / Restore Section */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 p-5 bg-amber-50/30 dark:bg-amber-950/10 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <Upload size={16} className="text-amber-600" />
                Import & Restore Database (Upload .sql)
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-400 leading-relaxed">
                Restore data dari file backup <code>.sql</code>. Sebelum eksekusi, sistem akan memberikan pratinjau file dan meminta konfirmasi 2-langkah karena operasi ini bersifat mengganti/menimpa data.
              </p>
            </div>

            {restoreErrorMessage && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Restore Gagal</AlertTitle>
                <AlertDescription>{restoreErrorMessage}</AlertDescription>
              </Alert>
            )}

            {restoreSuccessMessage && (
              <Alert variant="default" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle>Restore Berhasil</AlertTitle>
                <AlertDescription>{restoreSuccessMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="backupFile" className="text-xs font-semibold">
                  Pilih File Backup SQL (.sql, maks 100MB)
                </Label>
                <Input
                  id="backupFile"
                  type="file"
                  accept=".sql"
                  onChange={handleFileChange}
                  className="cursor-pointer text-xs bg-background"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                disabled={!selectedFile || isPreviewing}
                className="gap-2 border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                {isPreviewing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Membaca File...
                  </>
                ) : (
                  <>
                    <FileCheck size={16} />
                    Pratinjau & Restore
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Pratinjau Restore (2-Step Confirmation) */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert size={20} />
              Konfirmasi Restore Database
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tinjau informasi file backup sebelum melanjutkan operasi restore.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 text-xs">
              {/* Ringkasan File */}
              <div className="rounded-lg border border-border p-3.5 bg-muted/40 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Nama File:</span>
                    <p className="font-semibold truncate">{previewData.fileName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ukuran File:</span>
                    <p className="font-semibold">{previewData.fileSizeFormatted}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimasi Statement SQL:</span>
                    <p className="font-semibold">{previewData.statementCount.toLocaleString()} statements</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status Validasi:</span>
                    <p className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Valid Dump PostgreSQL
                    </p>
                  </div>
                </div>
              </div>

              {/* Snippet Header File */}
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground">Pratinjau Header File Dump:</span>
                <pre className="p-3 bg-zinc-950 text-zinc-200 rounded-md font-mono text-[11px] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {previewData.previewLines.join("\n")}
                </pre>
              </div>

              {/* Warning Alert */}
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="font-bold">PERINGATAN OPERASI DESTRUKTIF!</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  Restore database akan <strong>MENGHAPUS dan MENIMPA</strong> seluruh data saat ini dengan data dari file backup.
                  Proses ini tidak dapat dibatalkan.
                </AlertDescription>
              </Alert>

              {/* 2-Step Verification Input */}
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4 bg-red-50/50 dark:bg-red-950/20 space-y-2">
                <Label htmlFor="confirmCode" className="font-bold text-red-800 dark:text-red-300">
                  Untuk mengonfirmasi eksekusi, ketik kata "RESTORE" di bawah ini:
                </Label>
                <Input
                  id="confirmCode"
                  type="text"
                  placeholder="Ketik RESTORE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="font-mono tracking-wider uppercase border-red-300 focus-visible:ring-red-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmText.trim().toUpperCase() !== "RESTORE"}
              onClick={handleExecuteRestore}
              className="gap-2 font-bold"
            >
              <Upload size={16} />
              Eksekusi Restore Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Loading Bar saat Restore Berjalan */}
      <Dialog open={isRestoring} onOpenChange={() => {}}>
        <DialogContent className="max-w-md p-6 text-center [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Proses Restore Database</DialogTitle>
            <DialogDescription>Database sedang diproses untuk restore data.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
              <Database className="absolute w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Sedang Merestore Database...</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Proses <code>psql</code> sedang merestore data. Mohon tunggu dan <strong>jangan menutup</strong> halaman ini.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
