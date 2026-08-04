import { apiRequest, API_BASE_URL, API_TIMEOUT, getAuthToken, type CompanyFilter } from "./core"

// Helper for requests that need to handle plain text responses
const fetchWithTextFallback = async (url: string, options: RequestInit) => {
  const token = getAuthToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(errorData || `HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      return await response.text()
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
    }
    throw error
  }
}

export const employeeAPI = {
  getAll: async (company: CompanyFilter = "") => {
    return apiRequest("/karyawan", {}, company)
  },

  getById: (id: string) => apiRequest(`/karyawan/${id}/detail`),

  create: async (data: any) => {
    const karyawanData = {
      ...data,
      namaLengkap: data.namaLengkap || '',
      nik: data.nik || '',
      namaKontakDarurat: data.namaKontakDarurat || null,
      hubunganKontakDarurat: data.hubunganKontakDarurat || null,
      noTeleponKontakDarurat: data.noTeleponKontakDarurat || null,
    };
    return apiRequest("/karyawan", {
      method: "POST",
      body: JSON.stringify(karyawanData),
    })
  },

  update: async (id: string, data: any) => {
    const karyawanData = {
      ...data,
      namaLengkap: data.namaLengkap || '',
      nik: data.nik || '',
      namaKontakDarurat: data.namaKontakDarurat || null,
      hubunganKontakDarurat: data.hubunganKontakDarurat || null,
      noTeleponKontakDarurat: data.noTeleponKontakDarurat || null,
    };
    return apiRequest(`/karyawan/${id}`, {
      method: "PUT",
      body: JSON.stringify(karyawanData),
    })
  },

  delete: async (id: string) => {
    return fetchWithTextFallback(`${API_BASE_URL}/karyawan/${id}`, {
      method: "DELETE",
    })
  },

  deactivate: async (id: string) => {
    return apiRequest(`/karyawan/${id}/deactivate`, {
      method: "PATCH",
    });
  },

  forceDelete: async (id: string) => {
    return fetchWithTextFallback(`${API_BASE_URL}/karyawan/${id}/force`, {
      method: "DELETE",
    })
  },

  forceDeleteAll: async () => {
    return apiRequest("/karyawan/force-delete-all", {
      method: "DELETE",
    })
  },

  getDivisiList: async (kategori?: string, company: CompanyFilter = "") => {
    const params = new URLSearchParams();
    if (kategori) params.append("kategori", kategori);
    return apiRequest(`/karyawan/divisi-list?${params.toString()}`, {}, company);
  },

  checkRelatedData: async (id: string) => {
    return fetchWithTextFallback(`${API_BASE_URL}/karyawan/${id}/related-data`, {
      method: "GET",
    })
  },

  uploadFoto: async (id: string, file: File) => {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('foto', file)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}/upload-foto`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || `HTTP error! status: ${response.status}`)
      }

      return await response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT}ms`)
      }
      throw error
    }
  },

  getFotoUrl: (id: string) => `${API_BASE_URL}/karyawan/${id}/foto`,

  getPKB: (id: string) => apiRequest(`/karyawan/${id}/pkb`),
  savePKB: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/karyawan/${id}/pkb`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadPkbDokumen: async (id: string, file: File) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("dokumen", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_BASE_URL}/karyawan/${id}/pkb/upload-dokumen`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  },

  getFiles: (id: string) => apiRequest(`/karyawan/${id}/files`),
  getFileServeUrl: (id: string, filePath: string) =>
    `${API_BASE_URL}/karyawan/${id}/files/serve?path=${encodeURIComponent(filePath)}`,
}
