"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/navigation/tabs";
import { ArrowLeft, Edit } from "lucide-react";
import { attendanceAPI, employeeAPI, leaveAPI } from "@/lib/api";
import {
  Crop as CropType,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";

// Extracted components
import { PersonalInfoTab } from "./_components/personal-info-tab";
import { SalaryTab } from "./_components/salary-tab";
import { AttendanceTab } from "./_components/attendance-tab";
import { IzinSakitTab } from "./_components/izin-sakit-tab";
import { LeaveTab } from "./_components/leave-tab";
import { ViolationsTab } from "./_components/violations-tab";
import { FilesTab } from "./_components/files-tab";
import { EmployeeProfileCard } from "./_components/employee-profile-card";
import { CropModal } from "./_components/crop-modal";
import { FilePreviewModal } from "./_components/file-preview-modal";
import { getSalaryRowKey, determineSubStatus } from "./_components/utils";

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
  const [izinSakitFilter, setIzinSakitFilter] = useState<"all" | "IZIN" | "SAKIT" | "ALPA" | "LIBUR">("all");
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

  const filteredIzinSakitHistory = useMemo(() => {
    if (izinSakitFilter === "all") return izinSakitHistory;
    return izinSakitHistory.filter((item) => {
      const sub = determineSubStatus(item?.status, item?.keterangan || item?.notes);
      return sub === izinSakitFilter;
    });
  }, [izinSakitFilter, izinSakitHistory]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
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
            <h1 className="text-3xl font-bold text-zinc-900">
              Detail Karyawan
            </h1>
            <p className="text-zinc-600">Informasi lengkap karyawan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/dashboard/employees/${employee.id}/pkb`}>
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
        <CropModal
          crop={crop}
          setCrop={setCrop}
          setCompletedCrop={setCompletedCrop}
          imgSrc={imgSrc}
          imgRef={imgRef}
          onImageLoad={onImageLoad}
          handleCancelCrop={handleCancelCrop}
          handleCropComplete={handleCropComplete}
          completedCrop={completedCrop}
        />
      )}

      {/* Employee Profile Card */}
      <EmployeeProfileCard
        employee={employee}
        avatarSrc={avatarSrc}
        leaveInfo={leaveInfo}
        uploadError={uploadError}
        uploading={uploading}
        handleUploadFoto={handleUploadFoto}
      />

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
            Dokumen ({uploadedFiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <PersonalInfoTab employee={employee} leaveInfo={leaveInfo} />
        </TabsContent>

        <TabsContent value="salary">
          <SalaryTab
            filteredSalaryHistory={filteredSalaryHistory}
            salaryRangeStart={salaryRangeStart}
            salaryRangeEnd={salaryRangeEnd}
            setSalaryRangeStart={setSalaryRangeStart}
            setSalaryRangeEnd={setSalaryRangeEnd}
            exportedSalaryGroups={exportedSalaryGroups}
            selectedExportedSalaryKey={selectedExportedSalaryKey}
            setSelectedExportedSalaryKey={setSelectedExportedSalaryKey}
            selectedSalary={selectedSalary}
            selectedSalaryRincian={selectedSalaryRincian}
          />
        </TabsContent>

        {showAttendanceTab && <TabsContent value="attendance">
          <AttendanceTab attendanceHistory={attendanceHistory} />
        </TabsContent>}

        <TabsContent value="izin-sakit">
          <IzinSakitTab
            izinSakitHistory={izinSakitHistory}
            filteredIzinSakitHistory={filteredIzinSakitHistory}
            izinSakitFilter={izinSakitFilter}
            setIzinSakitFilter={setIzinSakitFilter}
          />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveTab leaveHistory={leaveHistory} leaveInfo={leaveInfo} />
        </TabsContent>

        <TabsContent value="violations">
          <ViolationsTab violationHistory={violationHistory} />
        </TabsContent>

        {/* Tab Dokumen / File Upload */}
        <TabsContent value="files">
          <FilesTab
            filesLoading={filesLoading}
            uploadedFiles={uploadedFiles}
            employee={employee}
            setPreviewFile={setPreviewFile}
            setPreviewUrl={setPreviewUrl}
          />
        </TabsContent>
      </Tabs>

      {/* File Preview Modal */}
      <FilePreviewModal
        previewFile={previewFile}
        previewUrl={previewUrl}
        setPreviewFile={setPreviewFile}
        setPreviewUrl={setPreviewUrl}
      />
    </div>
  );
}
