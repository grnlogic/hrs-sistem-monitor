const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Auth API
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  logout: async () => {
    return apiRequest("/api/auth/logout", {
      method: "POST",
    })
  },

  getProfile: async () => {
    return apiRequest("/api/auth/profile")
  },
}

// Employee API
export const employeeAPI = {
  getAll: async () => {
    return apiRequest("/api/karyawan")
  },

  getById: (id: string) => fetch(`/api/karyawan/${id}/detail`).then(res => res.json()),

  create: async (data: any) => {
    return apiRequest("/api/karyawan", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return apiRequest(`/api/karyawan/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiRequest(`/api/karyawan/${id}`, {
      method: "DELETE",
    })
  },
}

// Attendance API
export const attendanceAPI = {
  getAll: async () => {
    return apiRequest("/api/absensi/rekap")
  },

  create: async (data: any) => {
    return apiRequest("/api/absensi", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  // Tambahan: create dengan JSON body (untuk endpoint /api/absensi/json)
  createJson: async (data: any) => {
    return apiRequest("/api/absensi/json", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  getByEmployee: async (employeeId: string) => {
    return apiRequest(`/api/absensi/karyawan/${employeeId}`)
  },
}

// Salary API
export const salaryAPI = {
  getAll: async () => {
    return apiRequest("/api/gaji/rekap")
  },

  process: async (data: any) => {
    return apiRequest("/api/gaji/proses", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  addBonus: async (data: any) => {
    return apiRequest("/api/gaji/bonus", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}

// Leave API
export const leaveAPI = {
  getAll: async () => {
    return apiRequest("/api/cuti")
  },

  create: async (data: any) => {
    return apiRequest("/api/cuti", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  approve: async (id: string) => {
    return apiRequest(`/api/cuti/${id}/approve`, {
      method: "PUT",
    })
  },

  reject: async (id: string, reason: string) => {
    return apiRequest(`/api/cuti/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    })
  },
}

// Violation API
export const violationAPI = {
  getAll: async () => {
    return apiRequest("/api/pelanggaran")
  },

  create: async (data: any) => {
    return apiRequest("/api/pelanggaran", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return apiRequest(`/api/pelanggaran/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
}
