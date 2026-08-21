import { apiRequest, API_BASE_URL, API_TIMEOUT, getAuthToken, appendCompanyFilter, type CompanyFilter } from "./core"

// Helper for requests with custom content-type or plain text responses
const fetchWithConfig = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
    }
    throw error
  }
}

export const salaryAPI = {
  getSalaryItems: async (type?: "BONUS" | "POTONGAN") => {
    const params = new URLSearchParams()
    if (type) params.append("type", type)
    const query = params.toString()
    return apiRequest(`/gaji/items${query ? `?${query}` : ""}`)
  },

  createSalaryItem: async (data: { type: "BONUS" | "POTONGAN", nama: string }) => {
    return apiRequest("/gaji/items", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getAll: async (karyawanId: string) => {
    return apiRequest(`/gaji/rekap?karyawanId=${karyawanId}`)
  },

  addBonus: async (data: { gajiId: string, bonus: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("bonus", String(data.bonus))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")

    return apiRequest(`/gaji/bonus?${params.toString()}`, {
      method: "POST",
    })
  },

  addBonusByDepartmentEqual: async (data: { departemen: string, bonus: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("departemen", data.departemen)
    params.append("bonus", String(data.bonus))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")

    return apiRequest(`/gaji/bonus/department/equal?${params.toString()}`, {
      method: "POST",
    })
  },

  addBonusByDepartmentDifferent: async (data: { departemen: string, bonuses: { [key: string]: number }, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append('departemen', data.departemen)
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    
    Object.entries(data.bonuses).forEach(([gajiId, bonus]) => {
      params.append(`bonuses[${gajiId}]`, bonus.toString())
    })
    
    return fetchWithConfig(`${API_BASE_URL}/gaji/bonus/department/different?${params.toString()}`, {
      method: "POST",
    })
  },

  getGajiByDepartment: async (departemen: string) => {
    return apiRequest(`/gaji/department?departemen=${encodeURIComponent(departemen)}`)
  },

  getGajiByDateRange: async (tanggalMulai: string, tanggalAkhir: string, karyawanId?: string, departemen?: string, company: CompanyFilter = "") => {
    const params = new URLSearchParams()
    params.append('tanggalMulai', tanggalMulai)
    params.append('tanggalAkhir', tanggalAkhir)
    
    if (karyawanId) params.append('karyawanId', karyawanId)
    if (departemen) params.append('departemen', departemen)
    
    return apiRequest(`/gaji/filter?${params.toString()}`, {}, company)
  },

  updateStatusPembayaran: async (data: { gajiId: string, statusPembayaran: string }) => {
    return apiRequest(`/gaji/status?gajiId=${data.gajiId}&statusPembayaran=${data.statusPembayaran}`, {
      method: "PUT",
    })
  },

  updateStatusPembayaranWithPeriod: async (data: { 
    gajiId: string, 
    statusPembayaran: string, 
    periodeAwal?: string, 
    periodeAkhir?: string 
  }) => {
    const params = new URLSearchParams()
    params.append('gajiId', data.gajiId)
    params.append('statusPembayaran', data.statusPembayaran)
    
    if (data.periodeAwal) params.append('periodeAwal', data.periodeAwal)
    if (data.periodeAkhir) params.append('periodeAkhir', data.periodeAkhir)
    
    return apiRequest(`/gaji/status-with-period?${params.toString()}`, {
      method: "PUT",
    })
  },

  getGajiByDateRangeDetailed: async (startDate: string, endDate: string) => {
    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    
    return apiRequest(`/gaji/by-date-range?${params.toString()}`)
  },

  // Potongan API
  addPajakPph21: async (data: { gajiId: string, pajakPph21: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("pajakPph21", String(data.pajakPph21))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/pph21?${params.toString()}`, { method: "POST" })
  },

  addPotonganKeterlambatan: async (data: { gajiId: string, potonganKeterlambatan: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganKeterlambatan", String(data.potonganKeterlambatan))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/keterlambatan?${params.toString()}`, { method: "POST" })
  },

  addPotonganPinjaman: async (data: { gajiId: string, potonganPinjaman: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganPinjaman", String(data.potonganPinjaman))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/pinjaman?${params.toString()}`, { method: "POST" })
  },

  addPotonganSumbangan: async (data: { gajiId: string, potonganSumbangan: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganSumbangan", String(data.potonganSumbangan))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/sumbangan?${params.toString()}`, { method: "POST" })
  },

  addPotonganBpjs: async (data: { gajiId: string, potonganBpjs: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganBpjs", String(data.potonganBpjs))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/bpjs?${params.toString()}`, { method: "POST" })
  },

  addPotonganUndangan: async (data: { gajiId: string, potonganUndangan: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganUndangan", String(data.potonganUndangan))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/undangan?${params.toString()}`, { method: "POST" })
  },

  addPotonganCustom: async (data: { gajiId: string, nominal: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("nominal", String(data.nominal))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/custom?${params.toString()}`, { method: "POST" })
  },

  getDivisionDefaultBonuses: async (divisi: string) => {
    return apiRequest(`/gaji/divisi-bonus?divisi=${encodeURIComponent(divisi)}`)
  },

  getBonusPotonganDetail: async (gajiId: string) => {
    return apiRequest(`/gaji/${gajiId}/bonus-potongan`)
  },

  koreksiHariEfektifNonStaff: async (data: {
    gaji_id: string
    karyawan_id: string
    total_hari_efektif: number
    gaji_pokok: number
  }) => {
    return apiRequest(`/salary/non-staff/koreksi-hari-efektif`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }) as Promise<{
      success: boolean
      data: {
        gaji_id: string
        total_hari_efektif: number
        gaji_pokok: number
      }
    }>
  },

  getKikipingOlehList: async () => {
    return apiRequest(`/gaji/kikiping-oleh`) as Promise<string[]>
  },

  saveBonusPotongan: async (data: {
    gajiId: string
    karyawanId: string
    bonusItems: Array<{ id?: string; judul: string; nominal: number }>
    potonganItems: Array<{ id?: string; judul: string; nominal: number; isDefault?: boolean }>
    sisaPiutang?: number | null
    pakaiUangPribadi?: boolean
    bayarMingguIni?: boolean
    nominalCicilan?: number | null
  }) => {
    return apiRequest(`/gaji/${data.gajiId}/bonus-potongan`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  resetDraftNonStaff: async (data: {
    periodeAwal: string
    periodeAkhir: string
    karyawanId?: string
  }) => {
    return apiRequest(`/gaji/reset-draft`, {
      method: "POST",
      body: JSON.stringify(data),
    }) as Promise<{
      message: string
      matched: number
      updated: number
      deleted?: number
    }>
  },

  saveNonStaffRekap: async (data: {
    periodeAwal: string;
    periodeAkhir: string;
    lokasi: string;
    diketahuiOleh: string;
    dibuatOleh: string;
    catatan?: string;
    kikipingOleh?: string | null;
    kikipingNominal?: number | null;
    gajiIds: string[];
    piutangPlans?: Array<{
      gajiId: string;
      bayarMingguIni?: boolean;
      nominalCicilan?: number | null;
      pakaiUangPribadi?: boolean;
    }>;
  }) => {
    return apiRequest(`/gaji/rekap-nonstaff`, {
      method: "POST",
      body: JSON.stringify(data),
    }) as Promise<{
      rekap: any;
      successCount: number;
      skippedNoAbsensiCount: number;
      totalPinjamanDipotong?: number;
      pinjamanSkipped?: number;
    }>;
  },

  getNonStaffRekap: async (params: {
    periodeAwal: string;
    periodeAkhir: string;
    lokasi: string;
  }) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/gaji/rekap-nonstaff?${q}`);
  },

  getRekapList: async (company: CompanyFilter = "", page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    return apiRequest(`/gaji/rekap-nonstaff/list?${params.toString()}`, {}, company);
  },

  getRekapDetail: async (id: string) => {
    return apiRequest(`/gaji/rekap-nonstaff/${id}/detail`);
  },

  updateBonusPotonganRekap: async (
    gajiId: string,
    data: {
      bonusItems?: Array<{ id?: string; judul: string; nominal: number }>;
      potonganItems?: Array<{ id?: string; judul: string; nominal: number }>;
      cicilanPinjaman?: number | null;
      bonus?: number;
      potongan?: number;
    }
  ) => {
    return apiRequest(`/gaji/${gajiId}/bonus-potongan-rekap`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteAbsensiWithRecalculate: async (absensiId: string) => {
    return apiRequest(`/absensi/${absensiId}/dengan-recalculate`, {
      method: "DELETE",
    });
  },

  getRekapSlipPayload: async (rekapId: string) => {
    return apiRequest(`/gaji/rekap-nonstaff/${rekapId}/slip-payload`);
  },
}

// Salary Slip Editor API (Slate JSON -> Database)
export const salarySlipEditorAPI = {
  getTemplate: async () => {
    return apiRequest("/salary-slip/template")
  },

  saveTemplate: async (data: { name: string; content: unknown }) => {
    return apiRequest("/salary-slip/template", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  getDocument: async (id: string) => {
    return apiRequest(`/salary-slip/document/${id}`)
  },

  createDocument: async (data: { title: string; content: unknown; karyawanId?: string | number; division?: string }) => {
    return apiRequest("/salary-slip/document", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateDocument: async (id: string, data: { title?: string; content: unknown; division?: string }) => {
    return apiRequest(`/salary-slip/document/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
}

// Standalone salary functions
export const getAllSalaries = async () => {
  return apiRequest("/gaji/rekap-all")
}

export const getAllSalariesAgregated = async () => {
  return apiRequest("/gaji/rekap-all-agregated")
}

export const getGajiByDateRangeDetailed = async (startDate: string, endDate: string) => {
  const params = new URLSearchParams()
  params.append('startDate', startDate)
  params.append('endDate', endDate)
  
  return apiRequest(`/gaji/by-date-range?${params.toString()}`)
}

// Generate Salary API
export const generateSalaryAPI = {
  generateStaffBulanan: async (periode: string, divisi?: string[], company: CompanyFilter = "") => {
    const formData = new URLSearchParams()
    formData.append('periode', periode)
    if (divisi && divisi.length > 0) {
      divisi.forEach((d) => formData.append('divisi', d))
    }
    
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
        const response = await fetch(appendCompanyFilter(`${API_BASE_URL}/gaji/generate-staff-bulanan`, company), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData.toString(),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      return response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  generateNonStaffMingguan: async (periodeAwal: string, periodeAkhir: string, divisi?: string[], karyawanIds?: string[], upahHarianOverrides?: Record<string, number>, company: CompanyFilter = "") => {
    const formData = new URLSearchParams()
    formData.append('periodeAwal', periodeAwal)
    formData.append('periodeAkhir', periodeAkhir)
    if (divisi && divisi.length > 0) {
      divisi.forEach((d) => formData.append('divisi', d))
    }
    if (karyawanIds && karyawanIds.length > 0) {
      karyawanIds.forEach((id) => formData.append('karyawanId', id))
    }
    if (upahHarianOverrides && Object.keys(upahHarianOverrides).length > 0) {
      formData.append('upahHarianOverrides', JSON.stringify(upahHarianOverrides))
    }
    
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(appendCompanyFilter(`${API_BASE_URL}/gaji/generate-nonstaff-mingguan`, company), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData.toString(),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      return response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  updateStaffSalary: async (karyawanId: number, gajiPerBulan: number) => {
    const formData = new URLSearchParams()
    formData.append('karyawanId', karyawanId.toString())
    formData.append('gajiPerBulan', gajiPerBulan.toString())
    
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/gaji/update-staff-salary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData.toString(),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },
}
