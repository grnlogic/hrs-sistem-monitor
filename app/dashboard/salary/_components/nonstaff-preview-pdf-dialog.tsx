"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/overlay/dialog";
import { Button } from "@/components/ui/form/button";
import { FileText, FileBarChart2, Loader2, Check, X } from "lucide-react";

type NonStaffPreviewPdfDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBayar: () => void;
  onGenerateSlipBlob: () => Promise<Blob>;
  onGenerateRekapBlob: () => Promise<Blob>;
  submitting?: boolean;
};

export function NonStaffPreviewPdfDialog({
  isOpen,
  onClose,
  onConfirmBayar,
  onGenerateSlipBlob,
  onGenerateRekapBlob,
  submitting = false,
}: NonStaffPreviewPdfDialogProps) {
  const [activeTab, setActiveTab] = useState<"slip" | "rekap">("slip");
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const currentUrlRef = useRef<string | null>(null);

  // Bersihkan object URL lama saat berganti atau ditutup
  const cleanupUrl = () => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setBlobUrl(null);
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupUrl();
      setErrorMsg("");
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg("");

    const loadPdf = async () => {
      try {
        const blob =
          activeTab === "slip"
            ? await onGenerateSlipBlob()
            : await onGenerateRekapBlob();

        if (!isMounted) return;

        cleanupUrl();
        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        console.error("Gagal memuat preview PDF:", err);
        if (isMounted) {
          setErrorMsg("Gagal menghasilkan dokumen preview PDF. Silakan coba lagi.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      cleanupUrl();
    };
  }, [isOpen, activeTab]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="shrink-0 space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900">
                Preview PDF Dokumen Pengupahan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pratinjau dokumen resmi di peramban. Format dan angka identik dengan yang akan tercetak.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 p-1 rounded-xl">
              <Button
                type="button"
                size="sm"
                variant={activeTab === "slip" ? "default" : "ghost"}
                onClick={() => setActiveTab("slip")}
                className={`text-xs h-8 gap-1.5 rounded-lg font-medium ${
                  activeTab === "slip"
                    ? "bg-white text-zinc-900 shadow-xs hover:bg-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Slip Gabungan
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === "rekap" ? "default" : "ghost"}
                onClick={() => setActiveTab("rekap")}
                className={`text-xs h-8 gap-1.5 rounded-lg font-medium ${
                  activeTab === "rekap"
                    ? "bg-white text-zinc-900 shadow-xs hover:bg-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <FileBarChart2 className="w-3.5 h-3.5" />
                Rekap Semua
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full min-h-0 mt-3 relative rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-zinc-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
              <span>Menyiapkan preview dokumen {activeTab === "slip" ? "Slip Gaji" : "Rekap Gaji"}...</span>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="p-4 text-center text-xs text-rose-600 max-w-md">
              {errorMsg}
            </div>
          )}

          {!loading && blobUrl && !errorMsg && (
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0 rounded-xl"
              title="Preview Dokumen PDF"
            />
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3 flex flex-row items-center justify-between sm:justify-between border-t mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border-zinc-200 text-xs h-10 px-5 font-medium text-zinc-700 hover:bg-zinc-100 gap-1.5"
          >
            <X className="w-4 h-4 text-zinc-500" />
            Batal
          </Button>

          <Button
            type="button"
            onClick={onConfirmBayar}
            disabled={submitting || loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-6 text-xs font-semibold shadow-xs"
          >
            <Check className="w-4 h-4" />
            {submitting ? "Memproses..." : "Bayar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
