"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import type { CompanyFilter } from "@/lib/api/core";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/overlay/dialog";
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
import { Badge } from "@/components/ui/display/badge";
import { salaryAPI, generateSalaryAPI } from "@/lib/api";
import {
  exportNonStaffSlipGabunganPdf,
  exportNonStaffRekapPdf,
} from "@/lib/salary-slip-pdf";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  Building2,
  Calendar,
  Users,
  Coins,
  RefreshCw,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  Plus,
  Banknote,
  FileBarChart2,
} from "lucide-react";

type RekapHeader = {
  id: string;
  periodeAwal: string;
  periodeAkhir: string;
  lokasi: string;
  dibuatOleh: string;
  diketahuiOleh: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
  jumlahKaryawan: number;
  totalNominal: number;
  jumlahGajiRecord?: number;
};

type GajiItemDetail = {
  id: string;
  karyawanId: string;
  periodeAwal: string;
  periodeAkhir: string;
  totalHariMasuk: number;
  totalHariSetengahHari: number;
  totalHariEfektif: number;
  bonus: number;
  potongan: number;
  gajiPokok: number;
  totalGaji: number;
  totalGajiBersih: number;
  statusPembayaran: string;
  lokasi: string;
  sisaPiutang?: number | null;
  karyawan?: {
    id: string;
    namaLengkap: string;
    departemen: string;
    nik?: string;
    gajiPerHari?: number;
  };
  absensi?: Array<{
    id: string;
    tanggal: string;
    status: string;
    isLembur?: boolean;
    hariEfektif?: number;
    divisiKerja?: string;
  }>;
  gajiBonus?: Array<{ id: string; judul: string; nominal: number }>;
  gajiPotongan?: Array<{ id: string; judul: string; nominal: number; isDefault?: boolean }>;
  bonusItems?: Array<{ id?: string; label?: string; judul?: string; nominal: number }>;
  potonganItems?: Array<{ id?: string; label?: string; judul?: string; nominal: number; isDefault?: boolean }>;
  piutangCicilan?: Array<{ id: string; piutangId: string; jumlahDipotong: number; sisaSaldoSetelah: number }>;
};

type RekapDetailData = RekapHeader & {
  gaji: GajiItemDetail[];
};

type ItemRowState = {
  id?: string;
  judul: string;
  nominal: number;
  isDefault?: boolean;
};

