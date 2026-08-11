import { apiRequest } from "./core";

export interface MasterDivisiItem {
  id: string;
  nama: string;
  kategori: "staff" | "nonstaff";
  gajiPerHari?: number | null;
  keterangan?: string;
  jumlahKaryawan?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const divisiAPI = {
  getAll: async (kategori?: string): Promise<MasterDivisiItem[]> => {
    const endpoint = kategori ? `/divisi?kategori=${kategori}` : "/divisi";
    return apiRequest(endpoint);
  },

  create: async (data: { nama: string; kategori: "staff" | "nonstaff"; gajiPerHari?: number | null; keterangan?: string }) => {
    return apiRequest("/divisi", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: number | string, data: { nama: string; kategori: "staff" | "nonstaff"; gajiPerHari?: number | null; keterangan?: string }) => {
    return apiRequest(`/divisi/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number | string) => {
    return apiRequest(`/divisi/${id}`, {
      method: "DELETE",
    });
  },
};
