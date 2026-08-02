"use client";

import { useCallback, useState } from "react";

import { salaryAPI } from "@/lib/api/gaji";
import {
  fixedBonusTemplate,
  fixedPotonganTemplate,
  AUTO_BONUS_JUDUL,
} from "./salary-stepper-shared";

export type MasterItemType = "BONUS" | "POTONGAN";

export type MasterItemOption = {
  value: string;
  label: string;
};

/**
 * Nama fallback yang dipakai untuk seed MasterItemGaji saat tabel masih kosong.
 * Sumber utama daftar nama tetap dari backend (salaryAPI.getSalaryItems).
 */
const seedNames: Record<MasterItemType, string[]> = {
  BONUS: [
    ...fixedBonusTemplate.map((item) => item.judul).filter(Boolean),
    AUTO_BONUS_JUDUL,
  ],
  POTONGAN: fixedPotonganTemplate.map((item) => item.judul).filter(Boolean),
};

type MasterItem = { id?: string; nama?: string; tipe?: string };

const toOption = (item: MasterItem): MasterItemOption => ({
  value: String(item.id ?? item.nama ?? ""),
  label: String(item.nama ?? ""),
});

/**
 * Memuat daftar nama bonus/potongan dari MasterItemGaji.
 * - Jika tabel kosong untuk suatu tipe, seed otomatis dari template fallback.
 * - ensureItemSaved mendaftarkan nama baru (idempotent, case-insensitive).
 */
export function useMasterGajiItems() {
  const [bonusOptions, setBonusOptions] = useState<MasterItemOption[]>([]);
  const [potonganOptions, setPotonganOptions] = useState<MasterItemOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async (type: MasterItemType) => {
    try {
      const res = await salaryAPI.getSalaryItems(type);
      return Array.isArray(res) ? (res as MasterItem[]) : [];
    } catch {
      return [];
    }
  }, []);

  const seedIfEmpty = useCallback(
    async (type: MasterItemType): Promise<MasterItem[]> => {
      const list = await fetchList(type);
      if (list.length > 0) return list;
      await Promise.all(
        seedNames[type].map((nama) =>
          salaryAPI.createSalaryItem({ type, nama }).catch(() => null)
        )
      );
      return fetchList(type);
    },
    [fetchList]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bonus, potongan] = await Promise.all([
        seedIfEmpty("BONUS"),
        seedIfEmpty("POTONGAN"),
      ]);
      setBonusOptions(bonus.map(toOption));
      setPotonganOptions(potongan.map(toOption));
    } finally {
      setLoading(false);
    }
  }, [seedIfEmpty]);

  /** Daftarkan nama ke MasterItemGaji bila belum ada; non-fatal bila gagal. */
  const ensureItemSaved = useCallback(
    async (type: MasterItemType, nama: string) => {
      const clean = String(nama || "").trim();
      if (!clean) return;
      const current = type === "BONUS" ? bonusOptions : potonganOptions;
      const exists = current.some(
        (o) => o.label.toLowerCase() === clean.toLowerCase()
      );
      if (exists) return;
      try {
        const created = await salaryAPI.createSalaryItem({ type, nama: clean });
        const option = toOption(created as MasterItem);
        if (type === "BONUS") {
          setBonusOptions((prev) => [...prev, option]);
        } else {
          setPotonganOptions((prev) => [...prev, option]);
        }
      } catch {
        // Nama tetap tersimpan di gaji; hanya tidak terdaftar di master.
      }
    },
    [bonusOptions, potonganOptions]
  );

  return { bonusOptions, potonganOptions, loading, load, ensureItemSaved };
}
