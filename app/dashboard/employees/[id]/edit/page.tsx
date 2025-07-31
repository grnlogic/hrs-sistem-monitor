"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { Upload, X, Crop, RotateCcw, Check, ArrowLeft } from "lucide-react";
import { employeeAPI } from "@/lib/api";
import ReactCrop, {
  Crop as CropType,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const statusOptions = [
  { label: "Aktif", value: "AKTIF" },
  { label: "Kontrak", value: "KONTRAK" },
  { label: "Cuti", value: "CUTI" },
  { label: "Resign", value: "RESIGN" },
  { label: "Tidak Aktif", value: "TIDAK_AKTIF" },
];

const departmentOptions = [
  { label: "STAFF PJP", value: "STAFF PJP" },
  { label: "STAFF CPD", value: "STAFF CPD" },
  { label: "BLANDING PJP", value: "BLANDING PJP" },
  { label: "PACKING PJP", value: "PACKING PJP" },
  { label: "MARKET PJP", value: "MARKET PJP" },
  { label: "PACKING CPD", value: "PACKING CPD" },
  { label: "MARKET CPD", value: "MARKET CPD" },
  { label: "STAFF CMS", value: "STAFF CMS" },
  { label: "PACKING CMS", value: "PACKING CMS" },
  { label: "MARKET CMS", value: "MARKET CMS" },
];

// Aspect ratio untuk foto profil (1:1 square)
const ASPECT_RATIO = 1;
const MIN_DIMENSION = 150;

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [currentFotoUrl, setCurrentFotoUrl] = useState<string | null>(null);

  // Load employee data on component mount
  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      setIsLoadingData(true);
      const data = await employeeAPI.getById(employeeId);

      // Extract karyawan data from the response
      const karyawan = data.karyawan;
      if (!karyawan || String(karyawan.id) !== String(employeeId)) {
        throw new Error("Karyawan tidak ditemukan");
      }

      setEmployeeData(karyawan);

      // Set current foto URL if exists
      if (karyawan.fotoProfil) {
        const fotoUrl = employeeAPI.getFotoUrl(karyawan.id.toString());
        setCurrentFotoUrl(fotoUrl);
        // Set preview URL juga untuk menampilkan foto yang sudah ada
        setPreviewUrl(fotoUrl);
      }
    } catch (err) {
      setError("Gagal memuat data karyawan");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("File harus berupa gambar (JPG, PNG, GIF, dll)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Ukuran file maksimal 10MB");
        return;
      }

      setSelectedFile(file);
      setError("");

      const url = URL.createObjectURL(file);
      setImgSrc(url);
      setShowCrop(true);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerAspectCrop(width, height, ASPECT_RATIO);
    setCrop(crop);
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          }
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const croppedFile = new File(
        [croppedBlob],
        selectedFile?.name || "cropped.jpg",
        {
          type: "image/jpeg",
        }
      );

      setSelectedFile(croppedFile);
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setPreviewUrl(croppedUrl);
      setShowCrop(false);
      setImgSrc("");
    } catch (error) {
      setError("Gagal memproses foto. Silakan coba lagi.");
    }
  };

  const handleCancelCrop = () => {
    setShowCrop(false);
    setImgSrc("");
    setSelectedFile(null);
    setPreviewUrl(null);
    if (imgSrc) {
      URL.revokeObjectURL(imgSrc);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (imgSrc) {
      URL.revokeObjectURL(imgSrc);
      setImgSrc("");
    }
    setShowCrop(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const updateData = {
      nik: formData.get("nik") as string,
      namaLengkap: formData.get("namaLengkap") as string,
      email: formData.get("email") as string,
      noHp: formData.get("noHp") as string,
      jabatan: formData.get("jabatan") as string,
      departemen: formData.get("departemen") as string,
      tanggalMasuk: formData.get("tanggalMasuk") as string,
      gajiPerHari: Number(formData.get("gajiPerHari")),
      statusKaryawan: formData.get("statusKaryawan") as string,
      tempatLahir: formData.get("tempatLahir") || null,
      tanggalLahir: formData.get("tanggalLahir") || null,
      jenisKelamin: formData.get("jenisKelamin") || null,
      alamat: formData.get("alamat") || null,
      noKtp: formData.get("noKtp") || null,
      npwp: formData.get("npwp") || null,
      bpjsKesehatan: formData.get("bpjsKesehatan") || null,
      bpjsKetenagakerjaan: formData.get("bpjsKetenagakerjaan") || null,
      statusPernikahan: formData.get("statusPernikahan") || null,
      jumlahTanggungan: formData.get("jumlahTanggungan") || null,
      tanggalKontrak: formData.get("tanggalKontrak") || null,
      batasKontrak: formData.get("batasKontrak") || null,
      pendidikanTerakhir: formData.get("pendidikanTerakhir") || null,
      atasanLangsung: formData.get("atasanLangsung") || null,
      lokasiKerja: formData.get("lokasiKerja") || null,
      tanggalKeluar: formData.get("tanggalKeluar") || null,
      namaKontakDarurat: formData.get("namaKontakDarurat") || null,
      hubunganKontakDarurat: formData.get("hubunganKontakDarurat") || null,
      noTeleponKontakDarurat: formData.get("noTeleponKontakDarurat") || null,
    };

    try {
      await employeeAPI.update(employeeData.id.toString(), updateData);

      // Upload foto hanya jika ada file baru yang dipilih
      if (selectedFile) {
        try {
          await employeeAPI.uploadFoto(
            employeeData.id.toString(),
            selectedFile
          );
          setSuccess("Data karyawan berhasil diperbarui dengan foto!");
        } catch (uploadError) {
          setSuccess(
            "Data karyawan berhasil diperbarui, tetapi gagal upload foto."
          );
          console.error("Upload foto error:", uploadError);
        }
      } else {
        // Jika tidak ada file baru, foto lama tetap dipertahankan
        setSuccess("Data karyawan berhasil diperbarui!");
      }

      setTimeout(() => {
        router.push(`/dashboard/employees/${employeeData.id}`);
      }, 2000);
    } catch (err) {
      setError("Gagal memperbarui data karyawan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Alert variant="destructive">
          <AlertDescription>Karyawan tidak ditemukan</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Data Karyawan
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Crop Modal */}
        {showCrop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Crop Foto Profil</h3>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelCrop}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCropComplete}
                    disabled={!completedCrop}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Selesai
                  </Button>
                </div>
              </div>
              <div className="max-h-96 overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={ASPECT_RATIO}
                  minWidth={MIN_DIMENSION}
                  minHeight={MIN_DIMENSION}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-w-full h-auto"
                  />
                </ReactCrop>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Drag untuk mengatur area crop. Foto akan dipotong menjadi bentuk
                persegi.
              </p>
            </div>
          </div>
        )}

        {/* Foto Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Foto Profil</CardTitle>
            <CardDescription>
              Upload foto profil karyawan (opsional) - Foto akan di-crop menjadi
              persegi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={previewUrl || currentFotoUrl || "/placeholder.svg"}
                    alt="Preview"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                  <AvatarFallback className="text-lg">
                    {previewUrl || currentFotoUrl ? "Foto" : "Upload"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                {!selectedFile ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("foto-upload")?.click()
                      }
                    >
                      <Crop className="h-4 w-4 mr-2" />
                      {currentFotoUrl ? "Ganti Foto" : "Pilih & Crop Foto"}
                    </Button>
                    <span className="text-sm text-gray-500">
                      JPG, PNG, GIF (max 10MB) - Akan di-crop menjadi persegi
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {selectedFile.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-green-600">
                      ✓ Foto sudah di-crop menjadi persegi
                    </p>
                  </div>
                )}
                <input
                  id="foto-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Karyawan</CardTitle>
            <CardDescription>
              Edit data sesuai dengan identitas karyawan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bagian Wajib */}
            <div className="mb-2">
              <h2 className="text-lg font-semibold mb-2 text-red-700">
                Data Wajib
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK *</Label>
                <Input
                  id="nik"
                  name="nik"
                  required
                  defaultValue={employeeData.nik || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="namaLengkap"
                  name="namaLengkap"
                  required
                  defaultValue={employeeData.namaLengkap || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departemen">Departemen *</Label>
                <Select
                  name="departemen"
                  required
                  defaultValue={employeeData.departemen || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalMasuk">Tanggal Masuk *</Label>
                <Input
                  id="tanggalMasuk"
                  name="tanggalMasuk"
                  type="date"
                  required
                  defaultValue={
                    employeeData.tanggalMasuk
                      ? employeeData.tanggalMasuk.split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gajiPerHari">Gaji Per Hari *</Label>
                <Input
                  id="gajiPerHari"
                  name="gajiPerHari"
                  type="number"
                  required
                  defaultValue={employeeData.gajiPerHari || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusKaryawan">Status Karyawan *</Label>
                <Select
                  name="statusKaryawan"
                  required
                  defaultValue={employeeData.statusKaryawan || "AKTIF"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Bagian Opsional */}
            <div className="mt-6 mb-2">
              <h2 className="text-lg font-semibold mb-2 text-blue-700">
                Data Opsional
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="noHp">Nomor HP</Label>
                <Input
                  id="noHp"
                  name="noHp"
                  defaultValue={employeeData.noHp || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={employeeData.email || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempatLahir">Tempat Lahir</Label>
                <Input
                  id="tempatLahir"
                  name="tempatLahir"
                  defaultValue={employeeData.tempatLahir || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalLahir">Tanggal Lahir</Label>
                <Input
                  id="tanggalLahir"
                  name="tanggalLahir"
                  type="date"
                  defaultValue={
                    employeeData.tanggalLahir
                      ? employeeData.tanggalLahir.split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenisKelamin">Jenis Kelamin</Label>
                <Input
                  id="jenisKelamin"
                  name="jenisKelamin"
                  defaultValue={employeeData.jenisKelamin || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  name="alamat"
                  defaultValue={employeeData.alamat || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noKtp">No KTP</Label>
                <Input
                  id="noKtp"
                  name="noKtp"
                  defaultValue={employeeData.noKtp || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input
                  id="npwp"
                  name="npwp"
                  defaultValue={employeeData.npwp || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpjsKesehatan">BPJS Kesehatan</Label>
                <Input
                  id="bpjsKesehatan"
                  name="bpjsKesehatan"
                  defaultValue={employeeData.bpjsKesehatan || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpjsKetenagakerjaan">
                  BPJS Ketenagakerjaan
                </Label>
                <Input
                  id="bpjsKetenagakerjaan"
                  name="bpjsKetenagakerjaan"
                  defaultValue={employeeData.bpjsKetenagakerjaan || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusPernikahan">Status Pernikahan</Label>
                <Input
                  id="statusPernikahan"
                  name="statusPernikahan"
                  defaultValue={employeeData.statusPernikahan || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jumlahTanggungan">Jumlah Tanggungan</Label>
                <Input
                  id="jumlahTanggungan"
                  name="jumlahTanggungan"
                  type="number"
                  defaultValue={employeeData.jumlahTanggungan || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalKontrak">Tanggal Kontrak</Label>
                <Input
                  id="tanggalKontrak"
                  name="tanggalKontrak"
                  type="date"
                  defaultValue={
                    employeeData.tanggalKontrak
                      ? employeeData.tanggalKontrak.split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batasKontrak">Batas Kontrak</Label>
                <Input
                  id="batasKontrak"
                  name="batasKontrak"
                  type="date"
                  defaultValue={
                    employeeData.batasKontrak
                      ? employeeData.batasKontrak.split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input
                  id="jabatan"
                  name="jabatan"
                  defaultValue={employeeData.jabatan || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pendidikanTerakhir">Pendidikan Terakhir</Label>
                <Input
                  id="pendidikanTerakhir"
                  name="pendidikanTerakhir"
                  defaultValue={employeeData.pendidikanTerakhir || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="atasanLangsung">Atasan Langsung</Label>
                <Input
                  id="atasanLangsung"
                  name="atasanLangsung"
                  defaultValue={employeeData.atasanLangsung || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lokasiKerja">Lokasi Kerja</Label>
                <Input
                  id="lokasiKerja"
                  name="lokasiKerja"
                  defaultValue={employeeData.lokasiKerja || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalKeluar">Tanggal Keluar</Label>
                <Input
                  id="tanggalKeluar"
                  name="tanggalKeluar"
                  type="date"
                  defaultValue={
                    employeeData.tanggalKeluar
                      ? employeeData.tanggalKeluar.split("T")[0]
                      : ""
                  }
                />
              </div>
            </div>

            {/* Kontak Darurat Section */}
            <div className="mt-6 mb-2">
              <h2 className="text-lg font-semibold mb-2 text-orange-700">
                Kontak Darurat
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="namaKontakDarurat">Nama Kontak Darurat</Label>
                <Input
                  id="namaKontakDarurat"
                  name="namaKontakDarurat"
                  defaultValue={employeeData.namaKontakDarurat || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hubunganKontakDarurat">Hubungan</Label>
                <Input
                  id="hubunganKontakDarurat"
                  name="hubunganKontakDarurat"
                  defaultValue={employeeData.hubunganKontakDarurat || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noTeleponKontakDarurat">Nomor Telepon</Label>
                <Input
                  id="noTeleponKontakDarurat"
                  name="noTeleponKontakDarurat"
                  defaultValue={employeeData.noTeleponKontakDarurat || ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Menyimpan...
              </>
            ) : (
              <>Simpan Perubahan</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
