"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
};

type CreatableComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Searchable + creatable combobox: admin dapat memilih nama dari daftar
 * (MasterItemGaji) atau mengetik nama baru secara bebas.
 *
 * Dropdown dirender via Radix Popover (portal ke document.body) sehingga
 * tidak terpotong oleh parent yang scrollable (dialog/modal), otomatis
 * membalik posisi (flip) di dekat batas bawah, dan tetap mengikuti anchor
 * saat container di-scroll. Klik di luar / Escape menutup dropdown.
 */
export function CreatableCombobox({
  options,
  value,
  onChange,
  placeholder = "Pilih atau ketik...",
  disabled,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const trimmed = query.trim();
  const filtered = React.useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, trimmed]);

  const exactMatch = filtered.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase()
  );

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <PopoverPrimitive.Anchor asChild>
        <div className={cn("relative", className)}>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={open ? query : value}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => {
              setOpen(true);
              setQuery(value);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              onChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && open && filtered.length === 1) {
                selectValue(filtered[0].label);
              }
            }}
          />
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-md"
      >
        <div className="max-h-48 overflow-y-auto">
          {filtered.map((o, idx) => (
            <button
              key={`opt-${o.value}-${idx}`}
              type="button"
              onClick={() => selectValue(o.label)}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                o.label === value && "bg-accent text-accent-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Tidak ada opsi. Ketik nama baru.
            </p>
          )}
          {!exactMatch && trimmed && (
            <button
              type="button"
              onClick={() => selectValue(trimmed)}
              className="flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
            >
              Buat &quot;{trimmed}&quot;
            </button>
          )}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
}
