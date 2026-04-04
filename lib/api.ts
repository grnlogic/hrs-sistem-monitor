// Perbaiki konfigurasi API_BASE_URL
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    // Pastikan URL tidak memiliki trailing slash dan tambahkan /api jika belum ada
    let cleanUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = cleanUrl + '/api'
    }
    return cleanUrl
  }
  // Fallback untuk development - sesuaikan dengan port backend yang benar
  return "http://localhost:8084/api"
}

const API_BASE_URL = getApiBaseUrl()
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000")
const API_RETRY_ATTEMPTS = parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || "3")

// Auth token management
let authToken: string | null = null

export const setAuthToken = (token: string) => {
  authToken = token
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token)
  }
}

export const getAuthToken = (): string | null => {
  if (authToken) return authToken
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("token")
  }
  return authToken
}

export const removeAuthToken = () => {
  authToken = null
  if (typeof window !== "undefined") {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }
}

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken()

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  // Add timeout to fetch request
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 401) {
        removeAuthToken()
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.replace("/")
        }
        throw new Error("Unauthorized access")
      }

      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
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

// Auth API
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  logout: async () => {
    return apiRequest("/auth/logout", {
      method: "POST",
    })
  },

  getProfile: async () => {
    return apiRequest("/auth/profile")
  },
}

export type SystemRole = "HRD" | "AKUNTANSI"

export type SystemUser = {
  id: string
  username: string
  namaLengkap: string
  email?: string | null
  role: SystemRole
  isActive: boolean
}

