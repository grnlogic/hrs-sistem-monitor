import { apiRequest, type CompanyFilter } from "./core";

export const piutangAPI = {
  getAll: async (aktif?: boolean, company: CompanyFilter = "") => {
    const params = new URLSearchParams();
    if (aktif !== undefined) {
      params.append("aktif", String(aktif));
    }
    const query = params.toString();
    return apiRequest(`/piutang${query ? `?${query}` : ""}`, {}, company);
  },

  create: async (data: { karyawanId: string; saldoAwal: number; jumlahCicilan: number }) => {
    return apiRequest("/piutang", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: { saldoAwal?: number; jumlahCicilan?: number }
  ) => {
    return apiRequest(`/piutang/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/piutang/${id}`, {
      method: "DELETE",
    });
  },

  getCicilanList: async (id: string) => {
    return apiRequest(`/piutang/${id}/cicilan`);
  },

  bayarManual: async (
    id: string,
    data: { nominal: number; pakaiUangPribadi: boolean; tanggal?: string }
  ) => {
    return apiRequest(`/piutang/${id}/bayar`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
