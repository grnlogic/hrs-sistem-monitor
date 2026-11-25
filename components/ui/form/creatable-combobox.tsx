"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  nominalDefault?: number | null;
  [key: string]: unknown;
};

type CreatableComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: ComboboxOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const PAGE_SIZE = 5;

/**
 * Searchable + creatable combobox dengan portal dan pagination (maks 5 item/halaman):
 * - Admin dapat memilih nama dari daftar (MasterItemGaji) atau mengetik nama baru.
 * - Portal cerdas: mendeteksi jika berada di dalam modal dialog (role="dialog")
 *   dan memasang portal ke dalam container dialog tersebut agar bebas dari pointer-lock/focus-trap.
 * - Menggunakan onMouseDown + onClick dengan preventDefault agar event klik
 *   tidak pernah dibatalkan oleh event blur pada input.
 * - Mendukung navigasi pagination (Previous / Next) jika opsi lebih dari 5 item.
 */
export function CreatableCombobox({
  options,
  value,
  onChange,
  onSelectOption,
  placeholder = "Pilih atau ketik...",
  disabled,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      const dialog = containerRef.current.closest('[role="dialog"]') as HTMLElement | null;
      setPortalContainer(dialog || (typeof document !== "undefined" ? document.body : null));
    }
  }, [open]);

  const trimmed = query.trim();
  const filtered = React.useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, trimmed]);

  // Reset page ke 1 setiap kali query atau opsi berubah
  React.useEffect(() => {
    setPage(1);
  }, [trimmed, options]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const exactMatch = filtered.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase()
  );

  const selectOption = (opt: ComboboxOption) => {
    onSelectOption?.(opt);
    onChange(opt.label);
    setOpen(false);
    setQuery("");
  };

  const selectCustomValue = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <PopoverPrimitive.Anchor asChild>
        <div ref={containerRef} className={cn("relative", className)}>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
            value={open ? query : value}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => {
              setOpen(true);
              setQuery(value);
            }}
            onClick={() => {
              if (!open) {
                setOpen(true);
                setQuery(value);
              }
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              onChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && open && filtered.length === 1) {
                selectOption(filtered[0]);
              }
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!disabled) {
                setOpen((prev) => !prev);
                if (!open) setQuery(value);
              }
            }}
            className="absolute right-0 top-0 h-full w-8 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <ChevronDown className="h-4 w-4 opacity-60 hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal container={portalContainer || undefined}>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (containerRef.current?.contains(target)) {
              e.preventDefault();
            }
          }}
          className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden rounded-md border border-input bg-popover p-1 text-popover-foreground shadow-2xl pointer-events-auto"
        >
          <div className="space-y-0.5">
            {paginatedItems.map((o, idx) => (
              <button
                key={`opt-${o.value}-${idx}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectOption(o);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectOption(o);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer select-none",
                  o.label === value && "bg-accent font-medium text-accent-foreground"
                )}
              >
                <span className="truncate">{o.label}</span>
                {typeof o.nominalDefault === "number" && o.nominalDefault > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-2 shrink-0">
                    Rp {Number(o.nominalDefault).toLocaleString("id-ID")}
                  </span>
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                Tidak ada opsi yang cocok.
              </p>
            )}

            {!exactMatch && trimmed && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectCustomValue(trimmed);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectCustomValue(trimmed);
                }}
                className="flex w-full items-center gap-1 rounded-sm px-2.5 py-2 text-left text-xs font-medium text-primary hover:bg-accent border-t border-border/50 mt-1 cursor-pointer select-none"
              >
                + Buat baru: &quot;{trimmed}&quot;
              </button>
            )}

            {/* Pagination Controls (Maks 5 item per halaman) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/70 px-2 pt-1.5 pb-0.5 text-xs text-muted-foreground mt-1 select-none">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Prev
                </button>

                <span className="text-[11px] font-medium select-none">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