export const userManagementAPI = {
  getAll: async () => {
    return apiRequest("/users") as Promise<SystemUser[]>
  },

  create: async (data: {
    username: string
    namaLengkap: string
    email?: string
    password: string
    role: SystemRole
  }) => {
    return apiRequest("/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (
    id: string,
    data: Partial<{
      username: string
      namaLengkap: string
      email: string
      password: string
      role: SystemRole
      isActive: boolean
    }>
  ) => {
    return apiRequest(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  deactivate: async (id: string) => {
    return apiRequest(`/users/${id}/deactivate`, {
      method: "PATCH",
    })
  },
}

// Employee API
export const employeeAPI = {
  getAll: async () => {
    return apiRequest("/karyawan")
  },

  getById: (id: string) => apiRequest(`/karyawan/${id}/detail`),

  create: async (data: any) => {
    // Pastikan field kontak darurat terkirim dengan benar
    const karyawanData = {
      ...data,
      // Pastikan field yang required tidak null
      namaLengkap: data.namaLengkap || '',
      nik: data.nik || '',
      // Field kontak darurat
      namaKontakDarurat: data.namaKontakDarurat || null,
      hubunganKontakDarurat: data.hubunganKontakDarurat || null,
      noTeleponKontakDarurat: data.noTeleponKontakDarurat || null,
    };
    return apiRequest("/karyawan", {
      method: "POST",
      body: JSON.stringify(karyawanData),
    })
  },

  update: async (id: string, data: any) => {
    // Pastikan field kontak darurat terkirim dengan benar
    const karyawanData = {
      ...data,
      // Pastikan field yang required tidak null
      namaLengkap: data.namaLengkap || '',
      nik: data.nik || '',
      // Field kontak darurat
      namaKontakDarurat: data.namaKontakDarurat || null,
      hubunganKontakDarurat: data.hubunganKontakDarurat || null,
      noTeleponKontakDarurat: data.noTeleponKontakDarurat || null,
    };
    return apiRequest(`/karyawan/${id}`, {
      method: "PUT",
      body: JSON.stringify(karyawanData),
    })
  },

  delete: async (id: string) => {
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}`, {
        method: "DELETE",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      // Backend mungkin mengembalikan plain text
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return await response.json()
      } else {
        return await response.text()
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  // Force delete karyawan beserta semua data terkait
  forceDelete: async (id: string) => {
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}/force`, {
        method: "DELETE",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      // Backend mungkin mengembalikan plain text
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return await response.json()
      } else {
        return await response.text()
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  // Cek data terkait karyawan sebelum delete
  checkRelatedData: async (id: string) => {
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}/related-data`, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      // Backend mengembalikan plain text, bukan JSON
      return response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  // Upload foto karyawan
  uploadFoto: async (id: string, file: File) => {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('foto', file)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      console.log('Uploading foto for karyawan ID:', id)
      console.log('File name:', file.name)
      console.log('File size:', file.size)
      console.log('File type:', file.type)
      
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}/upload-foto`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Upload foto error response:', errorData)
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      console.log('Upload foto success:', result)
      return result
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Upload foto error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  // Get foto URL
  getFotoUrl: (id: string) => `${API_BASE_URL}/karyawan/${id}/foto`,

  // PKB (Perjanjian Kerja Bersama)
  getPKB: (id: string) => apiRequest(`/karyawan/${id}/pkb`),
  savePKB: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/karyawan/${id}/pkb`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadPkbDokumen: async (id: string, file: File) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("dokumen", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}/pkb/upload-dokumen`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  },

  // Daftar file yang sudah di-upload untuk karyawan
  getFiles: (id: string) => apiRequest(`/karyawan/${id}/files`),

  // Get URL untuk serve file (dengan auth)
  getFileServeUrl: (id: string, filePath: string) =>
    `${API_BASE_URL}/karyawan/${id}/files/serve?path=${encodeURIComponent(filePath)}`,
}

// Attendance API
export const attendanceAPI = {
  getAll: async () => {
    try {
      // Use bulk endpoint instead of N+1 per-employee queries
      const allAttendanceData = await apiRequest("/absensi")
      
      // Transform data for consistency
      return (allAttendanceData || []).map((attendance: any) => ({
        id: attendance.id,
        karyawanId: attendance.karyawan?.id || attendance.karyawanId,
        tanggal: attendance.tanggal,
        date: attendance.tanggal,
        status: attendance.status,
        hadir: attendance.hadir,
        setengahHari: attendance.setengahHari,
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

  // Method yang lama tetap ada untuk backup/kompatibilitas
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
    return apiRequest("/absensi/json", {
      method: "POST",
      body: JSON.stringify(mapped),
    })
  },

  createJson: async (data: any) => {
    return apiRequest("/absensi/json", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  submitBulk: async (data: {
    tanggal: string;
    data: Array<{
      karyawanId: number | string;
      status: string;
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

  // Update absensi dengan PUT endpoint
  update: async (id: string, data: { hadir: boolean, status: string, setengahHari: boolean, keterangan?: string }) => {
    return apiRequest(`/absensi/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Tambahkan fungsi delete absensi
  delete: async (id: string) => {
    return apiRequest(`/absensi/${id}`, {
      method: "DELETE",
    });
  },

  deleteToday: async (tanggal: string) => {
    return apiRequest(`/absensi/clear-today?date=${encodeURIComponent(tanggal)}`, {
      method: "DELETE",
    });
  },
}

// Salary API
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

  // Bonus berdasarkan departemen (sama rata)
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

  // Bonus berdasarkan departemen (berbeda per karyawan)
  addBonusByDepartmentDifferent: async (data: { departemen: string, bonuses: { [key: string]: number }, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append('departemen', data.departemen)
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    
    // Convert bonuses object to query parameters
    Object.entries(data.bonuses).forEach(([gajiId, bonus]) => {
      params.append(`bonuses[${gajiId}]`, bonus.toString())
    })
    
    console.log('Sending request with params:', params.toString())
    
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/gaji/bonus/department/different?${params.toString()}`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error:', errorData)
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('API Response:', result)
      return result
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  // Get gaji berdasarkan departemen
  getGajiByDepartment: async (departemen: string) => {
    return apiRequest(`/gaji/department?departemen=${encodeURIComponent(departemen)}`)
  },

  // Get gaji berdasarkan filter tanggal
  getGajiByDateRange: async (tanggalMulai: string, tanggalAkhir: string, karyawanId?: string, departemen?: string) => {
    const params = new URLSearchParams()
    params.append('tanggalMulai', tanggalMulai)
    params.append('tanggalAkhir', tanggalAkhir)
    
    if (karyawanId) {
      params.append('karyawanId', karyawanId)
    }
    
    if (departemen) {
      params.append('departemen', departemen)
    }
    
    return apiRequest(`/gaji/filter?${params.toString()}`)
  },

  updateStatusPembayaran: async (data: { gajiId: string, statusPembayaran: string }) => {
    return apiRequest(`/gaji/status?gajiId=${data.gajiId}&statusPembayaran=${data.statusPembayaran}`, {
      method: "PUT",
    })
  },

  // Update status pembayaran dengan validasi periode (lebih aman)
  updateStatusPembayaranWithPeriod: async (data: { 
    gajiId: string, 
    statusPembayaran: string, 
    periodeAwal?: string, 
    periodeAkhir?: string 
  }) => {
    const params = new URLSearchParams()
    params.append('gajiId', data.gajiId)
    params.append('statusPembayaran', data.statusPembayaran)
    
    if (data.periodeAwal) {
      params.append('periodeAwal', data.periodeAwal)
    }
    
    if (data.periodeAkhir) {
      params.append('periodeAkhir', data.periodeAkhir)
    }
    
    return apiRequest(`/gaji/status-with-period?${params.toString()}`, {
      method: "PUT",
    })
  },

  // Get data gaji detail per periode (tidak diagregasi)
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
    return apiRequest(`/gaji/potongan/pph21?${params.toString()}`, {
      method: "POST",
    })
  },

  addPotonganKeterlambatan: async (data: { gajiId: string, potonganKeterlambatan: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganKeterlambatan", String(data.potonganKeterlambatan))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/keterlambatan?${params.toString()}`, {
      method: "POST",
    })
  },

  addPotonganPinjaman: async (data: { gajiId: string, potonganPinjaman: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganPinjaman", String(data.potonganPinjaman))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/pinjaman?${params.toString()}`, {
      method: "POST",
    })
  },

  addPotonganSumbangan: async (data: { gajiId: string, potonganSumbangan: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganSumbangan", String(data.potonganSumbangan))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/sumbangan?${params.toString()}`, {
      method: "POST",
    })
  },

  addPotonganBpjs: async (data: { gajiId: string, potonganBpjs: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganBpjs", String(data.potonganBpjs))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/bpjs?${params.toString()}`, {
      method: "POST",
    })
  },

  addPotonganUndangan: async (data: { gajiId: string, potonganUndangan: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("potonganUndangan", String(data.potonganUndangan))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/undangan?${params.toString()}`, {
      method: "POST",
    })
  },

  addPotonganCustom: async (data: { gajiId: string, nominal: number, itemName?: string, saveAsMaster?: boolean }) => {
    const params = new URLSearchParams()
    params.append("gajiId", data.gajiId)
    params.append("nominal", String(data.nominal))
    if (data.itemName) params.append("itemName", data.itemName)
    if (data.saveAsMaster) params.append("saveAsMaster", "true")
    return apiRequest(`/gaji/potongan/custom?${params.toString()}`, {
      method: "POST",
    })
  },

  getDivisionDefaultBonuses: async (divisi: string) => {
    return apiRequest(`/gaji/divisi-bonus?divisi=${encodeURIComponent(divisi)}`)
  },

  getBonusPotonganDetail: async (gajiId: string) => {
    return apiRequest(`/gaji/${gajiId}/bonus-potongan`)
  },

  saveBonusPotongan: async (data: {
    gajiId: string
    karyawanId: string
    bonusItems: Array<{ id?: string; judul: string; nominal: number }>
    potonganItems: Array<{ id?: string; judul: string; nominal: number; isDefault?: boolean }>
  }) => {
    return apiRequest(`/gaji/${data.gajiId}/bonus-potongan`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
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

// Tambahkan fungsi untuk rekap gaji semua karyawan
export const getAllSalaries = async () => {
  return apiRequest("/gaji/rekap-all")
}

// Tambahkan fungsi untuk rekap gaji agregasi (jika diperlukan)
export const getAllSalariesAgregated = async () => {
  return apiRequest("/gaji/rekap-all-agregated")
}

// Fungsi untuk mendapatkan data gaji detail per periode
export const getGajiByDateRangeDetailed = async (startDate: string, endDate: string) => {
  const params = new URLSearchParams()
  params.append('startDate', startDate)
  params.append('endDate', endDate)
  
  return apiRequest(`/gaji/by-date-range?${params.toString()}`)
}

// Generate gaji API
export const generateSalaryAPI = {
  // Generate gaji STAFF per bulan
  generateStaffBulanan: async (periode: string) => {
    const formData = new URLSearchParams()
    formData.append('periode', periode)
    
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
        const response = await fetch(`${API_BASE_URL}/gaji/generate-staff-bulanan`, {
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

  // Generate gaji non-STAFF per minggu
  generateNonStaffMingguan: async (periodeAwal: string, periodeAkhir: string) => {
    const formData = new URLSearchParams()
    formData.append('periodeAwal', periodeAwal)
    formData.append('periodeAkhir', periodeAkhir)
    
    const token = getAuthToken()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/gaji/generate-nonstaff-mingguan`, {
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

  // Update gaji per bulan karyawan STAFF
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
      return response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },
}

// Leave API
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

  // Tambahkan fungsi untuk mendapatkan informasi cuti karyawan
  getEmployeeLeaveInfo: async (karyawanId: string) => {
    return apiRequest(`/cuti/karyawan/${karyawanId}/jumlah-tahun-ini`)
  },

  // Tambahkan fungsi untuk mendapatkan cuti berdasarkan karyawan dan tahun
  getByEmployeeAndYear: async (karyawanId: string, tahun: number) => {
    return apiRequest(`/cuti/karyawan/${karyawanId}/tahun/${tahun}`)
  },
}

export const getAllViolations = async () => {
  return apiRequest("/pelanggaran")
}

export const addViolation = async (data: any) => {
  return apiRequest("/pelanggaran", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export const deleteViolation = async (id: string | number) => {
  return apiRequest(`/pelanggaran?id=${id}`, {
    method: "DELETE",
  })
}

// Public Karyawan API
export const publicKaryawanAPI = {
  getAll: async () => {
    return apiRequest("/public/karyawan")
  },

  getById: async (id: string) => {
    return apiRequest(`/public/karyawan/${id}`)
  },
}

// Public Absensi API
export const publicAbsensiAPI = {
  updateStatus: async (
    karyawanId: number,
    hadir: boolean,
    status: string,
    setengahHari: boolean = false,
    keterangan?: string
  ) => {
    const tanggal = new Date().toISOString().split('T')[0]
    const normalizedStatus = (status || (hadir ? "HADIR" : "ALPHA")).toUpperCase() === "ALPA"
      ? "ALPHA"
      : (status || (hadir ? "HADIR" : "ALPHA")).toUpperCase()
    
    try {
      const response = await apiRequest("/absensi/bulk", {
        method: "POST",
        body: JSON.stringify({
          tanggal,
          data: [{
            karyawanId,
            status: normalizedStatus,
          }],
        }),
      })

      if (setengahHari && normalizedStatus === "HADIR") {
        await apiRequest("/public/absensi/setengah-hari", {
          method: "POST",
          body: JSON.stringify({
            karyawanId,
            tanggal,
            ...(keterangan ? { keterangan } : {}),
          }),
        })
      }

      return { success: true, data: response }
    } catch (error) {
      console.error("Error updating attendance:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  updateStatusWithDate: async (
    karyawanId: number,
    tanggal: string,
    hadir: boolean,
    status: string,
    setengahHari: boolean = false,
    keterangan?: string
  ) => {
    const normalizedStatus = (status || (hadir ? "HADIR" : "ALPHA")).toUpperCase() === "ALPA"
      ? "ALPHA"
      : (status || (hadir ? "HADIR" : "ALPHA")).toUpperCase()
    
    try {
      const response = await apiRequest("/absensi/bulk", {
        method: "POST",
        body: JSON.stringify({
          tanggal,
          data: [{
            karyawanId,
            status: normalizedStatus,
          }],
        }),
      })

      if (setengahHari && normalizedStatus === "HADIR") {
        await apiRequest("/public/absensi/setengah-hari", {
          method: "POST",
          body: JSON.stringify({
            karyawanId,
            tanggal,
            ...(keterangan ? { keterangan } : {}),
          }),
        })
      }

      return { success: true, data: response }
    } catch (error) {
      console.error("Error updating attendance:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  getByKaryawanAndTanggal: async (karyawanId: number, tanggal: string) => {
    try {
      const response = await apiRequest(`/absensi/karyawan/${karyawanId}/tanggal/${tanggal}`)
      return { success: true, data: response }
    } catch (error) {
      console.error("Error getting attendance:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  updateSetengahHari: async (absensiId: number, setengahHari: boolean) => {
    try {
      const response = await apiRequest(`/absensi/${absensiId}/setengah-hari?setengahHari=${setengahHari}`, {
        method: "POST",
      })
      return { success: true, data: response }
    } catch (error) {
      console.error("Error updating setengah hari:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },
}

// Public Setengah Hari API
export const publicSetengahHariAPI = {
  getList: async (params?: {
    tanggal?: string;
    startDate?: string;
    endDate?: string;
    departemen?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.tanggal) query.append("tanggal", params.tanggal);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.departemen) query.append("departemen", params.departemen);

    const qs = query.toString();
    return apiRequest(`/public/absensi/setengah-hari${qs ? `?${qs}` : ""}`);
  },

  submitSingle: async (data: {
    karyawanId: number | string;
    tanggal?: string;
    lembur?: boolean;
    keterangan?: string;
  }) => {
    return apiRequest("/public/absensi/setengah-hari", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  submitBulk: async (data: {
    tanggal?: string;
    records: Array<{
      karyawanId: number | string;
      tanggal?: string;
      lembur?: boolean;
      keterangan?: string;
    }>;
  }) => {
    return apiRequest("/public/absensi/setengah-hari", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
