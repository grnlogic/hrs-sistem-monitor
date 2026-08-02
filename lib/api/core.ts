// API configuration & shared utilities
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    let cleanUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = cleanUrl + '/api'
    }
    return cleanUrl
  }
  return "http://localhost:8084/api"
}

export const API_BASE_URL = getApiBaseUrl()
export const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000")
export const API_RETRY_ATTEMPTS = parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || "3")
export const API_ORIGIN = API_BASE_URL.endsWith("/api") ? API_BASE_URL.slice(0, -4) : API_BASE_URL

export const resolveMediaUrl = (url: string) => {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const path = url.startsWith("/") ? url : `/${url}`
  return `${API_ORIGIN}${path}`
}

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

// ─── Company-switcher (filter perusahaan: "" = Semua, atau PJP/SP/PRIMA) ───
export const COMPANY_FILTER_KEY = "hrd-company-filter"

export type CompanyFilter = "" | "PJP" | "SP" | "PRIMA"

export const getCompanyFilter = (): CompanyFilter => {
  if (typeof window === "undefined") return ""
  const value = window.localStorage.getItem(COMPANY_FILTER_KEY)
  return value === "PJP" || value === "SP" || value === "PRIMA" ? value : ""
}

export const setCompanyFilter = (value: CompanyFilter) => {
  if (typeof window === "undefined") return
  if (value === "PJP" || value === "SP" || value === "PRIMA") {
    window.localStorage.setItem(COMPANY_FILTER_KEY, value)
  } else {
    window.localStorage.removeItem(COMPANY_FILTER_KEY)
  }
}

/** Query string untuk filter lokasi ("" saat "Semua Perusahaan"). */
export const getCompanyFilterQuery = (): string => {
  const lokasi = getCompanyFilter()
  return lokasi ? `lokasi=${lokasi}` : ""
}

/** Sisipkan ?lokasi= ke endpoint bila filter aktif; aman bila endpoint sudah punya query. */
export const appendCompanyFilter = (endpoint: string): string => {
  const query = getCompanyFilterQuery()
  if (!query) return endpoint
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${query}`
}

// API request helper
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken()

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(appendCompanyFilter(`${API_BASE_URL}${endpoint}`), {
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
