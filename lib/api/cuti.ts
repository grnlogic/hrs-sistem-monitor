import { apiRequest } from "./core"

export const leaveAPI = {
  getAll: async () => {
    return apiRequest("/cuti")
  },

  create: async (data: any) => {
    return apiRequest("/cuti", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  approve: async (id: string) => {
    return apiRequest(`/cuti/${id}/approve`, {
      method: "PUT",
    })
  },

  reject: async (id: string, reason: string) => {
    return apiRequest(`/cuti/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    })
  },

  getEmployeeLeaveInfo: async (karyawanId: string) => {
    return apiRequest(`/cuti/karyawan/${karyawanId}/jumlah-tahun-ini`)
  },

  getByEmployeeAndYear: async (karyawanId: string, tahun: number) => {
    return apiRequest(`/cuti/karyawan/${karyawanId}/tahun/${tahun}`)
  },

  getEmployeeLeaveQuota: async (karyawanId: string, tahun?: number) => {
    const yearQuery = Number.isInteger(tahun) ? `?tahun=${tahun}` : ""
    return apiRequest(`/cuti/karyawan/${karyawanId}/kuota${yearQuery}`)
  },

  getEmployeeLeaveQuotaHistory: async (karyawanId: string, tahun?: number) => {
    const yearQuery = Number.isInteger(tahun) ? `?tahun=${tahun}` : ""
    return apiRequest(`/cuti/karyawan/${karyawanId}/kuota${yearQuery}`)
  },

  updateEmployeeLeaveQuota: async (
    karyawanId: string,
    data: { tahun?: number; batasMaksimal: number }
  ) => {
    return apiRequest(`/cuti/karyawan/${karyawanId}/kuota`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  resetAnnualQuota: async () => {
    return apiRequest("/cuti/reset-tahunan", {
      method: "POST",
    })
  },
}
