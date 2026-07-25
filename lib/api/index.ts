// Re-export all API modules for backward-compatible imports
// Import paths: import { employeeAPI } from "@/lib/api" still works

// Core utilities
export { API_BASE_URL, API_TIMEOUT, API_RETRY_ATTEMPTS, API_ORIGIN, resolveMediaUrl, setAuthToken, getAuthToken, removeAuthToken, apiRequest } from "./core"

// Types
export type { GaleriTipeMedia, GaleriItem, SystemRole, LokasiCode, SystemUser } from "./types"

// Domain APIs
export { authAPI } from "./auth"
export { userManagementAPI } from "./users"
export { employeeAPI } from "./karyawan"
export { attendanceAPI } from "./absensi"
export { salaryAPI, salarySlipEditorAPI, getAllSalaries, getAllSalariesAgregated, getGajiByDateRangeDetailed, generateSalaryAPI } from "./gaji"
export { leaveAPI } from "./cuti"
export { galleryAPI } from "./galeri"
export { getAllViolations, addViolation, deleteViolation } from "./pelanggaran"
export { publicKaryawanAPI, publicAbsensiAPI, publicSetengahHariAPI } from "./public"
