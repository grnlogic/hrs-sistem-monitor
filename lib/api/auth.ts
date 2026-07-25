import { apiRequest } from "./core"

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