export default function RekapanPage() {
  const [company, setCompany] = useState<CompanyFilter>("");
  const [rekapanList, setRekapanList] = useState<RekapHeader[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Detail State
  const [selectedRekapId, setSelectedRekapId] = useState<string | null>(null);
  const [rekapDetail, setRekapDetail] = useState<RekapDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Edit Bonus/Potongan Modal State (Itemized)
  const [editingGaji, setEditingGaji] = useState<GajiItemDetail | null>(null);
  const [draftBonusItems, setDraftBonusItems] = useState<ItemRowState[]>([]);
  const [draftPotonganItems, setDraftPotonganItems] = useState<ItemRowState[]>([]);
  const [draftCicilanPinjaman, setDraftCicilanPinjaman] = useState<number | null>(null);
  const [hasPiutang, setHasPiutang] = useState<boolean>(false);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [confirmingSaveEdit, setConfirmingSaveEdit] = useState<boolean>(false);

  // Rekap Ulang Confirmation State
  const [confirmingRekapUlang, setConfirmingRekapUlang] = useState<boolean>(false);
  const [rekapUlangSubmitting, setRekapUlangSubmitting] = useState<boolean>(false);

  // Delete Absensi Confirmation State
  const [deletingAbsensiId, setDeletingAbsensiId] = useState<string | null>(null);
  const [deletingAbsensiSubmitting, setDeletingAbsensiSubmitting] = useState<boolean>(false);

  // PDF Exporting states
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingRekapPdf, setExportingRekapPdf] = useState<boolean>(false);

  // Global Messages
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const fetchRekapList = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await salaryAPI.getRekapList(company, pagination.page, pagination.limit);
      setRekapanList(res.items || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: res.pagination?.totalPages || 1,
        totalCount: res.pagination?.totalCount || 0,
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal mengambil daftar rekapan");
    } finally {
      setLoading(false);
    }
  }, [company, pagination.page, pagination.limit]);

  const fetchRekapDetail = useCallback(async (id: string) => {
    try {
      setLoadingDetail(true);
      setErrorMsg("");
      const res = await salaryAPI.getRekapDetail(id);
      setRekapDetail(res);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal mengambil detail rekapan");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchRekapList();
  }, [fetchRekapList]);

  useEffect(() => {
    if (selectedRekapId) {
      fetchRekapDetail(selectedRekapId);
    } else {
      setRekapDetail(null);
    }
  }, [selectedRekapId, fetchRekapDetail]);

  const handleSelectRekap = (rekap: RekapHeader) => {
    setSelectedRekapId(rekap.id);
  };

  const handleBackToList = () => {
    setSelectedRekapId(null);
    setRekapDetail(null);
  };

  // Open Edit Bonus/Potongan/Pinjaman Dialog (Itemized)
  const handleOpenEdit = (gaji: GajiItemDetail) => {
    setEditingGaji(gaji);

    // 1. Parse Bonus Items
    let bItems: ItemRowState[] = [];
    if (Array.isArray(gaji.bonusItems) && gaji.bonusItems.length > 0) {
      bItems = gaji.bonusItems.map((b) => ({
        id: b.id,
        judul: String(b.judul || b.label || "Bonus"),
        nominal: Number(b.nominal || 0),
      }));
    } else if (Array.isArray(gaji.gajiBonus) && gaji.gajiBonus.length > 0) {
      bItems = gaji.gajiBonus.map((b) => ({
        id: String(b.id),
        judul: String(b.judul || "Bonus"),
        nominal: Number(b.nominal || 0),
      }));
    } else if (Number(gaji.bonus || 0) > 0) {
      bItems = [{ judul: "Bonus", nominal: Number(gaji.bonus) }];
    }
    setDraftBonusItems(bItems);

    // 2. Parse Potongan Items
    let pItems: ItemRowState[] = [];
    if (Array.isArray(gaji.potonganItems) && gaji.potonganItems.length > 0) {
      pItems = gaji.potonganItems.map((p) => ({
        id: p.id,
        judul: String(p.judul || p.label || "Potongan"),
        nominal: Number(p.nominal || 0),
        isDefault: p.isDefault,
      }));
    } else if (Array.isArray(gaji.gajiPotongan) && gaji.gajiPotongan.length > 0) {
      pItems = gaji.gajiPotongan.map((p) => ({
        id: String(p.id),
        judul: String(p.judul || "Potongan"),
        nominal: Number(p.nominal || 0),
        isDefault: p.isDefault,
      }));
    } else if (Number(gaji.potongan || 0) > 0) {
      pItems = [{ judul: "Potongan", nominal: Number(gaji.potongan) }];
    }
    setDraftPotonganItems(pItems);

    // 3. Parse Pinjaman / Cicilan
    let cicilanVal = 0;
    let piutangExists = false;
    if (Array.isArray(gaji.piutangCicilan) && gaji.piutangCicilan.length > 0) {
      cicilanVal = Number(gaji.piutangCicilan[0].jumlahDipotong || 0);
      piutangExists = true;
    } else if (gaji.sisaPiutang != null) {
      cicilanVal = 0;
      piutangExists = true;
    }

    setDraftCicilanPinjaman(piutangExists ? cicilanVal : null);
    setHasPiutang(piutangExists);
  };

  // Handlers for draft items
  const handleAddBonusItem = () => {
    setDraftBonusItems((prev) => [...prev, { judul: "", nominal: 0 }]);
  };

  const handleUpdateBonusItem = (index: number, field: "judul" | "nominal", val: any) => {
    setDraftBonusItems((prev) => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: val };
      return list;
    });
  };

  const handleRemoveBonusItem = (index: number) => {
    setDraftBonusItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPotonganItem = () => {
    setDraftPotonganItems((prev) => [...prev, { judul: "", nominal: 0 }]);
  };

  const handleUpdatePotonganItem = (index: number, field: "judul" | "nominal", val: any) => {
    setDraftPotonganItems((prev) => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: val };
      return list;
    });
  };

  const handleRemovePotonganItem = (index: number) => {
    setDraftPotonganItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Itemized Bonus, Potongan & Pinjaman (with explicit user confirmation)
  const handleSaveBonusPotonganSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGaji) return;
    setConfirmingSaveEdit(true);
  };

  const handleExecuteSaveBonusPotongan = async () => {
    if (!editingGaji) return;
    setErrorMsg("");
    setSuccessMsg("");

    const validBonus = draftBonusItems
      .map((b) => ({
        ...b,
        judul: b.judul.trim(),
        nominal: Number(b.nominal || 0),
      }))
      .filter((b) => Boolean(b.judul));

    const validPotongan = draftPotonganItems
      .map((p) => ({
        ...p,
        judul: p.judul.trim(),
        nominal: Number(p.nominal || 0),
      }))
      .filter((p) => Boolean(p.judul));

    try {
      setSubmittingEdit(true);
      await salaryAPI.updateBonusPotonganRekap(editingGaji.id, {
        bonusItems: validBonus,
        potonganItems: validPotongan,
        cicilanPinjaman: hasPiutang ? Number(draftCicilanPinjaman || 0) : null,
      });

      setSuccessMsg("Bonus, potongan & cicilan pinjaman berhasil disimpan ke database!");
      setConfirmingSaveEdit(false);
      setEditingGaji(null);
      if (selectedRekapId) {
        await fetchRekapDetail(selectedRekapId);
      }
      fetchRekapList();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengupdate rincian bonus & potongan");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Delete Single Absensi with Recalculate
  const handleConfirmDeleteAbsensi = async () => {
    if (!deletingAbsensiId) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setDeletingAbsensiSubmitting(true);
      await salaryAPI.deleteAbsensiWithRecalculate(deletingAbsensiId);
      setSuccessMsg("Record absensi berhasil dihapus dan gaji dihitung ulang!");
      setDeletingAbsensiId(null);
      if (selectedRekapId) {
        await fetchRekapDetail(selectedRekapId);
      }
      fetchRekapList();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus absensi");
    } finally {
      setDeletingAbsensiSubmitting(false);
    }
  };

  // Trigger Rekap Ulang for all employees in this rekap batch (Button 1)
  const handleConfirmRekapUlang = async () => {
    if (!rekapDetail) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setRekapUlangSubmitting(true);
      const karyawanIds = Array.from(new Set(rekapDetail.gaji.map((g) => g.karyawanId)));
      const periodeAwalStr = rekapDetail.periodeAwal.slice(0, 10);
      const periodeAkhirStr = rekapDetail.periodeAkhir.slice(0, 10);

      await generateSalaryAPI.generateNonStaffMingguan(
        periodeAwalStr,
        periodeAkhirStr,
        undefined,
        karyawanIds,
        undefined,
        (rekapDetail.lokasi as CompanyFilter) || company
      );

      setSuccessMsg("Proses rekap ulang absensi berhasil dieksekusi!");
      setConfirmingRekapUlang(false);
      await fetchRekapDetail(rekapDetail.id);
      fetchRekapList();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal merekap ulang absensi");
    } finally {
      setRekapUlangSubmitting(false);
    }
  };

  // Export Rekap Semua PDF (Button 2)
  const handleExportRekapSemuaPdf = async () => {
    if (!rekapDetail || !rekapDetail.gaji || rekapDetail.gaji.length === 0) {
      setErrorMsg("Tidak ada data gaji untuk diexport.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setExportingRekapPdf(true);

      const rows = rekapDetail.gaji.map((g) => {
        const bonusItems = Array.isArray(g.bonusItems) && g.bonusItems.length > 0
          ? g.bonusItems.map((b) => ({ judul: String(b.judul || b.label || "Bonus"), nominal: Number(b.nominal || 0) }))
          : Array.isArray(g.gajiBonus) && g.gajiBonus.length > 0
          ? g.gajiBonus.map((b) => ({ judul: String(b.judul || "Bonus"), nominal: Number(b.nominal || 0) }))
          : Number(g.bonus || 0) > 0
          ? [{ judul: "Bonus", nominal: Number(g.bonus) }]
          : [];

        const potonganItems = Array.isArray(g.potonganItems) && g.potonganItems.length > 0
          ? g.potonganItems.map((p) => ({ judul: String(p.judul || p.label || "Potongan"), nominal: Number(p.nominal || 0) }))
          : Array.isArray(g.gajiPotongan) && g.gajiPotongan.length > 0
          ? g.gajiPotongan.map((p) => ({ judul: String(p.judul || "Potongan"), nominal: Number(p.nominal || 0) }))
          : Number(g.potongan || 0) > 0
          ? [{ judul: "Potongan", nominal: Number(g.potongan) }]
          : [];

        const gajiPokok = Number(g.gajiPokok || g.totalGaji || 0);

        return {
          nama: g.karyawan?.namaLengkap || "Karyawan",
          divisi: g.karyawan?.departemen || "-",
          hariEfektif: Number(g.totalHariEfektif || 0),
          upahHarian: Number(g.karyawan?.gajiPerHari || 0),
          gajiPokok,
          totalBonus: Number(g.bonus || 0),
          totalPotongan: Number(g.potongan || 0),
          gajiBersih: Number(g.totalGajiBersih || 0),
          bonusItems,
          potonganItems,
        };
      });

      const activeBonusCols = new Set<string>();
      const activePotonganCols = new Set<string>();

      rows.forEach((r) => {
        r.bonusItems.forEach((b) => {
          if (b.judul.trim() && b.nominal > 0) activeBonusCols.add(b.judul.trim());
        });
        r.potonganItems.forEach((p) => {
          if (p.judul.trim() && p.nominal > 0) activePotonganCols.add(p.judul.trim());
        });
      });

      const periodeAwalStr = rekapDetail.periodeAwal.slice(0, 10);
      const periodeAkhirStr = rekapDetail.periodeAkhir.slice(0, 10);

      await exportNonStaffRekapPdf(
        rows,
        {
          location: rekapDetail.lokasi,
          periodLabel: `${new Date(rekapDetail.periodeAwal).toLocaleDateString("id-ID")} s/d ${new Date(rekapDetail.periodeAkhir).toLocaleDateString("id-ID")}`,
          bonusColumns: Array.from(activeBonusCols),
          potonganColumns: Array.from(activePotonganCols),
          diketahuiOleh: rekapDetail.diketahuiOleh || "-",
          dibuatOleh: rekapDetail.dibuatOleh || "-",
          catatan: rekapDetail.catatan || undefined,
        },
        `rekap-gaji-nonstaff-${periodeAwalStr}_${periodeAkhirStr}.pdf`
      );

      setSuccessMsg("File PDF Rekap Semua berhasil diexport!");
    } catch (err: any) {
      console.error("Export rekap PDF error:", err);
      setErrorMsg(err.message || "Gagal mengexport PDF Rekap Semua");
    } finally {
      setExportingRekapPdf(false);
    }
  };

  // Generate & Download PDF Slips (Button 3)
  const handleGeneratePdfSlips = async () => {
    if (!selectedRekapId || !rekapDetail) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setExportingPdf(true);
      const res = await salaryAPI.getRekapSlipPayload(selectedRekapId);
      const payloads = res.payloads || [];

      if (payloads.length === 0) {
        setErrorMsg("Tidak ada data slip yang tersedia untuk direkap ke PDF.");
        return;
      }

      await exportNonStaffSlipGabunganPdf(
        payloads,
        res.fileName || `slip-gaji-nonstaff-${rekapDetail.periodeAwal.slice(0, 10)}_${rekapDetail.periodeAkhir.slice(0, 10)}.pdf`
      );
      setSuccessMsg("File PDF slip gaji berhasil dibuat & di-download!");
    } catch (err: any) {
      console.error("Export slip PDF error:", err);
      setErrorMsg(err.message || "Gagal mengexport PDF slip gaji");
    } finally {
      setExportingPdf(false);
    }
  };

  // Live Summary Calculations for Dialog
  const liveTotalBonus = draftBonusItems.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const liveTotalPotonganItems = draftPotonganItems.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const liveCicilan = hasPiutang ? (Number(draftCicilanPinjaman) || 0) : 0;
  const liveTotalPotonganOverall = liveTotalPotonganItems + liveCicilan;
  const gajiPokokVal = Number(editingGaji?.gajiPokok || editingGaji?.totalGaji || 0);
  const liveGajiBersih = Math.max(0, gajiPokokVal + liveTotalBonus - liveTotalPotonganOverall);

  return (
    <div className="p-6 space-y-6 bg-zinc-50/50 min-h-[calc(100vh-4rem)]">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            {selectedRekapId && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackToList}
                className="h-8 w-8 rounded-lg mr-1"
                title="Kembali ke Daftar Rekapan"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-zinc-700" />
              Rekapan Pembayaran Gaji
            </h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedRekapId
              ? `Detail Rekapan Periode ${rekapDetail ? `${new Date(rekapDetail.periodeAwal).toLocaleDateString("id-ID")} - ${new Date(rekapDetail.periodeAkhir).toLocaleDateString("id-ID")}` : "..."}`
              : "Daftar arsip batch rekapan pembayaran gaji non-staff per periode dan lokasi."}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!selectedRekapId && <CompanySwitcher value={company} onChange={setCompany} />}
          <Button
            variant="outline"
            size="icon"
            onClick={() => (selectedRekapId ? fetchRekapDetail(selectedRekapId) : fetchRekapList())}
            disabled={loading || loadingDetail}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading || loadingDetail ? "animate-spin" : ""}`} />
          </Button>

          {/* 3 Main Action Buttons matching Step 3 / Fase 3 */}
          {selectedRekapId && rekapDetail && (
            <>
              {/* BUTTON 1: Rekap Ulang */}
              <Button
                variant="outline"
                onClick={() => setConfirmingRekapUlang(true)}
                className="gap-2 rounded-xl text-xs font-semibold border-zinc-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Rekap Ulang
              </Button>

              {/* BUTTON 2: Export Rekap Semua (PDF) */}
              <Button
                variant="outline"
                onClick={handleExportRekapSemuaPdf}
                disabled={exportingRekapPdf}
                className="gap-2 rounded-xl text-xs font-semibold border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              >
                <FileBarChart2 className="h-3.5 w-3.5" />
                {exportingRekapPdf ? "Exporting..." : "Export Rekap Semua (PDF)"}
              </Button>

              {/* BUTTON 3: Generate Ulang Slip PDF */}
              <Button
                onClick={handleGeneratePdfSlips}
                disabled={exportingPdf}
                className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                {exportingPdf ? "Membuat PDF..." : "Generate Ulang Slip PDF"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content View */}
      {!selectedRekapId ? (
        /* Card Grid View for Rekapan Batches */
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-3"></div>
              <p className="text-sm font-medium">Memuat data rekapan pembayaran...</p>
            </div>
          ) : rekapanList.length === 0 ? (
            <Card className="border-dashed border-2 border-zinc-200 bg-white">
              <CardContent className="py-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <FileText className="h-10 w-10 text-zinc-300" />
                <p className="font-semibold text-zinc-600 text-sm">Belum Ada Rekapan Pembayaran</p>
                <p className="text-xs text-zinc-400">
                  Rekapan pembayaran akan muncul secara otomatis di sini setelah proses simpan rekapan di eksekusi.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rekapanList.map((rekap) => (
                <Card
                  key={rekap.id}
                  onClick={() => handleSelectRekap(rekap)}
                  className="rounded-2xl border-zinc-100 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group overflow-hidden"
                >
                  <CardHeader className="p-5 pb-3 border-b border-zinc-50 bg-zinc-50/40 flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-zinc-900 text-white hover:bg-zinc-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {rekap.lokasi}
                        </Badge>
                        <span className="text-xs font-semibold text-zinc-500">
                          #{rekap.id}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-amber-600 transition-colors pt-1">
                        {new Date(rekap.periodeAwal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        -{" "}
                        {new Date(rekap.periodeAkhir).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </CardTitle>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-[10px] font-semibold uppercase text-zinc-400">Total Karyawan</p>
                        <p className="font-bold text-zinc-800 text-sm mt-0.5 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-zinc-500" />
                          {rekap.jumlahKaryawan} Orang
                        </p>
                      </div>
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-semibold uppercase text-amber-700">Total Nominal</p>
                        <p className="font-bold text-amber-900 text-sm mt-0.5 flex items-center gap-1">
                          <Coins className="h-3.5 w-3.5 text-amber-600" />
                          {formatCurrency(rekap.totalNominal)}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-500 space-y-1 pt-1 border-t border-zinc-50">
                      <p className="flex items-center justify-between">
                        <span>Dibuat oleh:</span>
                        <span className="font-semibold text-zinc-700">{rekap.dibuatOleh}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Diketahui oleh:</span>
                        <span className="font-semibold text-zinc-700">{rekap.diketahuiOleh}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Detail View for Selected Rekapan Batch */
        <div className="space-y-6">
          {loadingDetail || !rekapDetail ? (
            <div className="py-20 text-center text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-3"></div>
              <p className="text-sm font-medium">Memuat detail rekapan...</p>
            </div>
          ) : (
            <>
              {/* Rekapan Summary Box */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-400">Perusahaan / Lokasi</p>
                      <p className="text-base font-bold text-zinc-900">{rekapDetail.lokasi}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-400">Rentang Periode</p>
                      <p className="text-xs font-bold text-zinc-900">
                        {new Date(rekapDetail.periodeAwal).toLocaleDateString("id-ID")} -{" "}
                        {new Date(rekapDetail.periodeAkhir).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-zinc-400">Jumlah Karyawan</p>
                      <p className="text-base font-bold text-zinc-900">{rekapDetail.jumlahKaryawan} Orang</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-tr from-amber-50 to-yellow-50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-amber-700">Total Nominal Gaji</p>
                      <p className="text-base font-bold text-amber-950">{formatCurrency(rekapDetail.totalNominal)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rekapan Financial Summary Cards Panel */}
              {(() => {
                const sumHariEfektif = rekapDetail.gaji.reduce((s, g) => s + Number(g.totalHariEfektif || 0), 0);
                const sumPokok = rekapDetail.gaji.reduce((s, g) => s + Number(g.gajiPokok || g.totalGaji || 0), 0);
                const sumBonus = rekapDetail.gaji.reduce((s, g) => s + Number(g.bonus || 0), 0);
                const sumBruto = sumPokok + sumBonus;
                const sumBersih = rekapDetail.gaji.reduce((s, g) => s + Number(g.totalGajiBersih || 0), 0);
                const sumPinjaman = rekapDetail.gaji.reduce((s, g) => {
                  let cicilan = 0;
                  if (Array.isArray(g.piutangCicilan) && g.piutangCicilan.length > 0) {
                    cicilan = Number(g.piutangCicilan[0].jumlahDipotong || 0);
                  }
                  return s + cicilan;
                }, 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Card className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Gaji Pokok</p>
                        <p className="text-lg font-extrabold text-zinc-900 mt-1">{formatCurrency(sumPokok)}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{sumHariEfektif} Hari Efektif</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Semua Bonus</p>
                        <p className="text-lg font-extrabold text-emerald-900 mt-1">+{formatCurrency(sumBonus)}</p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Akumulasi Seluruh Item Bonus</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Total Gaji Bruto</p>
                        <p className="text-lg font-extrabold text-amber-950 mt-1">{formatCurrency(sumBruto)}</p>
                        <p className="text-[10px] font-semibold text-amber-800 mt-0.5">(Gaji Pokok + Total Bonus)</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-rose-200 bg-rose-50/40 shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Rekapan Pinjaman</p>
                        <p className="text-lg font-extrabold text-rose-900 mt-1">{formatCurrency(sumPinjaman)}</p>
                        <p className="text-[10px] text-rose-600 mt-0.5">Total Cicilan Piutang</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-zinc-900 bg-zinc-900 text-white shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Total Upah Diterima</p>
                        <p className="text-lg font-extrabold text-white mt-1">{formatCurrency(sumBersih)}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Gaji Bersih Setelah Potongan</p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Employee Payroll Records Table */}
              <Card className="rounded-2xl border-zinc-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-zinc-900">Rincian Gaji Karyawan</CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      Kelola absensi harian, bonus/potongan, dan nominal gaji per karyawan pada rekapan ini.
                    </CardDescription>
                  </div>
                  <span className="text-xs font-semibold bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full">
                    {rekapDetail.gaji.length} Baris Data
                  </span>
                </CardHeader>

                {/* Legend Keterangan Badge Absensi */}
                <div className="px-5 py-2.5 bg-zinc-50/80 border-b border-zinc-100 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-700">Keterangan Badge Absensi:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">1</span>
                    <span>Hadir (1 Hari)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">0.5</span>
                    <span>Setengah Hari</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded">2</span>
                    <span className="font-medium text-purple-950">Hadir + Lembur (2 Hari)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">0</span>
                    <span>Tidak Hadir / Off</span>
                  </span>
                </div>

                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/70">
                      <TableRow>
                        <TableHead className="font-semibold text-xs py-3.5">Karyawan & Divisi</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5">Absensi Harian</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5 text-center">Hari Efektif</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5 text-right">Gaji Pokok</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5 text-right">Bonus</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5 text-right font-bold text-amber-900 bg-amber-50/50">Gaji Bruto</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5 text-right">Potongan</TableHead>
                        <TableHead className="font-semibold text-xs py-3.5 text-right">Gaji Bersih</TableHead>
                        <TableHead className="w-16 text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rekapDetail.gaji.map((gajiItem) => {
                        const pokVal = Number(gajiItem.gajiPokok || gajiItem.totalGaji || 0);
                        const bonVal = Number(gajiItem.bonus || 0);
                        const brutoVal = pokVal + bonVal;

                        return (
                        <TableRow key={gajiItem.id} className="hover:bg-zinc-50/50">
                          {/* Karyawan Name & Division */}
                          <TableCell className="align-top py-4">
                            <div>
                              <p className="font-bold text-zinc-900 text-sm">
                                {gajiItem.karyawan?.namaLengkap || "Karyawan"}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {gajiItem.karyawan?.departemen || "-"}
                              </p>
                            </div>
                          </TableCell>

                          {/* Daily Absensi List with Delete Action */}
                          <TableCell className="align-top py-4 max-w-[280px]">
                            {!gajiItem.absensi || gajiItem.absensi.length === 0 ? (
                              <span className="text-xs text-zinc-400 italic">Tidak ada log absensi</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {gajiItem.absensi.map((abs) => (
                                  <div
                                    key={abs.id}
                                    className="inline-flex items-center gap-1 bg-zinc-100 border border-zinc-200/80 px-2 py-1 rounded-lg text-[11px]"
                                  >
                                    <span className="font-medium text-zinc-700">
                                      {new Date(abs.tanggal).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                      })}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-1 rounded ${
                                        abs.isLembur || Number(abs.hariEfektif || 0) > 1
                                          ? "bg-purple-100 text-purple-900 border border-purple-300"
                                          : abs.status === "HADIR"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : abs.status === "SETENGAH_HARI"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-rose-100 text-rose-800"
                                      }`}
                                      title={abs.isLembur ? "Hadir + Lembur (2 Hari Efektif)" : undefined}
                                    >
                                      {Number(abs.hariEfektif ?? (abs.isLembur ? 2 : abs.status === "HADIR" ? 1 : abs.status === "SETENGAH_HARI" ? 0.5 : 0))}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingAbsensiId(abs.id)}
                                      className="text-zinc-400 hover:text-rose-600 transition-colors ml-0.5"
                                      title="Hapus Absensi Hari Ini"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>

                          {/* Hari Efektif */}
                          <TableCell className="align-top py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800">
                              {Number(gajiItem.totalHariEfektif || 0)} Hari
                            </span>
                          </TableCell>

                          {/* Gaji Pokok */}
                          <TableCell className="align-top py-4 text-right font-medium text-xs text-zinc-800">
                            {formatCurrency(pokVal)}
                          </TableCell>

                          {/* Bonus */}
                          <TableCell className="align-top py-4 text-right font-medium text-xs text-emerald-700">
                            {formatCurrency(bonVal)}
                          </TableCell>

                          {/* Gaji Bruto (Gaji Pokok + Bonus) */}
                          <TableCell className="align-top py-4 text-right font-bold text-xs text-amber-900 bg-amber-50/30">
                            {formatCurrency(brutoVal)}
                          </TableCell>

                          {/* Potongan */}
                          <TableCell className="align-top py-4 text-right font-medium text-xs text-rose-700">
                            {formatCurrency(gajiItem.potongan)}
                          </TableCell>

                          {/* Gaji Bersih */}
                          <TableCell className="align-top py-4 text-right font-bold text-sm text-zinc-950">
                            {formatCurrency(gajiItem.totalGajiBersih)}
                          </TableCell>

                          {/* Actions: Edit Bonus/Potongan */}
                          <TableCell className="align-top py-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(gajiItem)}
                              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
                              title="Edit Bonus, Potongan & Pinjaman"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}

                      {/* Summary Totals Row */}
                      {(() => {
                        const sumHariEfektif = rekapDetail.gaji.reduce((s, g) => s + Number(g.totalHariEfektif || 0), 0);
                        const sumPokok = rekapDetail.gaji.reduce((s, g) => s + Number(g.gajiPokok || g.totalGaji || 0), 0);
                        const sumBonus = rekapDetail.gaji.reduce((s, g) => s + Number(g.bonus || 0), 0);
                        const sumBruto = sumPokok + sumBonus;
                        const sumPotongan = rekapDetail.gaji.reduce((s, g) => s + Number(g.potongan || 0), 0);
                        const sumBersih = rekapDetail.gaji.reduce((s, g) => s + Number(g.totalGajiBersih || 0), 0);
                        const sumPinjaman = rekapDetail.gaji.reduce((s, g) => {
                          let cicilan = 0;
                          if (Array.isArray(g.piutangCicilan) && g.piutangCicilan.length > 0) {
                            cicilan = Number(g.piutangCicilan[0].jumlahDipotong || 0);
                          }
                          return s + cicilan;
                        }, 0);

                        return (
                          <TableRow className="bg-zinc-100/90 font-bold border-t-2 border-zinc-300">
                            <TableCell colSpan={2} className="py-3.5 text-zinc-900 font-bold text-sm">
                              TOTAL SUMMARY
                            </TableCell>
                            <TableCell className="py-3.5 text-center font-bold text-xs text-zinc-900">
                              {sumHariEfektif} Hari
                            </TableCell>
                            <TableCell className="py-3.5 text-right font-bold text-xs text-zinc-900">
                              {formatCurrency(sumPokok)}
                            </TableCell>
                            <TableCell className="py-3.5 text-right font-bold text-xs text-emerald-800">
                              {formatCurrency(sumBonus)}
                            </TableCell>
                            <TableCell className="py-3.5 text-right font-bold text-xs text-amber-950 bg-amber-100/70">
                              {formatCurrency(sumBruto)}
                            </TableCell>
                            <TableCell className="py-3.5 text-right font-bold text-xs text-rose-800" title={sumPinjaman > 0 ? `Termasuk total cicilan pinjaman: ${formatCurrency(sumPinjaman)}` : undefined}>
                              <div>
                                {formatCurrency(sumPotongan)}
                                {sumPinjaman > 0 && (
                                  <p className="text-[10px] font-normal text-rose-600">
                                    Pinjaman: {formatCurrency(sumPinjaman)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 text-right font-bold text-sm text-zinc-950">
                              {formatCurrency(sumBersih)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Dialog Edit Bonus, Potongan & Pinjaman (Itemized) */}
      <Dialog open={Boolean(editingGaji)} onOpenChange={(open) => !open && setEditingGaji(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600" />
              Edit Rincian Bonus, Potongan &amp; Pinjaman
            </DialogTitle>
            <DialogDescription>
              Kelola rincian item bonus, potongan, dan cicilan pinjaman untuk{" "}
              <span className="font-bold text-zinc-900">{editingGaji?.karyawan?.namaLengkap}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBonusPotonganSubmit} className="space-y-6 pt-2">
            {/* SECTION 1: ITEM BONUS */}
            <div className="space-y-3 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-600" /> Item Bonus
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBonusItem}
                  className="h-7 text-xs bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Bonus
                </Button>
              </div>

              {draftBonusItems.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">Belum ada item bonus.</p>
              ) : (
                <div className="space-y-2">
                  {draftBonusItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Nama Bonus (mis: Kerajinan)"
                        value={item.judul}
                        onChange={(e) => handleUpdateBonusItem(idx, "judul", e.target.value)}
                        className="rounded-lg h-9 text-xs flex-1 bg-white"
                        required
                      />
                      <div className="w-36 relative">
                        <span className="absolute left-2.5 top-2.5 text-[10px] font-semibold text-zinc-400">Rp</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={item.nominal || ""}
                          onChange={(e) => handleUpdateBonusItem(idx, "nominal", Number(e.target.value))}
                          className="rounded-lg h-9 text-xs pl-7 text-right bg-white font-medium"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBonusItem(idx)}
                        className="h-8 w-8 text-zinc-400 hover:text-rose-600 rounded-lg shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: ITEM POTONGAN */}
            <div className="space-y-3 p-4 bg-rose-50/40 rounded-xl border border-rose-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-rose-600" /> Item Potongan
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPotonganItem}
                  className="h-7 text-xs bg-white border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg gap-1 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Potongan
                </Button>
              </div>

              {draftPotonganItems.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">Belum ada item potongan.</p>
              ) : (
                <div className="space-y-2">
                  {draftPotonganItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Nama Potongan (mis: Keterlambatan)"
                        value={item.judul}
                        onChange={(e) => handleUpdatePotonganItem(idx, "judul", e.target.value)}
                        className="rounded-lg h-9 text-xs flex-1 bg-white"
                        required
                      />
                      <div className="w-36 relative">
                        <span className="absolute left-2.5 top-2.5 text-[10px] font-semibold text-zinc-400">Rp</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={item.nominal || ""}
                          onChange={(e) => handleUpdatePotonganItem(idx, "nominal", Number(e.target.value))}
                          className="rounded-lg h-9 text-xs pl-7 text-right bg-white font-medium"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePotonganItem(idx)}
                        className="h-8 w-8 text-zinc-400 hover:text-rose-600 rounded-lg shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 3: POTONGAN PINJAMAN (CICILAN) */}
            <div className="space-y-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-amber-700" /> Potongan Pinjaman (Cicilan)
              </h3>

              {hasPiutang || draftCicilanPinjaman !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-zinc-700 flex-1">
                      Cicilan Piutang Minggu Ini:
                    </label>
                    <div className="w-40 relative">
                      <span className="absolute left-2.5 top-2.5 text-[10px] font-semibold text-zinc-400">Rp</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={draftCicilanPinjaman ?? 0}
                        onChange={(e) => setDraftCicilanPinjaman(Math.max(0, Number(e.target.value)))}
                        className="rounded-lg h-9 text-xs pl-7 text-right bg-white font-medium"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    *Mengubah nominal ini akan otomatis menyesuaikan sisa saldo pada piutang induk karyawan.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-amber-800/70 italic">
                  Karyawan ini tidak memiliki catatan piutang / cicilan pinjaman aktif pada periode ini.
                </p>
              )}
            </div>

            {/* SUMMARY FOOTER PANEL */}
            <div className="p-3.5 bg-zinc-100/80 rounded-xl space-y-1.5 text-xs text-zinc-700 border border-zinc-200/60">
              <div className="flex justify-between">
                <span>Gaji Pokok ({editingGaji?.totalHariEfektif || 0} hari):</span>
                <span className="font-semibold">{formatCurrency(gajiPokokVal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Bonus:</span>
                <span className="font-semibold">+{formatCurrency(liveTotalBonus)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Total Potongan (termasuk Pinjaman):</span>
                <span className="font-semibold">-{formatCurrency(liveTotalPotonganOverall)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-bold text-sm text-zinc-950">
                <span>Estimasi Gaji Bersih:</span>
                <span>{formatCurrency(liveGajiBersih)}</span>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingGaji(null)}
                className="rounded-xl text-zinc-500 hover:bg-zinc-100 text-xs"
                disabled={submittingEdit}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submittingEdit}
                className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm px-4 text-xs"
              >
                {submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Rekap Ulang */}
      <Dialog open={confirmingRekapUlang} onOpenChange={setConfirmingRekapUlang}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" /> Konfirmasi Rekap Ulang Absensi
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan meng-kalkulasi ulang data absensi terbaru untuk semua karyawan dalam rekapan ini. Data yang belum dikunci akan diperbarui.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmingRekapUlang(false)}
              className="rounded-xl text-zinc-500 hover:bg-zinc-100 text-xs"
              disabled={rekapUlangSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRekapUlang}
              disabled={rekapUlangSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-sm px-4 text-xs"
            >
              {rekapUlangSubmitting ? "Merekap Ulang..." : "Ya, Rekap Ulang Absensi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Absensi Harian */}
      <Dialog open={Boolean(deletingAbsensiId)} onOpenChange={(open) => !open && setDeletingAbsensiId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" /> Konfirmasi Hapus Absensi
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus record absensi hari ini? Gaji pokok dan total hari efektif karyawan akan otomatis dihitung ulang.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingAbsensiId(null)}
              className="rounded-xl text-zinc-500 hover:bg-zinc-100 text-xs"
              disabled={deletingAbsensiSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteAbsensi}
              disabled={deletingAbsensiSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm px-4 text-xs"
            >
              {deletingAbsensiSubmitting ? "Menghapus..." : "Ya, Hapus Absensi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Simpan Perubahan Edit Bonus/Potongan ke Database */}
      <Dialog open={confirmingSaveEdit} onOpenChange={setConfirmingSaveEdit}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> Konfirmasi Simpan ke Database
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyimpan perubahan rincian bonus, potongan, dan pinjaman untuk{" "}
              <span className="font-bold text-zinc-900">{editingGaji?.karyawan?.namaLengkap}</span> ke Database?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmingSaveEdit(false)}
              className="rounded-xl text-zinc-500 hover:bg-zinc-100 text-xs"
              disabled={submittingEdit}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleExecuteSaveBonusPotongan}
              disabled={submittingEdit}
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm px-4 text-xs"
            >
              {submittingEdit ? "Menyimpan..." : "Ya, Simpan ke Database"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
