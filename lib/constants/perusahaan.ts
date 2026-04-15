export const NAMA_PT: Record<string, string> = {
  PJP: "PT. Padud Jaya Putera",
  SP: "PR. Sunarya Putra Jaya",
  PRIMA: "PT. Primajaya Tobacco",
};

export const LOKASI_PT: Record<string, string> = {
  PJP: "Jelat",
  SP: "CPD",
  PRIMA: "Ciamis",
};

export const NAMA_PT_LENGKAP: Record<string, string> = {
  PJP: "PT. Padud Jaya Putera - Jelat",
  SP: "PR. Sunarya Putra Jaya - CPD",
  PRIMA: "PT. Primajaya Tobacco - Ciamis",
};

export type LokasiPtCode = "PJP" | "SP" | "PRIMA";

export function getNamaPtByKode(kode?: string | null): string {
  const normalized = String(kode || "").toUpperCase();
  return NAMA_PT[normalized] || NAMA_PT.PJP;
}

export function getNamaPtLengkapByKode(kode?: string | null): string {
  const normalized = String(kode || "").toUpperCase();
  return NAMA_PT_LENGKAP[normalized] || NAMA_PT_LENGKAP.PJP;
}
