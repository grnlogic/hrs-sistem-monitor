import { apiRequest, type CompanyFilter } from "./core"
import type { LokasiCode } from "./types"

export const attendanceAPI = {
  getAll: async (company: CompanyFilter = "") => {
    try {
      const allAttendanceData = await apiRequest("/absensi", {}, company)
      
      return (allAttendanceData || []).map((attendance: any) => ({
        id: attendance.id,
        karyawanId: attendance.karyawan?.id || attendance.karyawanId,
        tanggal: attendance.tanggal,
        date: attendance.tanggal,
        status: attendance.status,
        lokasi: attendance.lokasi,
        hadir: attendance.hadir,
        setengahHari: attendance.setengahHari,
        isLembur: attendance.isLembur,
        hariEfektif: attendance.hariEfektif,
        waktuMasuk: attendance.waktuMasuk,
        waktuPulang: attendance.waktuPulang,
        checkIn: attendance.waktuMasuk,
        checkOut: attendance.waktuPulang,
        keterangan: attendance.keterangan,
        notes: attendance.keterangan,
        karyawan: attendance.karyawan || {
          id: attendance.karyawanId,
          namaLengkap: "Unknown",
          nik: "-"
        }
      }))
    } catch (error) {
      console.error("Error fetching all attendance data:", error)
      throw error
    }
  },

  getAllLegacy: async () => {
    return apiRequest("/absensi/rekap")
  },

  create: async (data: any) => {
    const mapped = {
      karyawanId: data.karyawanId,
      tanggal: data.tanggal,
      hadir: data.status === "Hadir",
      status: data.status,
    }
    return apiRequest("/absensi", {
      method: "POST",
      body: JSON.stringify(mapped),
    })
  },

  createJson: async (data: any) => {
    return apiRequest("/absensi", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  submitBulk: async (data: {
    tanggal: string;
    data: Array<{
      karyawanId: number | string;
      status: string;
      isLembur?: boolean;
      keterangan?: string;
      lokasi?: LokasiCode;
    }>;
  }) => {
    return apiRequest("/absensi/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getByEmployee: async (employeeId: string) => {
    return apiRequest(`/absensi/karyawan/${employeeId}`)
  },

  getIzinSakitByEmployee: async (employeeId: string) => {
    return apiRequest(`/absensi/karyawan/${employeeId}?status=IZIN,TIDAK_HADIR`) as Promise<{
      data: Array<{
        id: string
        tanggal: string
        status: "IZIN" | "TIDAK_HADIR"
        keterangan?: string | null
        isLembur?: boolean
        hariEfektif?: number | string
      }>
      total: number
    }>
  },

  update: async (id: string | number, data: any) => {
    return apiRequest(`/absensi/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest(`/absensi/${id}`, {
      method: "DELETE",
    })
  },

  deleteAll: async () => {
    return apiRequest("/absensi/clear-all", {
      method: "DELETE",
    })
  },

  clearAll: async () => {
    return apiRequest("/absensi/clear-all", {
      method: "DELETE",
    })
  },

  deleteToday: async () => {
    return apiRequest("/absensi/clear-today", {
      method: "DELETE",
    })
  },
}
