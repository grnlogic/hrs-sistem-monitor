import { apiRequest } from "./core"
import type { SystemRole, SystemUser, LokasiCode } from "./types"

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
    lokasi?: LokasiCode | null
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
      lokasi: LokasiCode | null
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
