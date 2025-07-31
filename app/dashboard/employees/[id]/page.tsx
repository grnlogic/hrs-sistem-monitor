"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Badge } from "@/components/ui/display/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Calendar,
  Building,
  Clock,
  Upload,
  Camera,
  Crop,
  RotateCcw,
  Check,
} from "lucide-react";
import { employeeAPI, leaveAPI } from "@/lib/api";
import ReactCrop, {
  Crop as CropType,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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

export default function EmployeeDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("personal");
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [violationHistory, setViolationHistory] = useState<any[]>([]);
  const [leaveInfo, setLeaveInfo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Function untuk mendapatkan URL foto
  const getFotoUrl = (employeeId: string) => {
    const url = employeeAPI.getFotoUrl(employeeId);
    console.log("Foto URL:", url); // Debug
    return url;
  };

  // Function untuk menampilkan foto dengan authentication
  const [avatarSrc, setAvatarSrc] = useState<string>("/placeholder.svg");

  useEffect(() => {
    if (employee?.avatar) {
      const token = localStorage.getItem("token");
      if (token) {
        // Load foto dengan fetch dan token
        fetch(employee.avatar, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (response.ok) {
              return response.blob();
            }
            throw new Error(`HTTP ${response.status}`);
          })
          .then((blob) => {
            const imageUrl = URL.createObjectURL(blob);
            setAvatarSrc(imageUrl);
            console.log("Foto berhasil dimuat dengan authentication");
          })
          .catch((error) => {
            console.error("Gagal memuat foto:", error);
            setAvatarSrc("/placeholder.svg");
          });
      } else {
        setAvatarSrc("/placeholder.svg");
      }
    }
  }, [employee?.avatar]);

  // Function untuk crop foto
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

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerAspectCrop(width, height, ASPECT_RATIO);
    setCrop(crop);
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
      setShowCrop(false);
      setImgSrc("");

      // Upload foto yang sudah di-crop
      if (employee) {
        setUploading(true);
        setUploadError("");

        try {
          await employeeAPI.uploadFoto(employee.id.toString(), croppedFile);
          window.location.reload();
        } catch (err) {
          setUploadError("Gagal upload foto. Silakan coba lagi.");
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      setUploadError("Gagal memproses foto. Silakan coba lagi.");
    }
  };

  const handleCancelCrop = () => {
    setShowCrop(false);
    setImgSrc("");
    setSelectedFile(null);
    if (imgSrc) {
      URL.revokeObjectURL(imgSrc);
    }
  };

  // Function untuk upload foto
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    // Validasi file
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 10MB");
      return;
    }

    setSelectedFile(file);
    setUploadError("");

    // Buat preview untuk crop
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setShowCrop(true);
  };

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const id =
          typeof params.id === "string"
            ? params.id
            : Array.isArray(params.id)
            ? params.id[0]
            : "";
        const data = await employeeAPI.getById(id);

        // Ambil data utama dari data.karyawan
        let karyawan = data.karyawan;
        if (!karyawan || String(karyawan.id) !== String(id)) {
          throw new Error("Karyawan tidak ditemukan");
        }

        // Filter data cuti, pelanggaran, absensi, gaji berdasarkan karyawan.id
        const cuti = (data.cuti || []).filter(
          (c: any) => String(c.karyawan?.id) === String(id)
        );
        const pelanggaran = (data.pelanggaran || []).filter(
          (p: any) => String(p.karyawan?.id) === String(id)
        );
        const absensi = (data.absensi || []).filter(
          (a: any) => String(a.karyawan?.id) === String(id)
        );
        const gaji = (data.gaji || []).filter(
          (g: any) => String(g.karyawan?.id) === String(id)
        );

        // Mapping data karyawan
        const mapped = {
          id: karyawan.id,
          name: karyawan.namaLengkap || karyawan.name || "-",
          nip: karyawan.nik || karyawan.nip || "-",
          department: karyawan.departemen || karyawan.department || "-",
          position: karyawan.jabatan || karyawan.position || "-",
          status:
            karyawan.statusKaryawan === "AKTIF"
              ? "Aktif"
              : karyawan.statusKaryawan === "TIDAK_AKTIF"
              ? "Tidak Aktif"
              : karyawan.statusKaryawan === "CUTI"
              ? "Cuti"
              : karyawan.statusKaryawan || karyawan.status || "-",
          joinDate: karyawan.tanggalMasuk || karyawan.joinDate || null,
          phone: karyawan.noHp || karyawan.phone || "-",
          email: karyawan.email || "-",
          address: karyawan.alamat || karyawan.address || "-",
          birthDate: karyawan.tanggalLahir || karyawan.birthDate || null,
          // Debug: log foto profil dari database
          avatar: (() => {
            console.log("Foto profil dari DB:", karyawan.fotoProfil);
            if (karyawan.fotoProfil) {
              const fotoUrl = getFotoUrl(karyawan.id.toString());
              console.log("Generated foto URL:", fotoUrl);
              return fotoUrl;
            }
            console.log("Tidak ada foto profil");
            return null;
          })(),
          salary: karyawan.gajiPerHari
            ? `Rp ${Number(karyawan.gajiPerHari).toLocaleString("id-ID")}`
            : karyawan.salary || "-",
          emergencyContact: {
            name: karyawan.namaKontakDarurat || "-",
            relation: karyawan.hubunganKontakDarurat || "-",
            phone: karyawan.noTeleponKontakDarurat || "-",
          },
          _rawKaryawan: karyawan,
        };
        setEmployee(mapped);
        setSalaryHistory(
          (data.gaji || []).filter(
            (g: any) => String(g.karyawan?.id) === String(id)
          )
        );
        setAttendanceHistory(absensi);
        setLeaveHistory(
          cuti.map((c: any) => ({
            ...c,
            karyawan: undefined,
          }))
        );
        setViolationHistory(
          pelanggaran.map((p: any) => ({
            ...p,
            karyawan: undefined,
          }))
        );

        // Ambil informasi cuti karyawan
        try {
          const leaveInfoData = await leaveAPI.getEmployeeLeaveInfo(id);
          setLeaveInfo(leaveInfoData);
        } catch (err) {
          console.error("Gagal mengambil informasi cuti:", err);
          setLeaveInfo(null);
        }
      } catch (err) {
        setError("Gagal memuat data karyawan");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aktif":
      case "Hadir":
      case "Disetujui":
      case "Dibayar":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            {status}
          </Badge>
        );
      case "Terlambat":
      case "Pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {status}
          </Badge>
        );
      case "Sakit":
      case "Ditolak":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">
          {error || "Data karyawan tidak ditemukan"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <a href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Detail Karyawan
            </h1>
            <p className="text-gray-600">Informasi lengkap karyawan</p>
          </div>
        </div>
        <Button asChild>
          <a href={`/dashboard/employees/${employee.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Data
          </a>
        </Button>
      </div>

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
                  Selesai & Upload
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

      {/* Employee Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={avatarSrc}
                  alt={employee.name}
                  onError={(e) => {
                    // Jika gambar gagal dimuat, gunakan fallback
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                  onLoad={() => {
                    // Tidak perlu log apa-apa di sini
                  }}
                />
                <AvatarFallback className="text-2xl">
                  {employee.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              {/* Upload Foto Button */}
              <div className="absolute -bottom-2 -right-2">
                <label htmlFor="upload-foto" className="cursor-pointer">
                  <div className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg">
                    <Crop className="h-4 w-4" />
                  </div>
                </label>
                <input
                  id="upload-foto"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFoto}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {employee.name}
                </h2>
                <p className="text-lg text-gray-600">{employee.position}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">
                    NIK: {employee.nip}
                  </span>
                  {getStatusBadge(employee.status)}
                </div>
              </div>

              {uploadError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {uploadError}
                </div>
              )}

              {uploading && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Mengupload foto...
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.department}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.phone}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.email}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Bergabung{" "}
                    {new Date(employee.joinDate).toLocaleDateString("id-ID")}
                  </span>
                </div>
                {leaveInfo && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Sisa Cuti: {leaveInfo.sisaCuti}/12 hari
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Data Pribadi</TabsTrigger>
          <TabsTrigger value="salary">Riwayat Gaji</TabsTrigger>
          <TabsTrigger value="attendance">Riwayat Absensi</TabsTrigger>
          <TabsTrigger value="leave">Riwayat Cuti</TabsTrigger>
          <TabsTrigger value="violations">Pelanggaran</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pribadi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tanggal Lahir
                  </label>
                  <p className="text-gray-900">
                    {new Date(employee.birthDate).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Alamat
                  </label>
                  <p className="text-gray-900">{employee.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Gaji Pokok
                  </label>
                  <p className="text-gray-900">{employee.salary}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kontak Darurat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nama
                  </label>
                  <p className="text-gray-900">
                    {employee.emergencyContact.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Hubungan
                  </label>
                  <p className="text-gray-900">
                    {employee.emergencyContact.relation}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nomor Telepon
                  </label>
                  <p className="text-gray-900">
                    {employee.emergencyContact.phone}
                  </p>
                </div>
              </CardContent>
            </Card>

            {leaveInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Informasi Cuti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Cuti Tahun Ini
                    </label>
                    <p className="text-gray-900">
                      {leaveInfo.jumlahCutiTahunIni} hari kerja
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Sisa Cuti
                    </label>
                    <p className="text-gray-900">
                      {leaveInfo.sisaCuti} hari kerja
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Batas Maksimal
                    </label>
                    <p className="text-gray-900">
                      {leaveInfo.batasMaksimal} hari kerja per tahun
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          leaveInfo.sisaCuti > 6
                            ? "bg-green-500"
                            : leaveInfo.sisaCuti > 3
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${
                            (leaveInfo.sisaCuti / leaveInfo.batasMaksimal) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(
                        (leaveInfo.sisaCuti / leaveInfo.batasMaksimal) * 100
                      )}
                      % tersisa
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tambahan: Tabel JSON Data Pribadi Lengkap */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tabel Data Pribadi</CardTitle>
              <CardDescription>Menampilkan data asli</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1 text-left bg-gray-50">
                        Field
                      </th>
                      <th className="border px-2 py-1 text-left bg-gray-50">
                        Data Asli
                      </th>
                      <th className="border px-2 py-1 text-left bg-gray-50">
                        Data Terenkripsi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee &&
                      employee._rawKaryawan &&
                      Object.entries(employee._rawKaryawan).map(
                        ([key, value]) => {
                          // Tentukan apakah ini field encrypted atau tidak
                          const isEncrypted =
                            key.includes("encrypted") ||
                            key.includes("Encrypted");
                          const originalKey = key
                            .replace("_encrypted", "")
                            .replace("Encrypted", "");

                          // Cari data asli jika ini field encrypted
                          let originalValue = null;
                          if (isEncrypted) {
                            originalValue =
                              employee._rawKaryawan[originalKey] ||
                              "Tidak ada data asli";
                          }

                          return (
                            <tr
                              key={key}
                              className={isEncrypted ? "bg-blue-50" : ""}
                            >
                              <td className="border px-2 py-1 font-mono text-xs font-medium">
                                {key}
                                {isEncrypted && (
                                  <span className="ml-1 text-xs text-blue-600">
                                    (encrypted)
                                  </span>
                                )}
                              </td>
                              <td className="border px-2 py-1 font-mono text-xs">
                                {isEncrypted ? (
                                  <span className="text-green-600">
                                    {originalValue}
                                  </span>
                                ) : (
                                  <span className="text-gray-600">
                                    {value === null || value === undefined
                                      ? "-"
                                      : String(value)}
                                  </span>
                                )}
                              </td>
                              <td className="border px-2 py-1 font-mono text-xs">
                                {isEncrypted ? (
                                  <span className="text-red-600 font-bold">
                                    {value === null || value === undefined
                                      ? "-"
                                      : String(value)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Keterangan:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded mr-2"></div>
                    <span>Field terenkripsi</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-50 border border-green-200 rounded mr-2"></div>
                    <span className="text-green-600">Data asli</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-50 border border-red-200 rounded mr-2"></div>
                    <span className="text-red-600">Data terenkripsi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Gaji</CardTitle>
              <CardDescription>
                Histori pembayaran gaji karyawan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Potongan</TableHead>
                    <TableHead>Gaji Bersih</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Tidak ada data gaji
                      </TableCell>
                    </TableRow>
                  ) : (
                    salaryHistory.map((salary, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {salary.periodeAwal && salary.periodeAkhir
                            ? `${salary.periodeAwal} - ${salary.periodeAkhir}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(salary.gajiPokok) || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(salary.bonus) || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(salary.potongan) || 0)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(salary.totalGajiBersih) || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(salary.statusPembayaran || "-")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Absensi</CardTitle>
              <CardDescription>Catatan kehadiran karyawan</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Tidak ada data absensi
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceHistory.map((absen, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {absen.tanggal || "-"}
                        </TableCell>
                        <TableCell>{absen.jamMasuk || "-"}</TableCell>
                        <TableCell>{absen.jamPulang || "-"}</TableCell>
                        <TableCell>
                          {getStatusBadge(absen.status || "-")}
                        </TableCell>
                        <TableCell>{absen.keterangan || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Riwayat Cuti</span>
                {leaveInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Sisa Cuti:</span>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700"
                    >
                      {leaveInfo.sisaCuti}/12 hari
                    </Badge>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Histori pengajuan dan persetujuan cuti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alasan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Tidak ada data cuti
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveHistory.map((leave, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {leave.jenisCuti || "-"}
                        </TableCell>
                        <TableCell>
                          {leave.tanggalMulai
                            ? new Date(leave.tanggalMulai).toLocaleDateString(
                                "id-ID"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {leave.tanggalSelesai
                            ? new Date(leave.tanggalSelesai).toLocaleDateString(
                                "id-ID"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {leave.tanggalMulai && leave.tanggalSelesai
                            ? (new Date(leave.tanggalSelesai).getTime() -
                                new Date(leave.tanggalMulai).getTime()) /
                                (1000 * 60 * 60 * 24) +
                              1 +
                              " hari"
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(leave.status || "-")}
                        </TableCell>
                        <TableCell>{leave.alasan || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pelanggaran</CardTitle>
              <CardDescription>
                Catatan pelanggaran dan sanksi yang diberikan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis Pelanggaran</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Sanksi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violationHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Tidak ada data pelanggaran
                      </TableCell>
                    </TableRow>
                  ) : (
                    violationHistory.map((vio, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {vio.tanggalKejadian
                            ? new Date(vio.tanggalKejadian).toLocaleDateString(
                                "id-ID"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>{vio.jenisPelanggaran || "-"}</TableCell>
                        <TableCell>{vio.catatan || "-"}</TableCell>
                        <TableCell>{vio.jenisSanksi || "-"}</TableCell>
                        <TableCell>{vio.tindakLanjut || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
