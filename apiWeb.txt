import type { CreateEntriHarianRequest } from "@/types/EntriHarian";
import { create } from "domain";

// Updated data.ts to use API calls instead of localStorage

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Keep interfaces for type safety
export interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  valueType: "NOMINAL" | "KUANTITAS";
  division: {
    id: string;
    name: string;
  };
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Request helper function
// ✅ Enhanced error handling
// Request helper function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    // ✅ ADD: Log request details
    console.log("🌐 API REQUEST:", {
      endpoint: `${API_BASE_URL}${endpoint}`,
      method: options.method || "GET",
      hasToken: !!token,
      body: options.body ? JSON.parse(options.body as string) : null,
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      // ✅ Enhanced error logging
      console.error("❌ [API ERROR]", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorData: data,
        errorMessage: data?.message || data?.error || "Unknown error",
      });

      return {
        success: false,
        error:
          data?.message ||
          data?.error ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: data,
      message: data?.message,
    };
  } catch (error) {
    console.error("💥 [API EXCEPTION]", {
      endpoint,
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string) => {
    return apiRequest<{
      user: any;
      token: string;
    }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout: async () => {
    return apiRequest("/api/v1/auth/logout", {
      method: "POST",
    });
  },

  getCurrentUser: async () => {
    return apiRequest<any>("/api/v1/auth/me");
  },
};

// Accounts (COA) API - sesuaikan dengan backend endpoint
export const accountsAPI = {
  getAll: async () => {
    return apiRequest<any[]>("/api/v1/accounts");
  },

  getByDivision: async (divisionId: string | number) => {
    const numericId =
      typeof divisionId === "string" ? parseInt(divisionId) : divisionId;
    return apiRequest<any[]>(`/api/v1/accounts/by-division/${numericId}`);
  },

  create: async (account: any) => {
    const backendAccount = {
      accountCode: account.accountCode?.trim() || null,
      accountName: account.accountName?.trim() || null,
      valueType: account.valueType || null,
      division: {
        id: account.division?.id ? parseInt(account.division.id) : null,
        name: account.division?.name || null,
      },
    };

    // Validation
    if (!backendAccount.accountCode) {
      throw new Error("Account code is required");
    }
    if (!backendAccount.accountName) {
      throw new Error("Account name is required");
    }
    if (!backendAccount.valueType) {
      throw new Error("Value type is required");
    }
    if (!backendAccount.division.id) {
      throw new Error("Division is required");
    }

    return apiRequest<any>("/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(backendAccount),
    });
  },

  update: async (id: string, updates: any) => {
    const numericId = parseInt(id);

    // ✅ Enhanced validation and logging
    console.log("🔍 [UPDATE ACCOUNT DEBUG] Input:", {
      id,
      numericId,
      updates,
      rawUpdates: JSON.stringify(updates, null, 2),
    });

    // ✅ Build payload with proper validation
    const backendUpdates: any = {};

    // Only include non-empty fields
    if (updates.accountCode?.trim()) {
      backendUpdates.accountCode = updates.accountCode.trim();
    }

    if (updates.accountName?.trim()) {
      backendUpdates.accountName = updates.accountName.trim();
    }

    if (updates.valueType) {
      backendUpdates.valueType = updates.valueType;
    }

    // ✅ Handle division field properly
    if (updates.division) {
      const divisionId =
        typeof updates.division.id === "string"
          ? parseInt(updates.division.id)
          : updates.division.id;

      if (divisionId && divisionId > 0) {
        backendUpdates.division = {
          id: divisionId,
          name: updates.division.name || "",
        };
      }
    } else {
      // ✅ IMPORTANT: Include division if not provided to avoid backend errors
      console.warn(
        "⚠️ No division provided in update. This might cause backend errors."
      );
    }

    console.log("🚀 [UPDATE ACCOUNT] Final payload:", {
      url: `/api/v1/accounts/${numericId}`,
      payload: backendUpdates,
      payloadJson: JSON.stringify(backendUpdates, null, 2),
    });

    return apiRequest<any>(`/api/v1/accounts/${numericId}`, {
      method: "PUT",
      body: JSON.stringify(backendUpdates),
    });
  },

  delete: async (id: string) => {
    const numericId = parseInt(id);
    return apiRequest(`/api/v1/accounts/${numericId}`, {
      method: "DELETE",
    });
  },

  getProducts: async () => {
    return apiRequest<Account[]>("/api/v1/accounts/products");
  },

  getProductsByDivision: async (divisionId: number) => {
    const endpoint = `/api/v1/accounts/products/by-division/${divisionId}?t=${Date.now()}`;
    return apiRequest<Account[]>(endpoint);
  },
};

// Users API (untuk yang belum ada endpoint)
export const usersAPI = {
  getAll: async () => {
    return apiRequest<any[]>("/api/v1/users");
  },

  create: async (user: any) => {
    return apiRequest<any>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  update: async (id: string, updates: any) => {
    return apiRequest<any>(`/api/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/v1/users/${id}`, {
      method: "DELETE",
    });
  },
};

//piutang API (untuk yang belum ada endpoint)
export interface CreatePiutangRequest {
  tanggalTransaksi: string; // format: 'YYYY-MM-DD'
  tipeTransaksi:
    | "PIUTANG_BARU"
    | "PIUTANG_TERTAGIH"
    | "PIUTANG_MACET"
    | "SALDO_AKHIR_PIUTANG";
  kategori: "KARYAWAN" | "TOKO" | "BAHAN_BAKU";
  nominal: number;
  keterangan?: string;
  accountId: number;
}

//Api Piutang
export const piutangAPI = {
  create: async (data: CreatePiutangRequest) => {
    const response = await apiRequest<any>("/api/v1/piutang", {
      method: "POST",
      body: JSON.stringify({
        accountId: Number(data.accountId),
        tanggalTransaksi: data.tanggalTransaksi,
        tipeTransaksi: data.tipeTransaksi,
        kategori: data.kategori,
        nominal: Number(data.nominal),
        keterangan: data.keterangan || "",
      }),
    });
    return response;
  },

  getAll: async () => {
    return apiRequest<any[]>("/api/v1/piutang");
  },

  delete: async (id: number) => {
    return apiRequest(`/api/v1/piutang/${id}`, {
      method: "DELETE",
    });
  },
};

// ✅ NEW: LaporanPenjualanSales API interface and functions
export interface CreateLaporanPenjualanSalesRequest {
  tanggalLaporan: string; // format: 'YYYY-MM-DD'
  salespersonId: number;
  targetPenjualan?: number;
  realisasiPenjualan?: number;
  returPenjualan?: number;
  keteranganKendala?: string;
}

export interface LaporanPenjualanSales {
  id: number;
  tanggalLaporan: string;
  salesperson: {
    id: number;
    username: string;
    division?: {
      id: number;
      name: string;
    };
  };
  targetPenjualan?: number;
  realisasiPenjualan?: number;
  returPenjualan?: number;
  keteranganKendala?: string;
  createdBy: {
    id: number;
    username: string;
  };
  createdAt: string;
}

//Api LaporanPenjualanSales
export const laporanPenjualanSalesAPI = {
  create: async (data: CreateLaporanPenjualanSalesRequest) => {
    // ✅ Validate required fields
    if (!data.tanggalLaporan) {
      throw new Error("VALIDATION_ERROR: Tanggal laporan wajib diisi");
    }
    if (!data.salespersonId || data.salespersonId <= 0) {
      throw new Error("VALIDATION_ERROR: Salesperson ID wajib diisi");
    }

    // ✅ Format data for backend
    const formattedData = {
      tanggalLaporan: data.tanggalLaporan.slice(0, 10), // pastikan hanya YYYY-MM-DD
      salespersonId: Number(data.salespersonId),
      targetPenjualan: data.targetPenjualan
        ? Number(data.targetPenjualan)
        : null,
      realisasiPenjualan: data.realisasiPenjualan
        ? Number(data.realisasiPenjualan)
        : null,
      returPenjualan: data.returPenjualan ? Number(data.returPenjualan) : null,
      keteranganKendala: data.keteranganKendala || null,
    };

    return apiRequest<LaporanPenjualanSales>("/api/v1/laporan-penjualan", {
      method: "POST",
      body: JSON.stringify(formattedData),
    });
  },

  // ✅ PERBAIKAN: Tambahkan user filter
  getAll: async () => {
    return apiRequest<LaporanPenjualanSales[]>(
      "/api/v1/laporan-penjualan?userOwned=true"
    );
  },

  // ✅ PERBAIKAN: Tambahkan user filter untuk get by date
  getByDate: async (date: string) => {
    return apiRequest<LaporanPenjualanSales[]>(
      `/api/v1/laporan-penjualan/by-date/${date}?userOwned=true`
    );
  },

  delete: async (id: number) => {
    return apiRequest(`/api/v1/laporan-penjualan/${id}`, {
      method: "DELETE",
    });
  },
};
// ✅ NEW: Utang API interface and functions
export interface CreateUtangRequest {
  tanggalTransaksi: string; // format: 'YYYY-MM-DD'
  tipeTransaksi: "UTANG_BARU" | "UTANG_DIBAYAR" | "SALDO_AKHIR_UTANG";
  kategori: "BAHAN_BAKU" | "BANK_HM" | "BANK_HENRY";
  nominal: number;
  keterangan?: string;
  accountId: number;
}

//Api Utang
export const utangAPI = {
  create: async (data: CreateUtangRequest) => {
    const response = await apiRequest<any>("/api/v1/utang", {
      method: "POST",
      body: JSON.stringify({
        accountId: Number(data.accountId),
        tanggalTransaksi: data.tanggalTransaksi,
        tipeTransaksi: data.tipeTransaksi,
        kategori: data.kategori,
        nominal: Number(data.nominal),
        keterangan: data.keterangan || "",
      }),
    });
    return response;
  },

  getAll: async () => {
    return apiRequest<any[]>("/api/v1/utang");
  },

  delete: async (id: number) => {
    return apiRequest(`/api/v1/utang/${id}`, {
      method: "DELETE",
    });
  },
};

// Divisions API (untuk yang belum ada endpoint)
export const divisionsAPI = {
  getAll: async () => {
    return apiRequest<any[]>("/api/v1/divisions");
  },

  create: async (division: any) => {
    return apiRequest<any>("/api/v1/divisions", {
      method: "POST",
      body: JSON.stringify(division),
    });
  },

  update: async (id: string, updates: any) => {
    return apiRequest<any>(`/api/v1/divisions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/v1/divisions/${id}`, {
      method: "DELETE",
    });
  },
};

// Entri Harian API (untuk yang belum ada endpoint)
export const entriesAPI = {
  getAll: async () => {
    return await apiRequest<any[]>("/api/v1/entri-harian");
  },

  getByDate: async (date: string) => {
    return await apiRequest<any[]>(`/api/v1/entri-harian/date/${date}`);
  },

  getByDivision: async (divisionId: string) => {
    return await apiRequest<any[]>(
      `/api/v1/entri-harian/division/${divisionId}`
    );
  },

  getById: async (id: string) => {
    return await apiRequest<any>(`/api/v1/entri-harian/${id}`);
  },

  create: async (entry: CreateEntriHarianRequest) => {
    return await apiRequest<any>("/api/v1/entri-harian", {
      method: "POST",
      body: JSON.stringify(entry),
    });
  },

  createBatch: async (entries: CreateEntriHarianRequest[]) => {
    return await apiRequest<any[]>("/api/v1/entri-harian/batch", {
      method: "POST",
      body: JSON.stringify(entries),
    });
  },

  update: async (id: string, updates: CreateEntriHarianRequest) => {
    return await apiRequest<any>(`/api/v1/entri-harian/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/api/v1/entri-harian/${id}`, {
      method: "DELETE",
    });
  },
};

export interface Salesperson {
  id: number;
  nama: string;
  status: string;
  division?: { id: number; name: string };
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

// GET all salespeople
export async function getSalespeople(): Promise<Salesperson[]> {
  const token = getToken();
  if (!token) throw new Error("User belum login atau token tidak ditemukan");

  console.log("🔍 GET SALESPEOPLE - Requesting data...");

  // ✅ PERBAIKAN: Tambahkan user filter untuk isolasi
  const res = await fetch(`${BASE_URL}/api/v1/salespeople?userOwned=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("📥 GET SALESPEOPLE - Response:", {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ GET SALESPEOPLE - Error:", errorText);
    throw new Error("Gagal mengambil data salesperson");
  }

  const data = await res.json();
  console.log("✅ GET SALESPEOPLE - Success:", data);
  return data;
}

// CREATE salesperson
export async function createSalesperson(
  nama: string,
  perusahaanId?: number,
  divisionId?: number
): Promise<Salesperson> {
  const token = getToken();
  if (!token) throw new Error("User belum login atau token tidak ditemukan");

  // ✅ FIXED: Hapus perusahaanId karena entity Salesperson tidak memiliki field perusahaan
  const requestBody = {
    nama,
    divisionId: divisionId || 2, // Default ke DIVISI PEMASARAN & PENJUALAN (ID: 2)
    status: "AKTIF",
  };

  // ✅ ADD: Log payload yang dikirim ke backend
  console.log("🚀 CREATE SALESPERSON - Payload yang dikirim:", {
    endpoint: `${BASE_URL}/api/v1/salespeople`,
    method: "POST",
    requestBody,
    token: token.substring(0, 20) + "...", // Log sebagian token untuk keamanan
  });

  const res = await fetch(`${BASE_URL}/api/v1/salespeople`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  // ✅ ADD: Log response dari backend
  console.log("📥 CREATE SALESPERSON - Response dari backend:", {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ CREATE SALESPERSON - Error response:", errorText);
    throw new Error("Gagal menambah salesperson: " + errorText);
  }

  const responseData = await res.json();
  console.log("✅ CREATE SALESPERSON - Success response:", responseData);
  return responseData;
}

// DELETE salesperson
export async function deleteSalesperson(id: number): Promise<boolean> {
  const token = getToken();
  if (!token) throw new Error("No authentication token found");

  const res = await fetch(`${BASE_URL}/api/v1/salespeople/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error("❌ DELETE SALESPERSON ERROR:", errorData);
    throw new Error(
      `Failed to delete salesperson: ${res.status} ${res.statusText}`
    );
  }

  return true;
}

// ✅ NEW: LaporanProduksi API interface and functions
export interface CreateLaporanProduksiRequest {
  tanggalLaporan: string; // format: 'YYYY-MM-DD'
  accountId: number;
  hasilProduksi?: number;
  barangGagal?: number;
  stockBarangJadi?: number;
  hpBarangJadi?: number;
  keteranganKendala?: string;
}

export interface LaporanProduksiHarian {
  id: number;
  tanggalLaporan: string;
  account: {
    id: number;
    division: {
      id: number;
      name: string;
    };
    accountCode: string;
    accountName: string;
    valueType: string;
  };
  hasilProduksi?: number;
  barangGagal?: number;
  stockBarangJadi?: number;
  hpBarangJadi?: number;
  keteranganKendala?: string;
  createdBy: {
    id: number;
    username: string;
    role: string;
    division: {
      id: number;
      name: string;
    };
  };
  createdAt: string;
}

//Api LaporanProduksi
export const laporanProduksiAPI = {
  create: async (data: CreateLaporanProduksiRequest) => {
    // ✅ Validate required fields
    if (!data.tanggalLaporan) {
      throw new Error("VALIDATION_ERROR: Tanggal laporan wajib diisi");
    }
    if (!data.accountId || data.accountId <= 0) {
      throw new Error("VALIDATION_ERROR: Account ID wajib diisi");
    }

    // ✅ Format data for backend
    const formattedData = {
      tanggalLaporan: data.tanggalLaporan.slice(0, 10), // pastikan hanya YYYY-MM-DD
      accountId: Number(data.accountId),
      hasilProduksi: data.hasilProduksi ? Number(data.hasilProduksi) : null,
      barangGagal: data.barangGagal ? Number(data.barangGagal) : null,
      stockBarangJadi: data.stockBarangJadi
        ? Number(data.stockBarangJadi)
        : null,
      hpBarangJadi: data.hpBarangJadi ? Number(data.hpBarangJadi) : null,
      keteranganKendala: data.keteranganKendala || null,
    };

    return apiRequest<LaporanProduksiHarian>("/api/v1/laporan-produksi", {
      method: "POST",
      body: JSON.stringify(formattedData),
    });
  },

  getAll: async () => {
    return apiRequest<LaporanProduksiHarian[]>("/api/v1/laporan-produksi");
  },

  delete: async (id: number) => {
    return apiRequest(`/api/v1/laporan-produksi/${id}`, {
      method: "DELETE",
    });
  },
};

// ✅ NEW: LaporanGudang API interface and functions
export interface CreateLaporanGudangRequest {
  tanggalLaporan: string; // format: 'YYYY-MM-DD'
  accountId: number;
  stokAwal?: number; // Field name that form sends (was 'barangMasuk')
  pemakaian?: number;
  stokAkhir?: number;
  kondisiGudang?: string; // Field name that form sends (was 'keterangan')
}

export interface LaporanGudangHarian {
  id: number;
  tanggalLaporan: string;
  account: {
    id: number;
    division: {
      id: number;
      name: string;
    };
    accountCode: string;
    accountName: string;
    valueType: string;
  };
  barangMasuk?: number;
  pemakaian?: number;
  stokAkhir?: number;
  keterangan?: string;
  createdBy: {
    id: number;
    username: string;
    role: string;
    division: {
      id: number;
      name: string;
    };
  };
  createdAt: string;
}

//Api LaporanGudang
export const laporanGudangAPI = {
  create: async (data: CreateLaporanGudangRequest) => {
    // ✅ Validate required fields
    if (!data.tanggalLaporan) {
      throw new Error("VALIDATION_ERROR: Tanggal laporan wajib diisi");
    }
    if (!data.accountId || data.accountId <= 0) {
      throw new Error("VALIDATION_ERROR: Account ID wajib diisi");
    }

    // ✅ Format data for backend
    const formattedData = {
      tanggalLaporan: data.tanggalLaporan.slice(0, 10), // pastikan hanya YYYY-MM-DD
      accountId: Number(data.accountId),
      // Map field names correctly from form to API
      barangMasuk: data.stokAwal ? Number(data.stokAwal) : null, // Form sends 'stokAwal'
      pemakaian: data.pemakaian ? Number(data.pemakaian) : null,
      stokAkhir: data.stokAkhir ? Number(data.stokAkhir) : null,
      keterangan: data.kondisiGudang || null, // Form sends 'kondisiGudang'
    };

    return apiRequest<LaporanGudangHarian>("/api/v1/laporan-gudang", {
      method: "POST",
      body: JSON.stringify(formattedData),
    });
  },

  getAll: async () => {
    return apiRequest<LaporanGudangHarian[]>("/api/v1/laporan-gudang");
  },

  delete: async (id: number) => {
    return apiRequest(`/api/v1/laporan-gudang/${id}`, {
      method: "DELETE",
    });
  },
};

// ✅ NEW: Notification interface
export interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
  user?: {
    id: number;
    username: string;
  };
}

// ✅ NEW: Notification API
export const notificationAPI = {
  getAll: async () => {
    const response = await apiRequest<Notification[]>("/api/v1/notifications");
    if (response.success && response.data) {
      const mappedNotifications = response.data.map((notif: any) => ({
        id: notif.id,
        message: notif.message,
        isRead: notif.isRead || notif.read || false, // Handle both field names
        linkUrl: notif.linkUrl,
        createdAt: notif.createdAt || notif.created_at, // Handle both field names
        user: notif.user,
      }));

      return { success: true, data: mappedNotifications };
    }
    return response;
  },

  markAsRead: async (id: number) => {
    return apiRequest(`/api/v1/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  send: async (message: string, linkUrl?: string) => {
    // ✅ Validate required fields
    if (!message || message.trim() === "") {
      throw new Error("VALIDATION_ERROR: Message is required");
    }

    const formattedData = {
      message: message.trim(),
      linkUrl: linkUrl?.trim() || null,
    };

    return apiRequest<any>("/api/v1/notifications/send", {
      method: "POST",
      body: JSON.stringify(formattedData),
    });
  },
};

// ================== SALESPERSON BY DIVISION ==================
export const salespersonAPI = {
  getByDivision: async (divisionId: number) => {
    console.log(
      "🔍 SALESPERSON API - getByDivision called with divisionId:",
      divisionId
    );

    const response = await apiRequest<any[]>(
      `/api/v1/salespeople/by-division/${divisionId}?userOwned=true&t=${Date.now()}`
    );

    console.log("📥 SALESPERSON API - getByDivision response:", {
      success: response.success,
      dataLength: response.data?.length || 0,
      data: response.data,
    });

    return response;
  },
};

// ================== LAPORAN PENJUALAN PRODUK ==================
export interface LaporanPenjualanProduk {
  id: number;
  tanggalLaporan: string;
  namaSalesperson: string;
  salespersonId: number;
  namaAccount: string;
  productAccountId: number;
  targetKuantitas: number;
  realisasiKuantitas: number;
  keteranganKendala?: string;
  createdByUsername: string;
  createdAt: string;
}

// Backend interface untuk reference - FIXED: Backend menggunakan camelCase
interface BackendLaporanPenjualanProduk {
  id: number;
  tanggalLaporan: string;
  namaSalesperson: string;
  salespersonId: number;
  namaAccount: string;
  productAccountId: number;
  targetKuantitas: number;
  realisasiKuantitas: number;
  keteranganKendala?: string;
  createdByUsername: string;
  createdAt: string;
}

export const laporanPenjualanProdukAPI = {
  create: async (data: any) =>
    apiRequest<LaporanPenjualanProduk>("/api/v1/laporan-penjualan-produk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // ✅ PERBAIKAN: Tambahkan user filter
  getAll: async () =>
    apiRequest<LaporanPenjualanProduk[]>(
      "/api/v1/laporan-penjualan-produk?userOwned=true"
    ),
  filter: async (params: any) =>
    apiRequest<LaporanPenjualanProduk[]>(
      `/api/v1/laporan-penjualan-produk/filter?${new URLSearchParams(
        params
      )}&userOwned=true`
    ),
  delete: async (id: number) =>
    apiRequest(`/api/v1/laporan-penjualan-produk/${id}`, {
      method: "DELETE",
    }),
};

// ✅ NEW: Konsolidasi Keuangan API
export interface KonsolidasiKeuanganData {
  tanggal: string;
  perusahaan: string;
  penerimaan: number;
  pengeluaran: number;
  saldoAkhir: number;
  totalTransaksi: number;
}

export const konsolidasiKeuanganAPI = {
  getByDate: async (date: string) => {
    return apiRequest<KonsolidasiKeuanganData[]>(
      `/api/v1/konsolidasi-keuangan/by-date/${date}`
    );
  },

  getByDateRange: async (startDate: string, endDate: string) => {
    return apiRequest<KonsolidasiKeuanganData[]>(
      `/api/v1/konsolidasi-keuangan/by-date-range?startDate=${startDate}&endDate=${endDate}`
    );
  },

  getByPerusahaan: async (perusahaan: string, date: string) => {
    return apiRequest<KonsolidasiKeuanganData[]>(
      `/api/v1/konsolidasi-keuangan/by-perusahaan/${perusahaan}?date=${date}`
    );
  },
};

// Health API
export const healthAPI = {
  getStatus: async () => {
    const url = `${BASE_URL}/api/health`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch health status");
    return res.json();
  },
};

// ===== PUBLIC ABSENSI API =====
export const publicAbsensiAPI = {
  updateStatus: async (id: number, hadir: boolean, status: string, setengahHari: boolean = false) => {
    try {
      // Hardcode gunakan PUBLIC_API_URL
      const response = await fetch(`https://sistem-hrd-padud.padudjayaputera.com/api/public-absensi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hadir, status, setengahHari }),
      });
      if (!response.ok) {
        let error = "Gagal menyimpan absensi.";
        try {
          const data = await response.json();
          error = data?.error || error;
        } catch {}
        return { success: false, error };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Terjadi kesalahan jaringan." };
    }
  },
};

// ===== PUBLIC KARYAWAN API =====
const PUBLIC_API_URL = "https://sistem-hrd-padud.padudjayaputera.com";

export const publicKaryawanAPI = {
  getAll: async () => {
    const url = `${PUBLIC_API_URL}/api/public-karyawan`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal mengambil data karyawan publik");
    return res.json();
  },
};
