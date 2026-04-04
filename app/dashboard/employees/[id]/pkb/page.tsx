"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { ArrowLeft, FileText, Printer, Download, Save, Upload, Eye } from "lucide-react";
import { employeeAPI } from "@/lib/api";
import { printPKBPDF, downloadPKBPDF } from "@/lib/utils";
import type { PKBData, TipeUpahPKB } from "@/lib/pkb-template";
import { getDefaultPKBData } from "@/lib/pkb-template";
import type { PKBDocxPayload, PKBDivision } from "@/lib/pkb-docx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";

// Infer tipe upah dari divisi
function inferTipeUpah(divisi?: string): TipeUpahPKB {
  const div = (divisi || "").toLowerCase();
  if (div.includes("sales") || div.includes("staff")) return "per_hari";
  if (div.includes("blend")) return "per_kg";
  return "per_pack";
}

const TIPE_UPAH_OPTIONS: { value: TipeUpahPKB; label: string }[] = [
  { value: "per_pack", label: "Per Pack (Borongan Pengemasan)" },
  { value: "per_kg", label: "Per Kilogram (Borongan Pengolahan Tembakau)" },
  { value: "per_hari", label: "Per Hari (Staff/Marketing)" },
];

function inferDivision(tipeUpah: TipeUpahPKB, divisi?: string): PKBDivision {
  const div = (divisi || "").toLowerCase();
  if (div.includes("pack")) return "packing";
  if (div.includes("blend")) return "blending";
  if (div.includes("sales") || div.includes("staff")) return "sales";
  if (tipeUpah === "per_pack") return "packing";
  if (tipeUpah === "per_kg") return "blending";
  return "sales";
}

const ROLE_OPTIONS: Array<"Supervisor" | "Karyawan" | "Manager"> = ["Supervisor", "Karyawan", "Manager"];

