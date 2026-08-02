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
import { useCompany } from "@/components/providers/company-provider";

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

/**
 * Dropdown "Perusahaan Aktif" (company-switcher) — global, bisa dipakai di
 * header maupun inline di toolbar halaman. Membaca/menulis context yang sama.
 */
export function CompanySwitcher({ className }: { className?: string }) {
  const { company, setCompany } = useCompany();

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
          {SHORT_LABEL[company]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Perusahaan Aktif</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
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
