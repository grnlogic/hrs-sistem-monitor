"use client";

import React from "react";
import { type LokasiCode } from "@/lib/api";
import { NAMA_PT } from "@/lib/constants/perusahaan";
import { Badge } from "@/components/ui/display/badge";

export function CompanyBadge({ lokasi }: { lokasi?: LokasiCode | null }) {
  if (!lokasi) return null;
  const normalized = String(lokasi).toUpperCase();
  const colorClass =
    normalized === "PJP"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : normalized === "SP"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <Badge
      variant="outline"
      className={`${colorClass} text-[10px] px-1.5 py-0 font-bold shrink-0`}
      title={`Perusahaan Tetap: ${NAMA_PT[normalized] || normalized}`}
    >
      {normalized}
    </Badge>
  );
}
