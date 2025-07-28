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
  // Fallback untuk development
  return "http://localhost:8080/api"
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
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
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

// Employee API
export const employeeAPI = {
  getAll: async () => {
    return apiRequest("/karyawan")
  },

  getById: (id: string) => apiRequest(`/karyawan/${id}/detail`),

  create: async (data: any) => {
    return apiRequest("/karyawan", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return apiRequest(`/karyawan/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest(`/karyawan/${id}`, {
      method: "DELETE",
    })
  },

  deleteEmployee: async (id: string) => {
    return apiRequest(`/karyawan/${id}`, {
      method: "DELETE",
    })
  },
}

// Attendance API
export const attendanceAPI = {
  getAll: async () => {
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

  getByEmployee: async (employeeId: string) => {
    return apiRequest(`/absensi/karyawan/${employeeId}`)
  },

  // Tambahkan fungsi delete absensi
  delete: async (id: string) => {
    return apiRequest(`/absensi/${id}`, {
      method: "DELETE",
    });
  },
}

// Salary API
export const salaryAPI = {
  getAll: async (karyawanId: string) => {
    return apiRequest(`/gaji/rekap?karyawanId=${karyawanId}`)
  },

  addBonus: async (data: { gajiId: string, bonus: number }) => {
    return apiRequest(`/gaji/bonus?gajiId=${data.gajiId}&bonus=${data.bonus}`, {
      method: "POST",
    })
  },

  updateStatusPembayaran: async (data: { gajiId: string, statusPembayaran: string }) => {
    return apiRequest(`/gaji/status?gajiId=${data.gajiId}&statusPembayaran=${data.statusPembayaran}`, {
      method: "PUT",
    })
  },

  // Potongan API
  addPajakPph21: async (data: { gajiId: string, pajakPph21: number }) => {
    return apiRequest(`/gaji/potongan/pph21?gajiId=${data.gajiId}&pajakPph21=${data.pajakPph21}`, {
      method: "POST",
    })
  },

  addPotonganKeterlambatan: async (data: { gajiId: string, potonganKeterlambatan: number }) => {
    return apiRequest(`/gaji/potongan/keterlambatan?gajiId=${data.gajiId}&potonganKeterlambatan=${data.potonganKeterlambatan}`, {
      method: "POST",
    })
  },

  addPotonganPinjaman: async (data: { gajiId: string, potonganPinjaman: number }) => {
    return apiRequest(`/gaji/potongan/pinjaman?gajiId=${data.gajiId}&potonganPinjaman=${data.potonganPinjaman}`, {
      method: "POST",
    })
  },

  addPotonganSumbangan: async (data: { gajiId: string, potonganSumbangan: number }) => {
    return apiRequest(`/gaji/potongan/sumbangan?gajiId=${data.gajiId}&potonganSumbangan=${data.potonganSumbangan}`, {
      method: "POST",
    })
  },

  addPotonganBpjs: async (data: { gajiId: string, potonganBpjs: number }) => {
    return apiRequest(`/gaji/potongan/bpjs?gajiId=${data.gajiId}&potonganBpjs=${data.potonganBpjs}`, {
      method: "POST",
    })
  },

  addPotonganUndangan: async (data: { gajiId: string, potonganUndangan: number }) => {
    return apiRequest(`/gaji/potongan/undangan?gajiId=${data.gajiId}&potonganUndangan=${data.potonganUndangan}`, {
      method: "POST",
    })
  },
}

// Tambahkan fungsi untuk rekap gaji semua karyawan
export const getAllSalaries = async () => {
  return apiRequest("/gaji/rekap-all")
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
