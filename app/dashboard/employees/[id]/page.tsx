"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
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
  FileText,
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
  File as FileIcon,
  UserRound,
  Image,
  Download,
  Eye,
  X,
  Paperclip,
} from "lucide-react";
import { attendanceAPI, employeeAPI, leaveAPI } from "@/lib/api";
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
const HUMAN_FALLBACK_AVATAR = "/images/fallbacks/avatar-human.svg";

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
  const [salaryRangeStart, setSalaryRangeStart] = useState("");
  const [salaryRangeEnd, setSalaryRangeEnd] = useState("");
  const [selectedExportedSalaryKey, setSelectedExportedSalaryKey] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [izinSakitHistory, setIzinSakitHistory] = useState<any[]>([]);
  const [izinSakitFilter, setIzinSakitFilter] = useState<"all" | "IZIN" | "TIDAK_HADIR">("all");
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [violationHistory, setViolationHistory] = useState<any[]>([]);
  const [leaveInfo, setLeaveInfo] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
  const [avatarSrc, setAvatarSrc] = useState<string>(HUMAN_FALLBACK_AVATAR);

  useEffect(() => {
    if (employee?.avatar) {
      const token = localStorage.getItem("token");
      if (token) {
        // Load foto dengan fetch dan token
        fetch(employee.avatar, {
          cache: "no-store",
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
            setAvatarSrc(HUMAN_FALLBACK_AVATAR);
          });
      } else {
        setAvatarSrc(HUMAN_FALLBACK_AVATAR);
      }
    } else {
      setAvatarSrc(HUMAN_FALLBACK_AVATAR);
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
      const croppedFile = new window.File(
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
              const fotoUrl = `${getFotoUrl(
                karyawan.id.toString()
              )}?v=${encodeURIComponent(String(karyawan.fotoProfil))}`;
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

        try {
          const izinSakitResponse = await attendanceAPI.getIzinSakitByEmployee(String(id));
          setIzinSakitHistory(Array.isArray(izinSakitResponse?.data) ? izinSakitResponse.data : []);
        } catch (err) {
          console.error("Gagal mengambil riwayat izin/sakit:", err);
          setIzinSakitHistory([]);
        }

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

        // Ambil daftar file yang sudah di-upload
        try {
          setFilesLoading(true);
          const filesData = await employeeAPI.getFiles(id);
          setUploadedFiles(filesData.files || []);
        } catch (err) {
          console.error("Gagal mengambil daftar file:", err);
          setUploadedFiles([]);
        } finally {
          setFilesLoading(false);
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

  const formatPeriodeGaji = (periodeAwal?: string | null, periodeAkhir?: string | null) => {
    if (!periodeAwal || !periodeAkhir) return "-";

    const start = new Date(periodeAwal);
    const end = new Date(periodeAkhir);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${periodeAwal} - ${periodeAkhir}`;
    }

    const startLabel = start.toLocaleDateString("id-ID");
    const endLabel = end.toLocaleDateString("id-ID");
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  };

  const filteredSalaryHistory = useMemo(() => {
    const start = salaryRangeStart ? new Date(salaryRangeStart) : null;
    const end = salaryRangeEnd ? new Date(salaryRangeEnd) : null;

    return salaryHistory.filter((salary) => {
      const periodStart = salary?.periodeAwal ? new Date(salary.periodeAwal) : null;
      const periodEnd = salary?.periodeAkhir ? new Date(salary.periodeAkhir) : null;
      if (!periodStart || Number.isNaN(periodStart.getTime())) return true;
      if (!periodEnd || Number.isNaN(periodEnd.getTime())) return true;

      if (start && Number.isNaN(start.getTime())) return true;
      if (end && Number.isNaN(end.getTime())) return true;

      if (start && periodEnd < start) return false;
      if (end && periodStart > end) return false;
      return true;
    });
  }, [salaryHistory, salaryRangeStart, salaryRangeEnd]);

  const getSalaryRowKey = (salary: any, index: number) => {
    const idPart = salary?.id ? String(salary.id) : "no-id";
    const startPart = salary?.periodeAwal ? String(salary.periodeAwal) : "no-start";
    const endPart = salary?.periodeAkhir ? String(salary.periodeAkhir) : "no-end";
    return `${idPart}-${startPart}-${endPart}-${index}`;
  };

  const exportedSalaryGroups = useMemo(() => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const paidRows = filteredSalaryHistory
      .map((salary, index) => {
        const start = new Date(salary?.periodeAwal || "");
        const end = new Date(salary?.periodeAkhir || "");
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }

        return {
          salary,
          rowKey: getSalaryRowKey(salary, index),
          start,
          end,
        };
      })
      .filter((item): item is { salary: any; rowKey: string; start: Date; end: Date } => Boolean(item))
      .filter((item) => String(item.salary?.statusPembayaran || "").trim().toLowerCase() === "dibayar")
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const grouped: Array<{
      periodeAwal: Date;
      periodeAkhir: Date;
      rows: Array<{ salary: any; rowKey: string }>;
    }> = [];

    for (const item of paidRows) {
      const lastGroup = grouped[grouped.length - 1];
      if (!lastGroup) {
        grouped.push({
          periodeAwal: item.start,
          periodeAkhir: item.end,
          rows: [{ salary: item.salary, rowKey: item.rowKey }],
        });
        continue;
      }

      const isSameBatch = item.start.getTime() <= lastGroup.periodeAkhir.getTime() + ONE_DAY_MS;
      if (isSameBatch) {
        lastGroup.rows.push({ salary: item.salary, rowKey: item.rowKey });
        if (item.end > lastGroup.periodeAkhir) {
          lastGroup.periodeAkhir = item.end;
        }
      } else {
        grouped.push({
          periodeAwal: item.start,
          periodeAkhir: item.end,
          rows: [{ salary: item.salary, rowKey: item.rowKey }],
        });
      }
    }

    return grouped
      .map((group, index) => ({
        key: `export-${group.periodeAwal.toISOString()}-${group.periodeAkhir.toISOString()}-${index}`,
        periodeAwal: group.periodeAwal.toISOString(),
        periodeAkhir: group.periodeAkhir.toISOString(),
        rows: group.rows,
      }))
      .reverse();
  }, [filteredSalaryHistory]);

  useEffect(() => {
    if (exportedSalaryGroups.length === 0) {
      setSelectedExportedSalaryKey(null);
      return;
    }

    const hasSelected = exportedSalaryGroups.some((item) => item.key === selectedExportedSalaryKey);

    if (!hasSelected) {
      setSelectedExportedSalaryKey(exportedSalaryGroups[0].key);
    }
  }, [exportedSalaryGroups, selectedExportedSalaryKey]);

  const selectedSalary = useMemo(() => {
    if (!selectedExportedSalaryKey) return null;
    const found = exportedSalaryGroups.find((item) => item.key === selectedExportedSalaryKey);
    if (!found || found.rows.length === 0) return null;

    const latestRow = found.rows[found.rows.length - 1].salary;
    const totalGajiPokok = found.rows.reduce((sum, item) => sum + (Number(item.salary?.gajiPokok) || 0), 0);
    const totalBonus = found.rows.reduce((sum, item) => sum + (Number(item.salary?.bonus) || 0), 0);
    const totalPotongan = found.rows.reduce((sum, item) => sum + (Number(item.salary?.potongan) || 0), 0);
    const totalBersih = found.rows.reduce((sum, item) => sum + (Number(item.salary?.totalGajiBersih) || 0), 0);

    return {
      ...latestRow,
      periodeAwal: found.periodeAwal,
      periodeAkhir: found.periodeAkhir,
      gajiPokok: totalGajiPokok,
      bonus: totalBonus,
      potongan: totalPotongan,
      totalGajiBersih: totalBersih,
      statusPembayaran: "Dibayar",
      _groupRows: found.rows.map((row) => row.salary),
    };
  }, [exportedSalaryGroups, selectedExportedSalaryKey]);

  const normalizeRincianItems = (
    raw: unknown,
    fallbackLabel: string
  ): Array<{ judul: string; nominal: number }> => {
    if (!raw) return [];

    const toNominal = (value: unknown): number => {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : 0;
    };

    if (Array.isArray(raw)) {
      return raw
        .map((item: any, index) => {
          const nominal =
            toNominal(item?.nominal) ||
            toNominal(item?.jumlah) ||
            toNominal(item?.nilai) ||
            toNominal(item?.amount);
          const judul =
            item?.judul ||
            item?.itemName ||
            item?.nama ||
            item?.label ||
            `${fallbackLabel} ${index + 1}`;

          return {
            judul: String(judul),
            nominal,
          };
        })
        .filter((item) => item.nominal !== 0 || item.judul);
    }

    if (typeof raw === "object") {
      return Object.entries(raw as Record<string, unknown>)
        .map(([key, value]) => {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            const nested = value as Record<string, unknown>;
            const nominal =
              toNominal(nested.nominal) ||
              toNominal(nested.jumlah) ||
              toNominal(nested.nilai) ||
              toNominal(nested.amount);
            const judul =
              String(nested.judul || nested.itemName || nested.nama || nested.label || key);
            return { judul, nominal };
          }
          return {
            judul: String(key),
            nominal: toNominal(value),
          };
        })
        .filter((item) => item.nominal !== 0 || item.judul);
    }

    return [];
  };

  const selectedSalaryRincian = useMemo(() => {
    if (!selectedSalary) {
      return {
        bonusItems: [] as Array<{ judul: string; nominal: number }>,
        potonganItems: [] as Array<{ judul: string; nominal: number }>,
      };
    }

    const sourceRows = Array.isArray((selectedSalary as any)._groupRows)
      ? (selectedSalary as any)._groupRows
      : [selectedSalary];

    const bonusMap = new Map<string, number>();
    const potonganMap = new Map<string, number>();

    const upsertItems = (target: Map<string, number>, items: Array<{ judul: string; nominal: number }>) => {
      for (const item of items) {
        const judul = String(item.judul || "").trim();
        if (!judul) continue;
        target.set(judul, (target.get(judul) || 0) + (Number(item.nominal) || 0));
      }
    };

    for (const row of sourceRows) {
      const bonusCandidates = [
        row.bonusItems,
        row.bonusDetail,
        row.bonusDetails,
        row.rincianBonus,
        row.detailBonus,
        row.bonusList,
      ];

      const potonganCandidates = [
        row.potonganItems,
        row.potonganDetail,
        row.potonganDetails,
        row.rincianPotongan,
        row.detailPotongan,
        row.potonganList,
      ];

      for (const candidate of bonusCandidates) {
        const normalized = normalizeRincianItems(candidate, "Bonus");
        if (normalized.length > 0) {
          upsertItems(bonusMap, normalized);
          break;
        }
      }

      for (const candidate of potonganCandidates) {
        const normalized = normalizeRincianItems(candidate, "Potongan");
        if (normalized.length > 0) {
          upsertItems(potonganMap, normalized);
          break;
        }
      }
    }

    let bonusItems = Array.from(bonusMap.entries()).map(([judul, nominal]) => ({ judul, nominal }));
    let potonganItems = Array.from(potonganMap.entries()).map(([judul, nominal]) => ({ judul, nominal }));

    const bonusTotal = Number(selectedSalary.bonus) || 0;
    const potonganTotal = Number(selectedSalary.potongan) || 0;

    if (bonusItems.length === 0 && bonusTotal > 0) {
      bonusItems = [{ judul: "Total Bonus", nominal: bonusTotal }];
    }

    if (potonganItems.length === 0 && potonganTotal > 0) {
      potonganItems = [{ judul: "Total Potongan", nominal: potonganTotal }];
    }

    return { bonusItems, potonganItems };
  }, [selectedSalary]);

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

  const formatIzinSakitTanggal = (tanggal?: string) => {
    if (!tanggal) return "-";
    const date = new Date(tanggal);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const filteredIzinSakitHistory = useMemo(() => {
    if (izinSakitFilter === "all") return izinSakitHistory;
    return izinSakitHistory.filter((item) => item?.status === izinSakitFilter);
  }, [izinSakitFilter, izinSakitHistory]);

  const renderIzinSakitBadge = (status?: string) => {
    if (status === "IZIN") {
      return (
        <Badge className="border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.22)]">
          Izin
        </Badge>
      );
    }

    if (status === "TIDAK_HADIR") {
      return (
        <Badge className="border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.16)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.22)]">
          Tidak Hadir
        </Badge>
      );
    }

    return <Badge variant="outline">-</Badge>;
  };

  const renderLeaveTypeLabel = (leave: any) => {
    if (leave?.jenisCuti === "CUTI_TAHUNAN") return "Cuti Tahunan";
    if (leave?.jenisCuti === "CUTI_MELAHIRKAN") return "Cuti Melahirkan";
    if (leave?.jenisCuti === "CUTI_LAINNYA") return leave?.labelCustom || "Cuti Lainnya";
    return leave?.jenisCuti || "-";
  };

  const renderLeaveStatusBadge = (status?: string) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "PENDING") {
      return <Badge className="bg-slate-100 text-slate-700">Menunggu</Badge>;
    }
    if (normalized === "APPROVED") {
      return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>;
    }
    if (normalized === "REJECTED") {
      return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>;
    }
    return <Badge variant="outline">-</Badge>;
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

  const showAttendanceTab = attendanceHistory.length > 0;
  const tabGridClass = showAttendanceTab ? "grid w-full grid-cols-7" : "grid w-full grid-cols-6";

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
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/dashboard/employees/${employee.id}/pkb`}>
              <FileText className="h-4 w-4 mr-2" />
              Generate PKB
            </a>
          </Button>
          <Button asChild>
            <a href={`/dashboard/employees/${employee.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Data
            </a>
          </Button>
        </div>
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
                    target.src = HUMAN_FALLBACK_AVATAR;
                  }}
                  onLoad={() => {
                    // Tidak perlu log apa-apa di sini
                  }}
                />
                <AvatarFallback className="bg-slate-100 text-slate-500">
                  <UserRound className="h-10 w-10" />
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
                      Sisa Cuti: {leaveInfo.sisaCuti}/{leaveInfo.batasMaksimal} hari
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
        <TabsList className={tabGridClass}>
          <TabsTrigger value="personal">Data Pribadi</TabsTrigger>
          <TabsTrigger value="salary">Riwayat Gaji</TabsTrigger>
          {showAttendanceTab && <TabsTrigger value="attendance">Riwayat Absensi</TabsTrigger>}
          <TabsTrigger value="izin-sakit">Izin & Sakit</TabsTrigger>
          <TabsTrigger value="leave">Riwayat Cuti</TabsTrigger>
          <TabsTrigger value="violations">Pelanggaran</TabsTrigger>
          <TabsTrigger value="files">
            <Paperclip className="h-4 w-4 mr-1" />
            Dokumen ({uploadedFiles.length})
          </TabsTrigger>
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
                          leaveInfo.sisaCuti > leaveInfo.batasMaksimal / 2
                            ? "bg-green-500"
                            : leaveInfo.sisaCuti > leaveInfo.batasMaksimal / 4
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${
                            (leaveInfo.sisaCuti / Math.max(1, leaveInfo.batasMaksimal)) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(
                        (leaveInfo.sisaCuti / Math.max(1, leaveInfo.batasMaksimal)) * 100
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
                      Object.entries(employee._rawKaryawan)
                        .filter(
                          ([key]) =>
                            !["absensi", "cuti", "gaji", "pelanggaran"].includes(key)
                        )
                        .map(([key, value]) => {
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

                          // Format value untuk tampilan (hindari [object Object])
                          const formatValue = (v: unknown): string => {
                            if (v === null || v === undefined) return "-";
                            if (Array.isArray(v))
                              return `${v.length} item`;
                            if (typeof v === "object" && v instanceof Date)
                              return v.toLocaleDateString("id-ID");
                            if (typeof v === "object")
                              return "[Data objek]";
                            return String(v);
                          };

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
                                    {formatValue(value)}
                                  </span>
                                )}
                              </td>
                              <td className="border px-2 py-1 font-mono text-xs">
                                {isEncrypted ? (
                                  <span className="text-red-600 font-bold">
                                    {formatValue(value)}
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
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Dari tanggal</label>
                  <Input
                    type="date"
                    value={salaryRangeStart}
                    onChange={(event) => setSalaryRangeStart(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Sampai tanggal</label>
                  <Input
                    type="date"
                    value={salaryRangeEnd}
                    onChange={(event) => setSalaryRangeEnd(event.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSalaryRangeStart("");
                      setSalaryRangeEnd("");
                    }}
                  >
                    Reset Range
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7 rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Daftar Periode Gaji</h3>
                    <p className="text-xs text-gray-500">Pilih satu periode untuk melihat rincian bonus dan potongan.</p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead>Gaji Pokok</TableHead>
                        <TableHead>Gaji Bersih</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSalaryHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            Tidak ada data gaji
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSalaryHistory.map((salary, idx) => {
                          const rowKey = getSalaryRowKey(salary, idx);

                          return (
                            <TableRow
                              key={rowKey}
                              className=""
                            >
                              <TableCell className="font-medium">
                                {formatPeriodeGaji(salary.periodeAwal, salary.periodeAkhir)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(Number(salary.gajiPokok) || 0)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(salary.totalGajiBersih) || 0)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(salary.statusPembayaran || "-")}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="lg:col-span-5 rounded-lg border bg-gray-50/40">
                  <div className="border-b px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Rincian Periode Terpilih</h3>
                    {exportedSalaryGroups.length > 0 ? (
                      <div className="mt-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Daftar periode hasil export (Dibayar)
                        </label>
                        <select
                          className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-xs"
                          value={selectedExportedSalaryKey || ""}
                          onChange={(event) => setSelectedExportedSalaryKey(event.target.value)}
                        >
                          {exportedSalaryGroups.map((item) => (
                            <option key={item.key} value={item.key}>
                              {`${formatPeriodeGaji(item.periodeAwal, item.periodeAkhir)} · ${item.rows.length} entri · ${formatCurrency(
                                item.rows.reduce((sum, row) => sum + (Number(row.salary?.totalGajiBersih) || 0), 0)
                              )}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {selectedSalary ? (
                      <>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatPeriodeGaji(selectedSalary.periodeAwal, selectedSalary.periodeAkhir)}
                        </p>
                        <div className="mt-2">{getStatusBadge(selectedSalary.statusPembayaran || "-")}</div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Belum ada periode hasil export (status Dibayar).</p>
                    )}
                  </div>

                  <div className="space-y-4 p-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-green-700">Bonus</h4>
                        <span className="text-xs font-medium text-green-700">
                          {formatCurrency(Number(selectedSalary?.bonus) || 0)}
                        </span>
                      </div>
                      {selectedSalaryRincian.bonusItems.length === 0 ? (
                        <p className="text-xs text-gray-500">Tidak ada rincian bonus pada periode ini.</p>
                      ) : (
                        <div className="space-y-1">
                          {selectedSalaryRincian.bonusItems.map((item, idx) => (
                            <div
                              key={`bonus-${idx}`}
                              className="flex items-center justify-between rounded border border-green-100 bg-green-50 px-2 py-1 text-xs"
                            >
                              <span className="text-green-900">{item.judul}</span>
                              <span className="font-medium text-green-800">{formatCurrency(item.nominal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-red-700">Potongan</h4>
                        <span className="text-xs font-medium text-red-700">
                          {formatCurrency(Number(selectedSalary?.potongan) || 0)}
                        </span>
                      </div>
                      {selectedSalaryRincian.potonganItems.length === 0 ? (
                        <p className="text-xs text-gray-500">Tidak ada rincian potongan pada periode ini.</p>
                      ) : (
                        <div className="space-y-1">
                          {selectedSalaryRincian.potonganItems.map((item, idx) => (
                            <div
                              key={`potongan-${idx}`}
                              className="flex items-center justify-between rounded border border-red-100 bg-red-50 px-2 py-1 text-xs"
                            >
                              <span className="text-red-900">{item.judul}</span>
                              <span className="font-medium text-red-800">{formatCurrency(item.nominal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded border bg-white p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                        <span>Gaji Pokok</span>
                        <span>{formatCurrency(Number(selectedSalary?.gajiPokok) || 0)}</span>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                        <span>Total Bonus</span>
                        <span className="text-green-700">+ {formatCurrency(Number(selectedSalary?.bonus) || 0)}</span>
                      </div>
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
                        <span>Total Potongan</span>
                        <span className="text-red-700">- {formatCurrency(Number(selectedSalary?.potongan) || 0)}</span>
                      </div>
                      <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold text-gray-900">
                        <span>Gaji Bersih</span>
                        <span>{formatCurrency(Number(selectedSalary?.totalGajiBersih) || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showAttendanceTab && <TabsContent value="attendance">
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
        </TabsContent>}

        <TabsContent value="izin-sakit">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Izin & Sakit</CardTitle>
              <CardDescription>
                Data izin dan tidak hadir dari absensi harian
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={izinSakitFilter === "all" ? "default" : "outline"}
                  onClick={() => setIzinSakitFilter("all")}
                >
                  Semua
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={izinSakitFilter === "IZIN" ? "default" : "outline"}
                  onClick={() => setIzinSakitFilter("IZIN")}
                >
                  Izin
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={izinSakitFilter === "TIDAK_HADIR" ? "default" : "outline"}
                  onClick={() => setIzinSakitFilter("TIDAK_HADIR")}
                >
                  Sakit
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Lembur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIzinSakitHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Tidak ada riwayat izin atau sakit
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIzinSakitHistory.map((item, index) => (
                      <TableRow key={String(item.id)}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {formatIzinSakitTanggal(item.tanggal)}
                        </TableCell>
                        <TableCell>{renderIzinSakitBadge(item.status)}</TableCell>
                        <TableCell>{item.keterangan || "-"}</TableCell>
                        <TableCell>{item.isLembur ? "Lembur" : "-"}</TableCell>
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
                  <span className="text-sm text-gray-600">
                    Jatah Cuti Tahunan {leaveInfo.tahun}: {leaveInfo.terpakai}/{leaveInfo.batasMaksimal} hari terpakai (sisa {leaveInfo.sisaCuti} hari)
                  </span>
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
                    <TableHead>No</TableHead>
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Jumlah Hari</TableHead>
                    <TableHead>Status</TableHead>
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
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">
                          {renderLeaveTypeLabel(leave)}
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
                          {leave.jumlahHari ? `${leave.jumlahHari} hari` : "-"}
                        </TableCell>
                        <TableCell>
                          {renderLeaveStatusBadge(leave.status)}
                        </TableCell>
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

        {/* Tab Dokumen / File Upload */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Daftar Dokumen
              </CardTitle>
              <CardDescription>
                File yang sudah di-upload untuk karyawan ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <span className="ml-2 text-gray-600">Memuat daftar file...</span>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <FileIcon className="h-12 w-12 mb-3" />
                  <p className="text-lg font-medium">Belum ada file yang di-upload</p>
                  <p className="text-sm">File foto profil, dokumen PKB, bukti pelanggaran, dan slip gaji akan muncul di sini</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary by category */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Array.from(new Set(uploadedFiles.map(f => f.kategori))).map(kategori => {
                      const count = uploadedFiles.filter(f => f.kategori === kategori).length;
                      return (
                        <Badge key={kategori} variant="outline" className="text-sm">
                          {kategori} ({count})
                        </Badge>
                      );
                    })}
                  </div>

                  {/* File list table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Nama File</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Ukuran</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            {file.tipe === 'image' ? (
                              <Image className="h-5 w-5 text-blue-500" />
                            ) : file.tipe === 'pdf' ? (
                              <FileText className="h-5 w-5 text-red-500" />
                            ) : (
                              <FileIcon className="h-5 w-5 text-gray-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {file.nama}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              file.kategori === 'Foto Profil' ? 'bg-blue-50 text-blue-700' :
                              file.kategori === 'PKB' ? 'bg-green-50 text-green-700' :
                              file.kategori === 'Pelanggaran' ? 'bg-red-50 text-red-700' :
                              file.kategori === 'Slip Gaji' ? 'bg-yellow-50 text-yellow-700' :
                              ''
                            }>
                              {file.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell className="uppercase text-xs text-gray-500">
                            {file.tipe}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {file.ukuran
                              ? file.ukuran > 1024 * 1024
                                ? `${(file.ukuran / (1024 * 1024)).toFixed(1)} MB`
                                : `${(file.ukuran / 1024).toFixed(1)} KB`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {file.tanggal
                              ? new Date(file.tanggal).toLocaleDateString('id-ID')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {file.keterangan || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(file.tipe === 'image' || file.tipe === 'pdf') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Preview"
                                  onClick={() => {
                                    setPreviewFile(file);
                                    // Load file with auth token
                                    const token = localStorage.getItem('token');
                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL
                                      ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
                                        + (!process.env.NEXT_PUBLIC_API_URL.endsWith('/api') ? '/api' : '')
                                      : 'http://localhost:8084/api';
                                    const fileUrl = file.kategori === 'Foto Profil'
                                      ? `${baseUrl}/karyawan/${employee.id}/foto`
                                      : `${baseUrl}/karyawan/${employee.id}/files/serve?path=${encodeURIComponent(file.path)}`;
                                    if (token) {
                                      fetch(fileUrl, {
                                        headers: { Authorization: `Bearer ${token}` },
                                      })
                                        .then(res => {
                                          if (res.ok) return res.blob();
                                          throw new Error('Failed to load');
                                        })
                                        .then(blob => {
                                          const url = URL.createObjectURL(blob);
                                          setPreviewUrl(url);
                                        })
                                        .catch(() => setPreviewUrl(null));
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Download"
                                onClick={() => {
                                  const token = localStorage.getItem('token');
                                  const baseUrl = process.env.NEXT_PUBLIC_API_URL
                                    ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
                                      + (!process.env.NEXT_PUBLIC_API_URL.endsWith('/api') ? '/api' : '')
                                    : 'http://localhost:8084/api';
                                  const fileUrl = file.kategori === 'Foto Profil'
                                    ? `${baseUrl}/karyawan/${employee.id}/foto`
                                    : `${baseUrl}/karyawan/${employee.id}/files/serve?path=${encodeURIComponent(file.path)}`;
                                  if (token) {
                                    fetch(fileUrl, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    })
                                      .then(res => {
                                        if (res.ok) return res.blob();
                                        throw new Error('Failed');
                                      })
                                      .then(blob => {
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = file.nama.replace(/[^a-zA-Z0-9.-]/g, '_');
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                      })
                                      .catch(() => alert('Gagal download file'));
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold">{previewFile.nama}</h3>
                <p className="text-sm text-gray-500">{previewFile.kategori} &bull; {previewFile.tipe}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPreviewFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 rounded min-h-[300px]">
              {!previewUrl ? (
                <div className="flex flex-col items-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-2"></div>
                  <p>Memuat preview...</p>
                </div>
              ) : previewFile.tipe === 'image' ? (
                <img
                  src={previewUrl}
                  alt={previewFile.nama}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : previewFile.tipe === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border-0"
                  title={previewFile.nama}
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <FileIcon className="h-16 w-16 mb-3" />
                  <p>Preview tidak tersedia untuk tipe file ini</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
