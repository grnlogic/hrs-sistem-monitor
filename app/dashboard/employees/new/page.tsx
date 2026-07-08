"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import {
  X,
  Crop,
  RotateCcw,
  Check,
  Loader2,
  Printer,
  ChevronRight,
  ChevronLeft,
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { employeeAPI } from "@/lib/api";
import { printPKBPDF } from "@/lib/utils";
import type { PKBData, TipeUpahPKB } from "@/lib/pkb-template";
import { getDefaultPKBData } from "@/lib/pkb-template";
import type { PKBDocxPayload, PKBDivision } from "@/lib/pkb-docx";
import { NAMA_PT } from "@/lib/constants/perusahaan";
import ReactCrop, {
  Crop as CropType,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const statusOptions = [
  { label: "Tetap", value: "TETAP" },
  { label: "Kontrak", value: "KONTRAK" },
];

const roleOptions = [
  { label: "Supervisor", value: "Supervisor" },
  { label: "Karyawan", value: "Karyawan" },
  { label: "Manager", value: "Manager" },
];

const ALL_DEPARTMENTS = [
  { label: "Blending", value: "BLENDING" },
  { label: "Packing", value: "PACKING" },
  { label: "Sales", value: "SALES" },
  { label: "Staff", value: "STAFF" },
];

const LOKASI_PT_OPTIONS = [
  { label: NAMA_PT.PJP, value: "PJP" },
  { label: NAMA_PT.SP, value: "SP" },
  { label: NAMA_PT.PRIMA, value: "PRIMA" },
];

function isStaffDepartment(divisi?: string): boolean {
  return (divisi || "").toLowerCase().includes("staff");
}

function inferTipeUpah(divisi?: string): TipeUpahPKB {
  const div = (divisi || "").toLowerCase();
  if (div.includes("staff")) return "per_bulan";
  if (div.includes("sales")) return "per_hari";
  if (div.includes("blend")) return "per_kg";
  return "per_pack";
}

function inferDivision(tipeUpah: TipeUpahPKB, divisi?: string): PKBDivision {
  const div = (divisi || "").toLowerCase();
  if (div.includes("pack")) return "packing";
  if (div.includes("blend")) return "blending";
  if (div.includes("staff")) return "staff";
  if (div.includes("sales")) return "sales";
  if (tipeUpah === "per_pack") return "packing";
  if (tipeUpah === "per_kg") return "blending";
  if (tipeUpah === "per_bulan") return "staff";
  return "sales";
}

function getNominalUpahFromForm(gajiInput: string, tipeUpah: TipeUpahPKB): number {
  const inputNominal = Number(gajiInput);
  if (Number.isFinite(inputNominal) && inputNominal > 0) {
    return inputNominal;
  }
  if (tipeUpah === "per_hari") return 68450;
  if (tipeUpah === "per_kg") return 3400;
  if (tipeUpah === "per_bulan") return 1500000;
  return 3000;
}

const ASPECT_RATIO = 1;
const MIN_DIMENSION = 150;

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

// ==================== STEPPER UI ====================
const STEPS = [
  { id: 1, title: "Data Karyawan", icon: User, desc: "Isi data pribadi" },
  { id: 2, title: "Print PKB", icon: FileText, desc: "Cetak perjanjian kerja" },
  { id: 3, title: "Upload TTD", icon: UploadCloud, desc: "Upload dokumen TTD" },
  { id: 4, title: "Selesai", icon: CheckCircle2, desc: "Konfirmasi" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`
                  flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 border-2
                  ${isCompleted ? "bg-green-500 border-green-500 text-white" : ""}
                  ${isActive ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" : ""}
                  ${!isActive && !isCompleted ? "bg-white border-slate-200 text-slate-400" : ""}
                `}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-slate-400"}`}>
                  {step.title}
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">{step.desc}</p>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mt-[-24px] rounded-full transition-all duration-300 ${currentStep > step.id ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pkbPrinted, setPkbPrinted] = useState(false);
  const [printingPkb, setPrintingPkb] = useState(false);
  const [pkbSnapshot, setPkbSnapshot] = useState<string | null>(null);
  const [savedEmployeeId, setSavedEmployeeId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploaded, setDocUploaded] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  // Photo state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Form data (persistent across steps)
  const [formData, setFormData] = useState({
    nik: "", namaLengkap: "", departemen: "", tanggalMasuk: "", gajiPerHari: "",
    lokasiDefault: "",
    statusKaryawan: "KONTRAK", roleKaryawan: "Karyawan", noHp: "", email: "", alamat: "",
    noKtp: "", npwp: "", bpjsNominal: "",
    noBpjs: "",
    tempatLahir: "", tanggalLahir: "", jenisKelamin: "", statusPernikahan: "",
    jumlahTanggungan: "", tanggalKontrak: "", batasKontrak: "", pendidikanTerakhir: "",
    atasanLangsung: "", lokasiKerja: "", tanggalKeluar: "", namaKontakDarurat: "",
    hubunganKontakDarurat: "", noTeleponKontakDarurat: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isStaffSelected = isStaffDepartment(formData.departemen);

  // ---- Photo handlers ----
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) { setError("File harus berupa gambar"); return; }
      if (file.size > 10 * 1024 * 1024) { setError("Ukuran file maksimal 10MB"); return; }
      setSelectedFile(file);
      setError("");
      setImgSrc(URL.createObjectURL(file));
      setShowCrop(true);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, ASPECT_RATIO));
  };

  const getCroppedImg = (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, pixelCrop.x * scaleX, pixelCrop.y * scaleY, pixelCrop.width * scaleX, pixelCrop.height * scaleY, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise((resolve) => canvas.toBlob((blob) => blob && resolve(blob), "image/jpeg", 0.9));
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const croppedFile = new File([croppedBlob], selectedFile?.name || "cropped.jpg", { type: "image/jpeg" });
      setSelectedFile(croppedFile);
      setPreviewUrl(URL.createObjectURL(croppedBlob));
      setShowCrop(false);
      setImgSrc("");
    } catch {
      setError("Gagal memproses foto.");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    setImgSrc("");
    setShowCrop(false);
  };

  // ---- Step 1: Validation ----
  const validateStep1 = () => {
    if (!formData.nik.trim()) return "NIK harus diisi";
    if (!formData.namaLengkap.trim()) return "Nama Lengkap harus diisi";
    if (!formData.departemen) return "Divisi harus dipilih";
    if (!formData.lokasiDefault) return "Lokasi PT harus dipilih";
    if (!formData.tanggalMasuk) return "Tanggal Masuk harus diisi";
    if (!formData.gajiPerHari || Number(formData.gajiPerHari) <= 0) {
      return isStaffSelected ? "Gaji Per Bulan harus diisi" : "Gaji Per Hari harus diisi";
    }
    if (formData.bpjsNominal === "" || Number(formData.bpjsNominal) < 0) return "Potongan BPJS/Bulan harus diisi";
    if (!formData.alamat.trim()) return "Alamat harus diisi";
    if (!formData.roleKaryawan) return "Role karyawan harus dipilih";
    if (!formData.statusKaryawan) return "Status harus dipilih";
    return null;
  };

  // ---- Step 2: Print PKB ----
  const handlePrintPKB = async () => {
    setError("");
    setPrintingPkb(true);
    const defaults = getDefaultPKBData();
    const tipeUpah = inferTipeUpah(formData.departemen);
    const nominalUpah = getNominalUpahFromForm(formData.gajiPerHari, tipeUpah);

    const pkbData: PKBData = {
      ...defaults,
      pihak2Nama: formData.namaLengkap,
      pihak2Nik: formData.nik,
      pihak2Jabatan: formData.departemen,
      peranKaryawan: formData.roleKaryawan as PKBData["peranKaryawan"],
      bpjs: formData.noBpjs || "-",
      bpjsKesehatanNominal: formData.bpjsNominal || "0",
      bpjsKetenagakerjaanNominal: "0",
      pihak2Alamat: formData.alamat || "",
      pihak2TandaTangan: formData.namaLengkap,
      tipeUpah,
      nominalUpah,
      bonusNominal: tipeUpah === "per_pack" ? 250 : undefined,
      catatanPembayaran:
        tipeUpah === "per_hari"
          ? "yang akan dibayarkan setiap hari Sabtu"
          : tipeUpah === "per_bulan"
            ? "yang akan dibayarkan setiap akhir bulan"
            : undefined,
      tanggalPerjanjian: formData.tanggalMasuk || new Date().toISOString().split("T")[0],
    } as PKBData;

    try {
      const payload: PKBDocxPayload = { ...pkbData, division: inferDivision(tipeUpah, formData.departemen) };
      const html = await printPKBPDF(payload);
      setPkbSnapshot(html);
      setPkbPrinted(true);
      setSuccess("PKB dibuka untuk print. Cetak dan minta karyawan tanda tangan.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal print PKB");
    } finally {
      setPrintingPkb(false);
    }
  };

  // ---- Step 2 → 3: Save employee ----
  const handleSaveEmployee = async () => {
    setIsLoading(true);
    setError("");

    const gajiInput = Number(formData.gajiPerHari);
    const payloadGajiPerHari = isStaffSelected ? 0 : gajiInput;
    const payloadGajiPerBulan = isStaffSelected ? gajiInput : null;

    const employeeData = {
      nik: formData.nik,
      namaLengkap: formData.namaLengkap,
      email: formData.email || null,
      noHp: formData.noHp || null,
      jabatan: formData.roleKaryawan || null,
      departemen: formData.departemen,
      lokasiDefault: formData.lokasiDefault || "PJP",
      tanggalMasuk: formData.tanggalMasuk,
      gajiPerHari: payloadGajiPerHari,
      gajiPerBulan: payloadGajiPerBulan,
      statusKaryawan: formData.statusKaryawan,
      tempatLahir: formData.tempatLahir || null,
      tanggalLahir: formData.tanggalLahir || null,
      jenisKelamin: formData.jenisKelamin || null,
      alamat: formData.alamat || null,
      noKtp: formData.noKtp || null,
      npwp: formData.npwp || null,
      bpjsKesehatan: formData.bpjsNominal || null,
      bpjsKetenagakerjaan: null,
      statusPernikahan: formData.statusPernikahan || null,
      jumlahTanggungan: formData.jumlahTanggungan || null,
      tanggalKontrak: formData.tanggalKontrak || null,
      batasKontrak: formData.batasKontrak || null,
      pendidikanTerakhir: formData.pendidikanTerakhir || null,
      atasanLangsung: formData.atasanLangsung || null,
      lokasiKerja: formData.lokasiKerja || null,
      tanggalKeluar: formData.tanggalKeluar || null,
      namaKontakDarurat: formData.namaKontakDarurat || null,
      hubunganKontakDarurat: formData.hubunganKontakDarurat || null,
      noTeleponKontakDarurat: formData.noTeleponKontakDarurat || null,
    };

    try {
      const newEmployee = await employeeAPI.create(employeeData);

      if (selectedFile && newEmployee.id) {
        try { await employeeAPI.uploadFoto(newEmployee.id.toString(), selectedFile); }
        catch (e) { console.error("Upload foto error:", e); }
      }

      // Save PKB data
      try {
        const tipeUpah = inferTipeUpah(formData.departemen);
        const nominalUpah = getNominalUpahFromForm(formData.gajiPerHari, tipeUpah);
        const defaults = getDefaultPKBData();
        await employeeAPI.savePKB(newEmployee.id.toString(), {
          pihak1Nama: defaults.pihak1Nama,
          pihak1Nik: defaults.pihak1Nik,
          pihak1Jabatan: defaults.pihak1Jabatan,
          pihak2Nama: formData.namaLengkap,
          pihak2Nik: formData.nik,
          pihak2Jabatan: formData.departemen,
          peranKaryawan: formData.roleKaryawan,
          bpjs: formData.noBpjs || "-",
          bpjsKesehatanNominal: formData.bpjsNominal || "0",
          bpjsKetenagakerjaanNominal: "0",
          pihak2Alamat: formData.alamat || "",
          tipeUpah,
          nominalUpah,
          bonusNominal: tipeUpah === "per_pack" ? 250 : undefined,
          catatanPembayaran:
            tipeUpah === "per_hari"
              ? "yang akan dibayarkan setiap hari Sabtu"
              : tipeUpah === "per_bulan"
                ? "yang akan dibayarkan setiap akhir bulan"
                : undefined,
          tanggalPerjanjian: formData.tanggalMasuk,
          dokumenHtml: pkbSnapshot ?? undefined,
        });
      } catch (e) { console.error("Save PKB error:", e); }

      setSavedEmployeeId(newEmployee.id.toString());
      setStep(3);
      setSuccess("Karyawan berhasil disimpan!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan karyawan");
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Step 3: Upload signed PKB ----
  const handleUploadPKBDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !savedEmployeeId) return;
    setUploadingDoc(true);
    setError("");
    try {
      await employeeAPI.uploadPkbDokumen(savedEmployeeId, file);
      setDocUploaded(true);
      setSuccess("Dokumen PKB berhasil diupload!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload dokumen");
    } finally {
      setUploadingDoc(false);
    }
  };

  // ---- Navigation ----
  const goNext = () => {
    setError("");
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      if (!pkbPrinted) {
        setError("Silakan cetak PKB terlebih dahulu sebelum lanjut.");
        return;
      }
      handleSaveEmployee();
    } else if (step === 3) {
      setStep(4);
    }
  };

  const goBack = () => {
    setError("");
    if (step === 2) {
      setPkbPrinted(false);
      setPkbSnapshot(null);
      setStep(1);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Tambah Karyawan Baru</h1>
        {step <= 2 && (
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/employees")}>Kembali</Button>
        )}
      </div>

      <StepIndicator currentStep={step} />

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Crop Modal */}
      {showCrop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Crop Foto Profil</h3>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowCrop(false); setImgSrc(""); setSelectedFile(null); setPreviewUrl(null); }}>
                  <RotateCcw className="h-4 w-4 mr-2" />Batal
                </Button>
                <Button type="button" size="sm" onClick={handleCropComplete} disabled={!completedCrop}>
                  <Check className="h-4 w-4 mr-2" />Selesai
                </Button>
              </div>
            </div>
            <div className="max-h-96 overflow-auto">
              <ReactCrop crop={crop} onChange={(_, pc) => setCrop(pc)} onComplete={(c) => setCompletedCrop(c)} aspect={ASPECT_RATIO} minWidth={MIN_DIMENSION} minHeight={MIN_DIMENSION}>
                <img ref={imgRef} alt="Crop" src={imgSrc} onLoad={onImageLoad} className="max-w-full h-auto" />
              </ReactCrop>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 1: Data Karyawan ==================== */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Photo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Foto Profil</CardTitle>
              <CardDescription className="text-xs">Opsional — akan di-crop persegi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Preview" />
                  <AvatarFallback>Foto</AvatarFallback>
                </Avatar>
                <div>
                  {!selectedFile ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("foto-upload")?.click()}>
                      <Crop className="h-4 w-4 mr-2" />Pilih Foto
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600">&#10003; {selectedFile.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={removeFile}><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                  <input id="foto-upload" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-700">Data Wajib</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nik" className="text-sm">NIK *</Label>
                  <Input id="nik" value={formData.nik} onChange={(e) => updateField("nik", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="namaLengkap" className="text-sm">Nama Lengkap *</Label>
                  <Input id="namaLengkap" value={formData.namaLengkap} onChange={(e) => updateField("namaLengkap", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Divisi *</Label>
                  <Select value={formData.departemen} onValueChange={(v) => updateField("departemen", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                    <SelectContent>
                      {ALL_DEPARTMENTS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Role Karyawan *</Label>
                  <Select value={formData.roleKaryawan} onValueChange={(v) => updateField("roleKaryawan", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tanggalMasuk" className="text-sm">Tanggal Masuk *</Label>
                  <Input id="tanggalMasuk" type="date" value={formData.tanggalMasuk} onChange={(e) => updateField("tanggalMasuk", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gajiPerHari" className="text-sm">{isStaffSelected ? "Gaji Per Bulan *" : "Gaji Per Hari *"}</Label>
                  <Input
                    id="gajiPerHari"
                    type="number"
                    value={formData.gajiPerHari}
                    onChange={(e) => updateField("gajiPerHari", e.target.value)}
                    placeholder={isStaffSelected ? "Contoh: 3500000" : "Contoh: 120000"}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm">Lokasi PT *</Label>
                  <Select value={formData.lokasiDefault} onValueChange={(v) => updateField("lokasiDefault", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih lokasi PT" /></SelectTrigger>
                    <SelectContent>
                      {LOKASI_PT_OPTIONS.map((lokasi) => (
                        <SelectItem key={lokasi.value} value={lokasi.value}>{lokasi.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Lokasi asal karyawan sesuai PKB. Bisa berbeda saat absensi jika dipindahtugaskan.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Status (Tetap/Kontrak) *</Label>
                  <Select value={formData.statusKaryawan} onValueChange={(v) => updateField("statusKaryawan", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bpjsNominal" className="text-sm">Potongan BPJS/Bulan *</Label>
                  <Input
                    id="bpjsNominal"
                    type="number"
                    min={0}
                    value={formData.bpjsNominal}
                    onChange={(e) => updateField("bpjsNominal", e.target.value)}
                    placeholder="Nominal potongan per bulan"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="alamat" className="text-sm">Alamat *</Label>
                  <Input
                    id="alamat"
                    value={formData.alamat}
                    onChange={(e) => updateField("alamat", e.target.value)}
                    placeholder="Contoh: Dusun Cikadu RT 03/RW 05, Desa Maju Jaya"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optional fields (collapsible) */}
          <Card>
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setShowOptional(!showOptional)}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-blue-700">Data Opsional</CardTitle>
                  <CardDescription className="text-xs">Klik untuk {showOptional ? "sembunyikan" : "tampilkan"}</CardDescription>
                </div>
                {showOptional ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </div>
            </CardHeader>
            {showOptional && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "noHp", label: "Nomor HP" },
                    { id: "email", label: "Email", type: "email" },
                    { id: "noKtp", label: "No KTP" },
                    { id: "tempatLahir", label: "Tempat Lahir" },
                    { id: "tanggalLahir", label: "Tanggal Lahir", type: "date" },
                    { id: "jenisKelamin", label: "Jenis Kelamin" },
                    { id: "npwp", label: "NPWP" },
                    { id: "noBpjs", label: "No BPJS" },
                    { id: "statusPernikahan", label: "Status Pernikahan" },
                    { id: "jumlahTanggungan", label: "Jumlah Tanggungan", type: "number" },
                    { id: "tanggalKontrak", label: "Tanggal Kontrak", type: "date" },
                    { id: "batasKontrak", label: "Batas Kontrak", type: "date" },
                    { id: "pendidikanTerakhir", label: "Pendidikan Terakhir" },
                    { id: "atasanLangsung", label: "Atasan Langsung" },
                    { id: "lokasiKerja", label: "Lokasi Kerja" },
                    { id: "namaKontakDarurat", label: "Kontak Darurat — Nama" },
                    { id: "hubunganKontakDarurat", label: "Kontak Darurat — Hubungan" },
                    { id: "noTeleponKontakDarurat", label: "Kontak Darurat — No. Telepon" },
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                      <Input
                        id={field.id}
                        type={field.type || "text"}
                        value={formData[field.id as keyof typeof formData]}
                        onChange={(e) => updateField(field.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* ==================== STEP 2: Print PKB ==================== */}
      {step === 2 && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ringkasan Data</CardTitle>
              <CardDescription className="text-xs">Pastikan data sudah benar sebelum print PKB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <div><span className="text-slate-500">Nama:</span> <span className="font-medium">{formData.namaLengkap}</span></div>
                <div><span className="text-slate-500">NIK:</span> <span className="font-medium">{formData.nik}</span></div>
                <div><span className="text-slate-500">Divisi:</span> <span className="font-medium">{formData.departemen}</span></div>
                <div><span className="text-slate-500">Role:</span> <span className="font-medium">{formData.roleKaryawan || "-"}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className="font-medium">{formData.statusKaryawan || "-"}</span></div>
                <div><span className="text-slate-500">Potongan BPJS/Bulan:</span> <span className="font-medium">Rp {(Number(formData.bpjsNominal || 0) || 0).toLocaleString("id-ID")}</span></div>
                <div><span className="text-slate-500">Alamat:</span> <span className="font-medium">{formData.alamat || "-"}</span></div>
                <div><span className="text-slate-500">Tgl Masuk:</span> <span className="font-medium">{formData.tanggalMasuk}</span></div>
                <div>
                  <span className="text-slate-500">{isStaffSelected ? "Gaji/Bulan:" : "Gaji/Hari:"}</span>{" "}
                  <span className="font-medium">Rp {Number(formData.gajiPerHari).toLocaleString("id-ID")}</span>
                </div>
                <div><span className="text-slate-500">Tipe Upah:</span> <span className="font-medium capitalize">{inferTipeUpah(formData.departemen).replace("_", " ")}</span></div>
                <div><span className="text-slate-500">Divisi PKB:</span> <span className="font-medium capitalize">{inferDivision(inferTipeUpah(formData.departemen), formData.departemen)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className={pkbPrinted ? "border-green-200 bg-green-50/30" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Cetak PKB (Perjanjian Kerja Bersama)
                {pkbPrinted && <Check className="h-4 w-4 text-green-600" />}
              </CardTitle>
              <CardDescription>
                {pkbPrinted
                  ? "PKB sudah dicetak. Minta karyawan tanda tangan, lalu klik Simpan & Lanjut."
                  : "Klik untuk mencetak PKB. Setelah dicetak, minta karyawan tanda tangan."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handlePrintPKB}
                variant={pkbPrinted ? "outline" : "default"}
                className="w-full"
                disabled={printingPkb}
              >
                {printingPkb ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                {printingPkb ? "Menyiapkan PKB..." : pkbPrinted ? "Cetak Ulang PKB" : "Cetak PKB"}
              </Button>
            </CardContent>
          </Card>

          {pkbPrinted && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>Selanjutnya:</strong> Setelah PKB ditandatangani, klik &quot;Simpan &amp; Lanjut&quot; untuk menyimpan karyawan dan upload dokumen TTD.
            </div>
          )}
        </div>
      )}

      {/* ==================== STEP 3: Upload TTD ==================== */}
      {step === 3 && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UploadCloud className="h-5 w-5" />
                Upload Dokumen PKB yang Ditandatangani
                {docUploaded && <Check className="h-4 w-4 text-green-600" />}
              </CardTitle>
              <CardDescription>Upload scan/foto PKB yang sudah ditandatangani (PDF, JPG, PNG)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!docUploaded ? (
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("pkb-doc-upload")?.click()}
                >
                  <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-3">Klik untuk memilih file</p>
                  <Button variant="outline" type="button" disabled={uploadingDoc}>
                    {uploadingDoc ? "Mengupload..." : "Pilih File"}
                  </Button>
                  <input id="pkb-doc-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadPKBDoc} className="hidden" />
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Dokumen berhasil diupload!</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setDocUploaded(false)}>Upload Ulang</Button>
                </div>
              )}
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                <strong>Catatan:</strong> Anda bisa melewati upload dan melakukannya nanti dari halaman detail karyawan.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== STEP 4: Done ==================== */}
      {step === 4 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800 mb-2">Karyawan Berhasil Ditambahkan!</h2>
            <p className="text-sm text-green-700 mb-1">{formData.namaLengkap} — {formData.departemen}</p>
            <p className="text-sm text-slate-500 mb-6">
              {docUploaded ? "Data dan dokumen PKB sudah lengkap." : "Dokumen PKB belum diupload — bisa upload nanti dari detail karyawan."}
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/dashboard/employees")}>Lihat Daftar Karyawan</Button>
              <Button onClick={() => {
                setStep(1);
                setFormData({
                  nik: "", namaLengkap: "", departemen: "", tanggalMasuk: "", gajiPerHari: "",
                  lokasiDefault: "",
                  statusKaryawan: "KONTRAK", roleKaryawan: "Karyawan", noHp: "", email: "", alamat: "",
                  noKtp: "", npwp: "", bpjsNominal: "",
                  noBpjs: "",
                  tempatLahir: "", tanggalLahir: "", jenisKelamin: "", statusPernikahan: "",
                  jumlahTanggungan: "", tanggalKontrak: "", batasKontrak: "", pendidikanTerakhir: "",
                  atasanLangsung: "", lokasiKerja: "", tanggalKeluar: "", namaKontakDarurat: "",
                  hubunganKontakDarurat: "", noTeleponKontakDarurat: "",
                });
                setPkbPrinted(false);
                setPkbSnapshot(null);
                setPrintingPkb(false);
                setSavedEmployeeId(null);
                setDocUploaded(false);
                removeFile();
                setError("");
                setSuccess("");
              }}>Tambah Karyawan Lain</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== Navigation ==================== */}
      {step < 4 && (
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {step === 2 && (
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
            )}
          </div>
          <div>
            {step === 1 && (
              <Button onClick={goNext}>
                Lanjut ke Print PKB <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={goNext} disabled={isLoading || !pkbPrinted}>
                {isLoading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Menyimpan...</>
                ) : (
                  <>Simpan & Lanjut <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            )}
            {step === 3 && (
              <Button onClick={goNext} variant={docUploaded ? "default" : "outline"}>
                {docUploaded ? "Selesai" : "Lewati Upload"} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
