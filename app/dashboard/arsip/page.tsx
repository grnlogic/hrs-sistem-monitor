"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Archive,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { galleryAPI, resolveMediaUrl, type GaleriItem, type GaleriTipeMedia } from "@/lib/api";

type Lokasi = "PJP" | "SP" | "PRIMA";
type ArsipKind = "PDF" | "DOC" | "XLS" | "LAINNYA";
type ArsipFilter = "SEMUA" | "PDF" | "DOC" | "XLS";

type ArchiveGroup = {
  key: string;
  title: string;
  items: GaleriItem[];
  latestCreatedAt: string;
};

const lokasiOptions: Lokasi[] = ["PJP", "SP", "PRIMA"];
const NEW_TITLE_OPTION = "__NEW_TITLE__";

const DOC_EXT = new Set(["doc", "docx", "odt", "rtf"]);
const XLS_EXT = new Set(["xls", "xlsx", "csv", "ods"]);

function getFileExt(url: string) {
  const clean = url.split("?")[0] || "";
  const parts = clean.split(".");
  return (parts[parts.length - 1] || "").toLowerCase();
}

function getPreviewFetchUrl(fileUrl: string) {
  return `/api/arsip-preview?url=${encodeURIComponent(fileUrl)}`;
}

function inferArsipKind(item: GaleriItem): ArsipKind {
  const ext = getFileExt(item.url);
  if (ext === "pdf") return "PDF";
  if (DOC_EXT.has(ext)) return "DOC";
  if (XLS_EXT.has(ext)) return "XLS";
  return "LAINNYA";
}

function kindLabel(kind: ArsipKind) {
  if (kind === "PDF") return "PDF";
  if (kind === "DOC") return "Word";
  if (kind === "XLS") return "Excel";
  return "Lainnya";
}

function kindIcon(kind: ArsipKind) {
  if (kind === "PDF") return <FileText className="h-4 w-4 text-red-600" />;
  if (kind === "DOC") return <FileText className="h-4 w-4 text-blue-600" />;
  if (kind === "XLS") return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  return <Archive className="h-4 w-4 text-muted-foreground" />;
}

