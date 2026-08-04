"use client";

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/form/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu";
import { NAMA_PT_LENGKAP } from "@/lib/constants/perusahaan";
import type { CompanyFilter } from "@/lib/api/core";

const OPTIONS: Array<{ value: CompanyFilter; label: string }> = [
  { value: "", label: "Semua Perusahaan" },
  { value: "PJP", label: NAMA_PT_LENGKAP.PJP },
  { value: "SP", label: NAMA_PT_LENGKAP.SP },
  { value: "PRIMA", label: NAMA_PT_LENGKAP.PRIMA },
];

const SHORT_LABEL: Record<string, string> = {
  "": "Semua Perusahaan",
  PJP: "PJP",
  SP: "SP",
  PRIMA: "PRIMA",
};

type CompanySwitcherProps = {
  value: CompanyFilter;
  onChange: (value: CompanyFilter) => void;
  className?: string;
  /** false = opsi "Semua Perusahaan" disembunyikan; value "" tampil sebagai "Pilih Perusahaan" (wajib pilih). */
  allowAll?: boolean;
};

/**
 * Dropdown "Perusahaan Aktif" (company-switcher) — komponen CONTROLLED.
 * State dimiliki halaman pemakainya (per-halaman, tidak global/persist).
 * allowAll={false} dipakai flow yang mewajibkan perusahaan spesifik (Gaji Non-Staff).
 */
export function CompanySwitcher({
  value: company,
  onChange: setCompany,
  className,
  allowAll = true,
}: CompanySwitcherProps) {
  const options = allowAll ? OPTIONS : OPTIONS.filter((opt) => opt.value !== "");
  const displayLabel = company
    ? SHORT_LABEL[company]
    : allowAll
      ? "Semua Perusahaan"
      : "Pilih Perusahaan";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 whitespace-nowrap", className)}
          title="Filter data berdasarkan perusahaan"
        >
          <Building2 className="h-4 w-4" />
          {displayLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Perusahaan Aktif</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value || "all"}
            onClick={() => setCompany(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
