import { apiRequest } from "./core"

export const publicKaryawanAPI = {
  getAll: async () => {
    return apiRequest("/public/karyawan")
  },

  getById: async (id: string) => {
    return apiRequest(`/public/karyawan/${id}`)
  },
}

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