function ArchivePreviewModal({
  group,
  onClose,
  onDelete,
  canDelete,
}: {
  group: ArchiveGroup | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [docPreviewHtml, setDocPreviewHtml] = useState("");
  const [sheetPreviewHtml, setSheetPreviewHtml] = useState("");

  useEffect(() => {
    if (group) {
      setActiveId(group.items[0]?.id || "");
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      setActiveId("");
    }
  }, [group]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (group) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [group]);

  const activeItem = group?.items.find((item) => item.id === activeId) || group?.items[0];
  const currentKind = activeItem ? inferArsipKind(activeItem) : "LAINNYA";

  useEffect(() => {
    let cancelled = false;

    const buildPreview = async () => {
      if (!activeItem) {
        setDocPreviewHtml("");
        setSheetPreviewHtml("");
        setPreviewError("");
        return;
      }

      const kind = inferArsipKind(activeItem);
      if (kind === "PDF" || kind === "LAINNYA") {
        setDocPreviewHtml("");
        setSheetPreviewHtml("");
        setPreviewError("");
        return;
      }

      setPreviewLoading(true);
      setPreviewError("");
      setDocPreviewHtml("");
      setSheetPreviewHtml("");

      try {
        const mediaUrl = resolveMediaUrl(activeItem.url);
        const response = await fetch(getPreviewFetchUrl(mediaUrl));
        if (!response.ok) {
          throw new Error("Gagal mengambil file untuk preview");
        }

        const arrayBuffer = await response.arrayBuffer();

        if (kind === "DOC") {
          const ext = getFileExt(activeItem.url);
          if (ext !== "docx") {
            throw new Error("Preview Word hanya mendukung .docx. Silakan buka file asli.");
          }

          const mammothModule = await import("mammoth");
          const mammoth = mammothModule.default ?? mammothModule;
          const result = await mammoth.convertToHtml({ arrayBuffer });

          if (!cancelled) {
            setDocPreviewHtml(result.value || "");
          }
        }

        if (kind === "XLS") {
          const xlsxModule = await import("xlsx");
          const workbook = xlsxModule.read(arrayBuffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            throw new Error("Sheet Excel tidak ditemukan");
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const html = xlsxModule.utils.sheet_to_html(worksheet);

          if (!cancelled) {
            setSheetPreviewHtml(html || "");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(
            error instanceof Error
              ? error.message
              : "Preview dokumen gagal dimuat. Silakan buka file asli.",
          );
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    void buildPreview();

    return () => {
      cancelled = true;
    };
  }, [activeItem]);

  if (!group) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Hapus file arsip ini?")) return;
    onDelete(id);
    if (id === activeId) {
      const remaining = group.items.filter((item) => item.id !== id);
      setActiveId(remaining[0]?.id || "");
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{
        background: visible ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
        transition: "background 0.25s ease",
      }}
    >
      <div
        className="relative flex w-full max-w-6xl flex-col rounded-t-2xl bg-background sm:h-[88vh] sm:rounded-2xl"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold leading-none">{group.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {group.items.length} file dalam kategori ini
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — flex-1 + min-h-0 agar tidak meluber keluar modal */}
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden sm:grid-cols-[280px,1fr]">
          {/* Sidebar daftar file */}
          <div className="flex min-h-0 flex-col border-b sm:border-b-0 sm:border-r">
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {group.items.map((item) => {
                  const kind = inferArsipKind(item);
                  const isActive = item.id === activeItem?.id;

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveId(item.id)}
                      onKeyDown={(e) => e.key === "Enter" && setActiveId(item.id)}
                      className={`rounded-lg border p-2.5 transition ${
                        isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {kindIcon(kind)}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.judul}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {kindLabel(kind)}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.lokasi ? (
                          <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {item.lokasi}
                          </span>
                        ) : null}
                        {item.label ? (
                          <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {item.label}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <a
                          href={resolveMediaUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Buka file
                        </a>
                        {canDelete ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="rounded-md px-2 py-1 text-xs text-destructive transition hover:bg-destructive/10"
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Area preview — min-h-0 + overflow-hidden agar child bisa scroll sendiri */}
          <div className="flex min-h-0 flex-col p-3">
            {activeItem ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
                {/* Toolbar preview */}
                <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {kindIcon(currentKind)}
                    <p className="truncate text-sm font-medium">{activeItem.judul}</p>
                  </div>
                  <a
                    href={resolveMediaUrl(activeItem.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-3 shrink-0 text-xs text-primary hover:underline"
                  >
                    Buka file asli
                  </a>
                </div>

                {/* Konten preview — ini yang harus scroll */}
                <div className="min-h-0 flex-1 bg-muted/20">
                  {currentKind === "PDF" ? (
                    <iframe
                      src={resolveMediaUrl(activeItem.url)}
                      className="h-full w-full"
                      title={activeItem.judul}
                    />
                  ) : previewLoading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyiapkan preview dokumen...
                    </div>
                  ) : previewError ? (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      {previewError}
                    </div>
                  ) : currentKind === "DOC" && docPreviewHtml ? (
                    /*
                     * FIX SCROLL DOCX:
                     * - overflow-auto  → scroll both axis
                     * - h-full         → isi penuh tinggi container
                     * - touch-action   → izinkan scroll di mobile
                     * - prose max-w-none → konten tidak terpotong
                     */
                    <div
                      className="h-full overflow-auto bg-background p-5"
                      style={{ touchAction: "pan-x pan-y" }}
                    >
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: docPreviewHtml }}
                      />
                    </div>
                  ) : currentKind === "XLS" && sheetPreviewHtml ? (
                    /*
                     * FIX SCROLL EXCEL:
                     * - overflow-auto  → scroll horizontal + vertikal
                     * - h-full         → isi penuh tinggi container
                     * - min-w-max pada inner div dihapus dari wrapper,
                     *   cukup di table agar wrapper tetap bisa flex
                     * - whitespace-nowrap pada td/th agar cell tidak wrap
                     */
                    <div
                      className="h-full overflow-auto bg-background p-5"
                      style={{ touchAction: "pan-x pan-y" }}
                    >
                      <div
                        className="w-max [&_table]:border-collapse [&_table]:text-sm [&_td]:whitespace-nowrap [&_td]:border [&_td]:px-3 [&_td]:py-1.5 [&_th]:whitespace-nowrap [&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1.5"
                        dangerouslySetInnerHTML={{ __html: sheetPreviewHtml }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      Preview belum didukung untuk tipe ini. Silakan buka file asli.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Tidak ada file untuk dipreview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchiveGroupCard({
  group,
  onClick,
}: {
  group: ArchiveGroup;
  onClick: () => void;
}) {
  const latest = group.items[0];
  const latestKind = latest ? inferArsipKind(latest) : "LAINNYA";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group cursor-pointer"
    >
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="rounded-lg border bg-muted/50 p-2">{kindIcon(latestKind)}</div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{group.title}</h3>
                <p className="text-xs text-muted-foreground">{group.items.length} file</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {kindLabel(latestKind)}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {latest?.lokasi ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                {latest.lokasi}
              </Badge>
            ) : null}
            {latest?.label ? (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {latest.label}
              </Badge>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Update terakhir {new Date(group.latestCreatedAt).toLocaleDateString("id-ID")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GroupedArchiveGrid({
  groups,
  loading,
  onDelete,
  canDelete,
}: {
  groups: ArchiveGroup[];
  loading: boolean;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const [activeGroup, setActiveGroup] = useState<ArchiveGroup | null>(null);

  const handleClose = useCallback(() => setActiveGroup(null), []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="overflow-hidden rounded-xl border bg-card p-4">
            <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Belum ada arsip dokumen pada tab ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <ArchiveGroupCard key={group.key} group={group} onClick={() => setActiveGroup(group)} />
        ))}
      </div>

      <ArchivePreviewModal
        group={activeGroup}
        onClose={handleClose}
        onDelete={(id) => {
          onDelete(id);
          setActiveGroup((prev) =>
            prev ? { ...prev, items: prev.items.filter((item) => item.id !== id) } : null,
          );
        }}
        canDelete={canDelete}
      />
    </>
  );
}

export default function ArsipPage() {
  const { data: session } = useSession();
  const isHRD = (session?.user?.role || "HRD") === "HRD";

  const [activeTab, setActiveTab] = useState<ArsipFilter>("SEMUA");
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [judul, setJudul] = useState("");
  const [judulSource, setJudulSource] = useState<string>(NEW_TITLE_OPTION);
  const [label, setLabel] = useState("");
  const [lokasi, setLokasi] = useState<string>(session?.user?.lokasi || "PJP");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!lokasi && session?.user?.lokasi) {
      setLokasi(session.user.lokasi);
    }
  }, [lokasi, session?.user?.lokasi]);

  const loadData = async (search = query) => {
    try {
      setLoading(true);
      setError("");
      const response = await galleryAPI.getAll({
        tipe: "DOKUMEN" as GaleriTipeMedia,
        q: search || undefined,
      });
      setItems(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data arsip");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    if (activeTab === "SEMUA") return items;
    return items.filter((item) => inferArsipKind(item) === activeTab);
  }, [activeTab, items]);

  const existingLabels = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const raw = (item.label || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, raw);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const normalizedLabel = useMemo(() => {
    const raw = label.trim();
    if (!raw) return "";
    const found = existingLabels.find((item) => item.toLowerCase() === raw.toLowerCase());
    return found || raw;
  }, [existingLabels, label]);

  const groupedItems = useMemo<ArchiveGroup[]>(() => {
    const map = new Map<string, ArchiveGroup>();

    filteredItems.forEach((item) => {
      const safeTitle = item.judul.trim() || "Tanpa Judul";
      const key = safeTitle.toLowerCase();
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          title: safeTitle,
          items: [item],
          latestCreatedAt: item.createdAt,
        });
        return;
      }

      existing.items.push(item);
      if (new Date(item.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) {
        existing.latestCreatedAt = item.createdAt;
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
      );
  }, [filteredItems]);

  const existingTitles = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const safeTitle = item.judul.trim();
      if (!safeTitle) return;
      const key = safeTitle.toLowerCase();
      if (!map.has(key)) map.set(key, safeTitle);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const selectedUploadTitle = useMemo(() => {
    if (judulSource !== NEW_TITLE_OPTION) return judulSource;
    return judul.trim();
  }, [judul, judulSource]);

  useEffect(() => {
    if (!existingTitles.length) {
      setJudulSource(NEW_TITLE_OPTION);
      return;
    }
    if (judulSource !== NEW_TITLE_OPTION && !existingTitles.includes(judulSource)) {
      setJudulSource(NEW_TITLE_OPTION);
    }
  }, [existingTitles, judulSource]);

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();

    if (files.length === 0) {
      setError("Minimal pilih 1 file arsip");
      return;
    }

    if (!selectedUploadTitle) {
      setError("Judul kategori wajib diisi atau pilih judul yang sudah ada");
      return;
    }

    try {
      setUploading(true);
      setError("");

      for (const currentFile of files) {
        await galleryAPI.upload({
          judul: selectedUploadTitle,
          label: normalizedLabel || undefined,
          tipe: "DOKUMEN" as GaleriTipeMedia,
          lokasi: (lokasi || undefined) as Lokasi | undefined,
          file: currentFile,
        });
      }

      setJudul("");
      setJudulSource(NEW_TITLE_OPTION);
      setLabel("");
      setFiles([]);

      const fileInput = document.getElementById("upload-arsip") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload arsip gagal");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await galleryAPI.remove(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus item");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Arsip Dokumen</h1>
        <p className="text-sm text-muted-foreground">
          Penyimpanan dokumen perusahaan seperti PDF, Word, dan Excel dengan label serta preview.
        </p>
      </div>

      {isHRD ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Arsip Baru</CardTitle>
            <CardDescription>
              Upload dokumen arsip dan kelompokkan berdasarkan judul kategori.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Kategori Judul</label>
                <Select value={judulSource} onValueChange={setJudulSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih judul yang sudah ada atau buat baru" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_TITLE_OPTION}>+ Input judul baru</SelectItem>
                    {existingTitles.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {judulSource === NEW_TITLE_OPTION ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Judul Baru</label>
                  <Input
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="Contoh: Kontrak Vendor 2026"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Judul Terpilih</label>
                  <Input value={judulSource} readOnly />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <p className="text-xs text-muted-foreground">
                  Semua file pada satu proses upload akan masuk ke 1 kategori judul yang sama.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Label (Opsional)</label>
                <Input
                  list="existing-arsip-labels"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: Legal, Produksi, Audit"
                />
                <datalist id="existing-arsip-labels">
                  {existingLabels.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                {normalizedLabel && normalizedLabel !== label.trim() ? (
                  <p className="text-xs text-muted-foreground">
                    Label akan disimpan sebagai: {normalizedLabel}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Lokasi</label>
                <Select value={lokasi} onValueChange={setLokasi}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {lokasiOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">File Arsip</label>
                <Input
                  id="upload-arsip"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  required
                />
                {files.length > 0 ? (
                  <p className="text-xs text-muted-foreground">{files.length} file dipilih</p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 md:col-span-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Arsip
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari judul atau label"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadData(query)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void loadData(query)}>
                <Search className="mr-2 h-4 w-4" />
                Cari
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  void loadData("");
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ArsipFilter)}>
        <TabsList>
          <TabsTrigger value="SEMUA">
            <Archive className="mr-2 h-4 w-4" /> Semua
          </TabsTrigger>
          <TabsTrigger value="PDF">
            <FileText className="mr-2 h-4 w-4" /> PDF
          </TabsTrigger>
          <TabsTrigger value="DOC">
            <FileText className="mr-2 h-4 w-4" /> Word
          </TabsTrigger>
          <TabsTrigger value="XLS">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="SEMUA" className="mt-4">
          <GroupedArchiveGrid
            groups={groupedItems}
            loading={loading}
            onDelete={handleDelete}
            canDelete={isHRD}
          />
        </TabsContent>

        <TabsContent value="PDF" className="mt-4">
          <GroupedArchiveGrid
            groups={groupedItems}
            loading={loading}
            onDelete={handleDelete}
            canDelete={isHRD}
          />
        </TabsContent>

        <TabsContent value="DOC" className="mt-4">
          <GroupedArchiveGrid
            groups={groupedItems}
            loading={loading}
            onDelete={handleDelete}
            canDelete={isHRD}
          />
        </TabsContent>

        <TabsContent value="XLS" className="mt-4">
          <GroupedArchiveGrid
            groups={groupedItems}
            loading={loading}
            onDelete={handleDelete}
            canDelete={isHRD}
          />
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        Arsip Dokumen: {filteredItems.length} item dalam {groupedItems.length} kategori
      </p>
    </div>
  );
}