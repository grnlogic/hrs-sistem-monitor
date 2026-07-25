import { apiRequest } from "./core"

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