export default function PKBPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPkb, setUploadingPkb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<PKBData>>({});
  const [pkbDokumenTtd, setPkbDokumenTtd] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError("");
      const [detailRes, pkbRes] = await Promise.all([
        employeeAPI.getById(employeeId),
        employeeAPI.getPKB(employeeId).catch(() => null),
      ]);
      const karyawan = detailRes.karyawan;

      if (!karyawan || String(karyawan.id) !== String(employeeId)) {
        throw new Error("Karyawan tidak ditemukan");
      }

      setEmployee(karyawan);

      const defaults = getDefaultPKBData();

      // Jika ada PKB tersimpan, gunakan datanya
      const pkb = pkbRes && typeof pkbRes === "object" && !("error" in pkbRes) ? pkbRes : null;
      const tanggalPkb = pkb?.tanggalPerjanjian
        ? new Date(pkb.tanggalPerjanjian).toISOString().split("T")[0]
        : karyawan.tanggalMasuk
          ? new Date(karyawan.tanggalMasuk).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

      setPkbDokumenTtd(pkb?.dokumenTtd ?? null);

      const tipeUpah = (pkb?.tipeUpah as TipeUpahPKB) ?? inferTipeUpah(karyawan.departemen);
      const gajiPerHari = Number(karyawan.gajiPerHari ?? 0) || undefined;
      const gajiPerBulan = Number(karyawan.gajiPerBulan ?? 0) || undefined;
      const gajiKaryawan = gajiPerHari ?? (tipeUpah === "per_hari" && gajiPerBulan && gajiPerBulan > 0 ? Math.round(gajiPerBulan / 26) : undefined);
      const nominalDefaultTipe = tipeUpah === "per_hari" ? 68450 : tipeUpah === "per_kg" ? 3400 : 3000;
      const nominalUpah = pkb?.nominalUpah ?? pkb?.upahPerPack ?? (gajiKaryawan ?? nominalDefaultTipe);
      const bonusNominal = pkb?.bonusNominal ?? pkb?.bonusPerPack ?? defaults.bonusNominal ?? 250;
      const catatanPembayaran = pkb?.catatanPembayaran ?? "yang akan dibayarkan setiap hari Sabtu";

      setFormData({
        ...defaults,
        pihak1Nama: pkb?.pihak1Nama ?? defaults.pihak1Nama ?? "Moch Syaeful Ikhsan",
        pihak1Nik: pkb?.pihak1Nik ?? defaults.pihak1Nik ?? "3279011207160002",
        pihak1Jabatan: pkb?.pihak1Jabatan ?? defaults.pihak1Jabatan ?? "Direktur",
        pihak1TandaTangan: pkb?.pihak1TandaTangan ?? defaults.pihak1TandaTangan ?? "Moch Syaeful Ikhsan",
        pihak2Nama: pkb?.pihak2Nama ?? karyawan.namaLengkap ?? karyawan.name ?? "",
        pihak2Nik: pkb?.pihak2Nik ?? karyawan.nik ?? karyawan.noKtp ?? "",
        pihak2Jabatan: pkb?.pihak2Jabatan ?? karyawan.departemen ?? "",
        peranKaryawan: (pkb?.peranKaryawan as PKBData["peranKaryawan"]) ?? ((ROLE_OPTIONS.includes(karyawan.jabatan) ? karyawan.jabatan : "Karyawan") as PKBData["peranKaryawan"]),
        pihak2Alamat: pkb?.pihak2Alamat ?? karyawan.alamat ?? "",
        pihak2TandaTangan: pkb?.pihak2TandaTangan ?? karyawan.namaLengkap ?? karyawan.name ?? "",
        tipeUpah,
        nominalUpah: typeof nominalUpah === "number" ? nominalUpah : Number(nominalUpah) || 3000,
        bonusNominal: typeof bonusNominal === "number" ? bonusNominal : Number(bonusNominal) || 250,
        catatanPembayaran,
        upahPerPack: nominalUpah,
        bonusPerPack: bonusNominal,
        tanggalPerjanjian: tanggalPkb,
      });
    } catch (err) {
      setError("Gagal memuat data karyawan");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PKBData, value: string | number) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "pihak2Nama") {
        next.pihak2TandaTangan = value as string;
      }
      return next;
    });
  };

  const getPKBData = (): PKBData => {
    const defaults = getDefaultPKBData();
    const tipeUpah = (formData.tipeUpah as TipeUpahPKB) ?? "per_pack";
    const nominal = Number(formData.nominalUpah ?? formData.upahPerPack) || 3000;
    const bonus = Number(formData.bonusNominal ?? formData.bonusPerPack) || 250;
    return {
      pihak1Nama: formData.pihak1Nama ?? defaults.pihak1Nama ?? "Moch Syaeful Ikhsan",
      pihak1Nik: formData.pihak1Nik ?? defaults.pihak1Nik ?? "3279011207160002",
      pihak1Jabatan: formData.pihak1Jabatan ?? defaults.pihak1Jabatan ?? "Direktur",
      pihak1TandaTangan: formData.pihak1TandaTangan ?? defaults.pihak1TandaTangan ?? "Moch Syaeful Ikhsan",
      pihak2Nama: formData.pihak2Nama ?? employee?.namaLengkap ?? "",
      pihak2Nik: formData.pihak2Nik ?? employee?.nik ?? "",
      pihak2Jabatan: formData.pihak2Jabatan ?? employee?.departemen ?? "",
      peranKaryawan: formData.peranKaryawan ?? "Karyawan",
      pihak2Alamat: formData.pihak2Alamat ?? employee?.alamat ?? "",
      pihak2TandaTangan: formData.pihak2TandaTangan ?? formData.pihak2Nama ?? employee?.namaLengkap ?? "",
      tipeUpah,
      nominalUpah: nominal,
      bonusNominal: tipeUpah === "per_pack" ? bonus : undefined,
      catatanPembayaran: tipeUpah === "per_hari" ? (formData.catatanPembayaran || "yang akan dibayarkan setiap hari Sabtu") : undefined,
      upahPerPack: nominal,
      bonusPerPack: bonus,
      tanggalPerjanjian: formData.tanggalPerjanjian ?? new Date().toISOString().split("T")[0],
    };
  };

  const getPKBDocxPayload = (): PKBDocxPayload => {
    const base = getPKBData();
    const division = inferDivision(base.tipeUpah, formData.pihak2Jabatan ?? employee?.departemen);
    return { ...base, division };
  };

  const handlePrint = async () => {
    setPdfError("");
    try {
      const pkbData = getPKBDocxPayload();
      await printPKBPDF(pkbData);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Gagal print PKB");
    }
  };

  const handleDownload = async () => {
    setPdfError("");
    try {
      const pkbData = getPKBDocxPayload();
      await downloadPKBPDF(pkbData);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Gagal download PKB");
    }
  };

  const handlePreview = async () => {
    setPdfError("");
    setLoadingPreview(true);
    setPreviewHtml(null);
    try {
      const pkbData = getPKBDocxPayload();
      const res = await fetch("/api/pkb/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkbData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Gagal generate preview (HTTP ${res.status})`);
      }
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Gagal memuat preview PKB");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleUploadPkbDokumen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId) return;
    setUploadingPkb(true);
    setPdfError("");
    try {
      const res = await employeeAPI.uploadPkbDokumen(employeeId, file);
      setPkbDokumenTtd(res?.dokumenTtd ?? file.name);
      setSaveSuccess("Dokumen PKB tandatangan berhasil diupload.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Gagal upload dokumen PKB");
    } finally {
      setUploadingPkb(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess("");
    setPdfError("");
    try {
      const pkbData = getPKBData();
      await employeeAPI.savePKB(employeeId, {
        pihak1Nama: pkbData.pihak1Nama,
        pihak1Nik: pkbData.pihak1Nik,
        pihak1Jabatan: pkbData.pihak1Jabatan,
        pihak1TandaTangan: pkbData.pihak1TandaTangan,
        pihak2Nama: pkbData.pihak2Nama,
        pihak2Nik: pkbData.pihak2Nik,
        pihak2Jabatan: pkbData.pihak2Jabatan,
        peranKaryawan: pkbData.peranKaryawan,
        pihak2Alamat: pkbData.pihak2Alamat,
        pihak2TandaTangan: pkbData.pihak2TandaTangan,
        tipeUpah: pkbData.tipeUpah,
        nominalUpah: pkbData.nominalUpah,
        bonusNominal: pkbData.bonusNominal,
        catatanPembayaran: pkbData.catatanPembayaran,
        upahPerPack: pkbData.nominalUpah,
        bonusPerPack: pkbData.bonusNominal ?? pkbData.bonusPerPack,
        tanggalPerjanjian: pkbData.tanggalPerjanjian,
      });
      setSaveSuccess("PKB berhasil disimpan ke database.");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Gagal menyimpan PKB");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Generate PKB
          </h1>
        </div>
        <p className="text-muted-foreground">Memuat data karyawan...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Generate PKB
          </h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || "Karyawan tidak ditemukan"}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dashboard/employees")}>
          Kembali ke Daftar Karyawan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          <FileText className="inline-block mr-2 h-8 w-8" />
          Generate Perjanjian Kerja Bersama (PKB)
        </h1>
      </div>

      {pdfError && (
        <Alert variant="destructive">
          <AlertDescription>{pdfError}</AlertDescription>
        </Alert>
      )}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{saveSuccess}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-6">
        {/* Pihak I - Perusahaan */}
        <Card>
          <CardHeader>
            <CardTitle>Pihak I (Perusahaan)</CardTitle>
            <CardDescription>
              Data perwakilan perusahaan - default Moch Syaeful Ikhsan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pihak1Nama">Nama</Label>
                <Input
                  id="pihak1Nama"
                  value={formData.pihak1Nama ?? ""}
                  onChange={(e) => handleChange("pihak1Nama", e.target.value)}
                  placeholder="Moch Syaeful Ikhsan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pihak1Nik">NIK</Label>
                <Input
                  id="pihak1Nik"
                  value={formData.pihak1Nik ?? ""}
                  onChange={(e) => handleChange("pihak1Nik", e.target.value)}
                  placeholder="3279011207160002"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pihak1Jabatan">Jabatan</Label>
                <Input
                  id="pihak1Jabatan"
                  value={formData.pihak1Jabatan ?? ""}
                  onChange={(e) => handleChange("pihak1Jabatan", e.target.value)}
                  placeholder="Direktur"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pihak1TandaTangan">Tanda Tangan (Nama di bawah)</Label>
                <Input
                  id="pihak1TandaTangan"
                  value={formData.pihak1TandaTangan ?? ""}
                  onChange={(e) => handleChange("pihak1TandaTangan", e.target.value)}
                  placeholder="Moch Syaeful Ikhsan"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pihak II - Karyawan */}
        <Card>
          <CardHeader>
            <CardTitle>Pihak II (Karyawan)</CardTitle>
            <CardDescription>
              Data karyawan terisi otomatis dari profil (divisi, role, gaji, alamat). Bisa diedit jika perlu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pihak2Nama">Nama</Label>
                <Input
                  id="pihak2Nama"
                  value={formData.pihak2Nama ?? ""}
                  onChange={(e) => handleChange("pihak2Nama", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pihak2Nik">NIK</Label>
                <Input
                  id="pihak2Nik"
                  value={formData.pihak2Nik ?? ""}
                  onChange={(e) => handleChange("pihak2Nik", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pihak2Jabatan">Divisi</Label>
                <Input
                  id="pihak2Jabatan"
                  value={formData.pihak2Jabatan ?? ""}
                  onChange={(e) => handleChange("pihak2Jabatan", e.target.value)}
                  placeholder="Contoh: BLENDING, PACKING, SALES"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peranKaryawan">Role Karyawan</Label>
                <Select
                  value={(formData.peranKaryawan as string) ?? "Karyawan"}
                  onValueChange={(v) => handleChange("peranKaryawan" as keyof PKBData, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pihak2Alamat">Alamat</Label>
                <Input
                  id="pihak2Alamat"
                  value={formData.pihak2Alamat ?? ""}
                  onChange={(e) => handleChange("pihak2Alamat", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pihak2TandaTangan">Tanda Tangan (Nama di bawah)</Label>
                <Input
                  id="pihak2TandaTangan"
                  value={formData.pihak2TandaTangan ?? ""}
                  onChange={(e) => handleChange("pihak2TandaTangan", e.target.value)}
                  placeholder="Sesuai nama karyawan"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ketentuan Upah - berbeda per divisi */}
        <Card>
          <CardHeader>
            <CardTitle>Ketentuan Upah</CardTitle>
            <CardDescription>
              Pilih tipe upah sesuai divisi/jabatan karyawan. Teks di dokumen PKB akan menyesuaikan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipeUpah">Tipe Upah (Divisi)</Label>
                <Select
                  value={formData.tipeUpah ?? "per_pack"}
                  onValueChange={(v) => handleChange("tipeUpah", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe upah" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPE_UPAH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(formData.tipeUpah ?? "per_pack") === "per_pack" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nominalUpah">Upah per Pack (Rp)</Label>
                    <Input
                      id="nominalUpah"
                      type="number"
                      value={formData.nominalUpah ?? formData.upahPerPack ?? 3000}
                      onChange={(e) => {
                        handleChange("nominalUpah", Number(e.target.value) || 0);
                        handleChange("upahPerPack", Number(e.target.value) || 0);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonusNominal">Bonus per Pack jika target terlampaui (Rp)</Label>
                    <Input
                      id="bonusNominal"
                      type="number"
                      value={formData.bonusNominal ?? formData.bonusPerPack ?? 250}
                      onChange={(e) => {
                        handleChange("bonusNominal", Number(e.target.value) || 0);
                        handleChange("bonusPerPack", Number(e.target.value) || 0);
                      }}
                    />
                  </div>
                </>
              )}

              {(formData.tipeUpah ?? "per_pack") === "per_kg" && (
                <div className="space-y-2">
                  <Label htmlFor="nominalUpahKg">Upah per Kilogram (Rp)</Label>
                  <Input
                    id="nominalUpahKg"
                    type="number"
                    value={formData.nominalUpah ?? formData.upahPerPack ?? 3400}
                    onChange={(e) => {
                      handleChange("nominalUpah", Number(e.target.value) || 0);
                      handleChange("upahPerPack", Number(e.target.value) || 0);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Teks: &quot;sebesar Rp. X / kilogram&quot;
                  </p>
                </div>
              )}

              {(formData.tipeUpah ?? "per_pack") === "per_hari" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nominalUpahHari">Upah per Hari (Rp)</Label>
                    <Input
                      id="nominalUpahHari"
                      type="number"
                      value={formData.nominalUpah ?? formData.upahPerPack ?? 68450}
                      onChange={(e) => {
                        handleChange("nominalUpah", Number(e.target.value) || 0);
                        handleChange("upahPerPack", Number(e.target.value) || 0);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="catatanPembayaran">Catatan Pembayaran</Label>
                    <Input
                      id="catatanPembayaran"
                      value={formData.catatanPembayaran ?? "yang akan dibayarkan setiap hari Sabtu"}
                      onChange={(e) => handleChange("catatanPembayaran", e.target.value)}
                      placeholder="yang akan dibayarkan setiap hari Sabtu"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contoh: &quot;yang akan dibayarkan setiap hari Sabtu&quot;
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="tanggalPerjanjian">Tanggal Perjanjian</Label>
                <Input
                  id="tanggalPerjanjian"
                  type="date"
                  value={formData.tanggalPerjanjian ?? ""}
                  onChange={(e) => handleChange("tanggalPerjanjian", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload PKB Tandatangan */}
        <Card>
          <CardHeader>
            <CardTitle>Upload PKB Tandatangan</CardTitle>
            <CardDescription>
              Upload hasil scan/foto PKB yang sudah ditandatangani karyawan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label htmlFor="upload-pkb-ttd" className="cursor-pointer">
                <Button type="button" variant="outline" asChild disabled={uploadingPkb}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingPkb ? "Mengupload..." : "Pilih File PKB Tandatangan"}
                  </span>
                </Button>
              </label>
              <input
                id="upload-pkb-ttd"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUploadPkbDokumen}
                className="hidden"
                disabled={uploadingPkb}
              />
              {pkbDokumenTtd && (
                <span className="text-sm text-green-600">✓ Dokumen tersimpan</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Menyimpan..." : "Simpan PKB"}
          </Button>
          <Button type="button" variant="outline" onClick={handlePreview} disabled={loadingPreview}>
            <Eye className="h-4 w-4 mr-2" />
            {loadingPreview ? "Memuat..." : "Preview PKB"}
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print PKB
          </Button>
          <Button type="button" variant="secondary" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PKB
          </Button>
        </div>

        {/* Preview PKB */}
        {previewHtml && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Perjanjian Kerja Bersama</CardTitle>
              <CardDescription>
                Tampilan dokumen PKB sesuai data yang diisi. Gunakan Print atau Download untuk mencetak.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={previewHtml}
                  title="Preview PKB"
                  className="w-full min-h-[600px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
