import { apiRequest, API_BASE_URL, API_TIMEOUT, getAuthToken } from "./core"
import type { GaleriTipeMedia, GaleriItem, LokasiCode } from "./types"

export const galleryAPI = {
  getAll: async (params?: {
    tipe?: GaleriTipeMedia
    lokasi?: LokasiCode
    label?: string
    q?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.tipe) query.append("tipe", params.tipe)
    if (params?.lokasi) query.append("lokasi", params.lokasi)
    if (params?.label) query.append("label", params.label)
    if (params?.q) query.append("q", params.q)
    const qs = query.toString()
    return apiRequest(`/galeri${qs ? `?${qs}` : ""}`) as Promise<{
      total: number
      items: GaleriItem[]
    }>
  },

  upload: async (payload: {
    judul: string
    tipe: GaleriTipeMedia
    file: File
    label?: string
    lokasi?: LokasiCode
    thumbnail?: File
  }) => {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append("judul", payload.judul)
    formData.append("tipe", payload.tipe)
    formData.append("file", payload.file)
    if (payload.label) formData.append("label", payload.label)
    if (payload.lokasi) formData.append("lokasi", payload.lokasi)
    if (payload.thumbnail) formData.append("thumbnail", payload.thumbnail)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/galeri`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || `HTTP error! status: ${response.status}`)
      }

      return response.json() as Promise<{
        message: string
        item: GaleriItem
      }>
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  remove: async (id: string) => {
    return apiRequest(`/galeri/${id}`, {
      method: "DELETE",
    })
  },
}
