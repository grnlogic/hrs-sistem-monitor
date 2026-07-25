export type GaleriTipeMedia = "FOTO" | "VIDEO" | "DOKUMEN"

export type GaleriItem = {
  id: string
  judul: string
  label?: string | null
  tipe: GaleriTipeMedia
  url: string
  thumbnail?: string | null
  lokasi?: "PJP" | "SP" | "PRIMA" | null
  uploadedBy: string
  createdAt: string
  updatedAt: string
  uploader?: {
    id: string
    username: string
    namaLengkap?: string | null
  } | null
}

export type SystemRole = "HRD" | "AKUNTANSI"
export type LokasiCode = "PJP" | "SP" | "PRIMA"

export type SystemUser = {
  id: string
  username: string
  namaLengkap: string
  email?: string | null
  role: SystemRole
  lokasi?: LokasiCode | null
  isActive: boolean
}
