"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  Film,
  Loader2,
  Trash2,
  Upload,
  Search,
  RefreshCw,
  X,
  Image,
  Video,
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
import {
  galleryAPI,
  resolveMediaUrl,
  type GaleriItem,
  type GaleriTipeMedia,
} from "@/lib/api";
import { NAMA_PT } from "@/lib/constants/perusahaan";

type Lokasi = "PJP" | "SP" | "PRIMA";

const lokasiOptions: Lokasi[] = ["PJP", "SP", "PRIMA"];
const NEW_TITLE_OPTION = "__NEW_TITLE__";

type GalleryGroup = {
  key: string;
  title: string;
  items: GaleriItem[];
  latestCreatedAt: string;
};

// ─── Lightbox ───────────────────────────────────────────────────────────────

function GalleryLightbox({
  group,
  onClose,
  onDelete,
  canDelete,
}: {
  group: GalleryGroup | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // animate in
  useEffect(() => {
    if (group) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [group]);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // lock scroll
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

  if (!group) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Hapus item galeri ini?")) return;
    onDelete(id);
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
        className="relative flex w-full max-w-3xl flex-col rounded-t-2xl bg-background sm:rounded-2xl"
        style={{
          maxHeight: "90vh",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* drag pill */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted sm:hidden" />

        {/* header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold leading-none">{group.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {group.items.length} item dalam kategori ini
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

        {/* scrollable grid */}
        <div className="overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.items.map((item) => {
              const mediaSrc = resolveMediaUrl(item.url);
              const thumbSrc = item.thumbnail ? resolveMediaUrl(item.thumbnail) : "";

              return (
                <div key={item.id} className="group/item relative">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    {item.tipe === "FOTO" ? (
                      <img
                        src={mediaSrc}
                        alt={item.judul}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <video
                        controls
                        className="h-full w-full bg-black object-cover"
                        poster={thumbSrc || undefined}
                      >
                        <source src={mediaSrc} />
                        Browser Anda tidak mendukung preview video.
                      </video>
                    )}

                    {canDelete && (
                      <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground shadow transition hover:bg-destructive/90"
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.lokasi && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.lokasi}
                      </span>
                    )}
                    {item.label && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Group Card (bingkai bertumpuk) ─────────────────────────────────────────

const STACK_COLORS = [
  "#9FE1CB",
  "#B5D4F4",
  "#FAC775",
  "#F4C0D1",
  "#C0DD97",
  "#AFA9EC",
  "#F5C4B3",
  "#D3D1C7",
];

function GroupCard({
  group,
  colorIndex,
  onClick,
  isVideo,
}: {
  group: GalleryGroup;
  colorIndex: number;
  onClick: () => void;
  isVideo: boolean;
}) {
  const preview = group.items.slice(0, 3);
  const bgColor = STACK_COLORS[colorIndex % STACK_COLORS.length];

  // stack positions: back → front
  const stackConfig = [
    { rotate: "4deg", scale: 0.92, z: 1, top: "4%", left: "3%" },
    { rotate: "-4deg", scale: 0.94, z: 2, top: "3%", left: "12%" },
    { rotate: "0deg", scale: 1, z: 3, top: "8%", left: "7%" },
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group/card cursor-pointer select-none outline-none"
    >
      <div
        className="relative overflow-hidden rounded-xl border bg-card transition-all duration-200 group-hover/card:-translate-y-1"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        {/* stack area */}
        <div
          className="relative h-52"
          style={{ background: `${bgColor}22` }}
        >
          {preview.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Kosong
            </div>
          ) : (
            <>
              {/* render back-to-front */}
              {[...preview].reverse().map((item, ri) => {
                const fi = preview.length - 1 - ri; // original index
                const cfg = stackConfig[Math.min(fi, 2)];
                const mediaSrc = resolveMediaUrl(isVideo ? (item.thumbnail ?? item.url) : item.url);

                return (
                  <div
                    key={item.id}
                    className="absolute overflow-hidden rounded-lg border-2 border-background"
                    style={{
                      width: "76%",
                      height: "78%",
                      top: cfg.top,
                      left: cfg.left,
                      zIndex: cfg.z,
                      transform: `rotate(${cfg.rotate}) scale(${cfg.scale})`,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <img
                      src={mediaSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // fallback to colored placeholder
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: STACK_COLORS[(colorIndex + fi) % STACK_COLORS.length] + "55" }}
                    />
                  </div>
                );
              })}

              {/* hover shimmer overlay */}
              <div
                className="absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </>
          )}

          {/* item count badge */}
          <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
            {isVideo ? (
              <Video className="h-3 w-3" />
            ) : (
              <Image className="h-3 w-3" />
            )}
            {group.items.length}
          </div>
        </div>

        {/* info */}
        <div className="border-t px-3 py-2.5">
          <h3 className="truncate text-sm font-medium leading-snug">{group.title}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {group.items[0]?.lokasi && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {group.items[0].lokasi}
              </Badge>
            )}
            {group.items[0]?.label && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {group.items[0].label}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GroupedMediaGrid ────────────────────────────────────────────────────────

function GroupedMediaGrid({
  groups,
  loading,
  onDelete,
  canDelete,
  isVideo,
}: {
  groups: GalleryGroup[];
  loading: boolean;
  onDelete: (id: string) => void;
  canDelete: boolean;
  isVideo: boolean;
}) {
  const [activeGroup, setActiveGroup] = useState<GalleryGroup | null>(null);

  const handleClose = useCallback(() => setActiveGroup(null), []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="overflow-hidden rounded-xl border bg-card">
            <div className="h-52 animate-pulse bg-muted" />
            <div className="border-t p-3">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Belum ada media pada tab ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {groups.map((group, i) => (
          <GroupCard
            key={group.key}
            group={group}
            colorIndex={i}
            onClick={() => setActiveGroup(group)}
            isVideo={isVideo}
          />
        ))}
      </div>

      <GalleryLightbox
        group={activeGroup}
        onClose={handleClose}
        onDelete={(id) => {
          onDelete(id);
          // update local state optimistically so lightbox reflects deletion
          setActiveGroup((prev) =>
            prev
              ? { ...prev, items: prev.items.filter((item) => item.id !== id) }
              : null,
          );
        }}
        canDelete={canDelete}
      />
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function GaleriPage() {
  const { data: session } = useSession();
  const isHRD = (session?.user?.role || "HRD") === "HRD";

  const [activeTab, setActiveTab] = useState<GaleriTipeMedia>("FOTO");
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [judul, setJudul] = useState("");
  const [judulSource, setJudulSource] = useState<string>(NEW_TITLE_OPTION);
  const [label, setLabel] = useState("");
  const [lokasi, setLokasi] = useState<string>(session?.user?.lokasi || "PJP");
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!lokasi && session?.user?.lokasi) {
      setLokasi(session.user.lokasi);
    }
  }, [lokasi, session?.user?.lokasi]);

  const loadData = async (tipe: GaleriTipeMedia, search = query) => {
    try {
      setLoading(true);
      setError("");
      const response = await galleryAPI.getAll({ tipe, q: search || undefined });
      setItems(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data galeri");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();

    if (files.length === 0) {
      setError(activeTab === "FOTO" ? "Minimal pilih 1 foto" : "File wajib dipilih");
      return;
    }
    if (activeTab === "VIDEO" && files.length > 1) {
      setError("Upload video hanya bisa 1 file per proses");
      return;
    }
    if (!selectedUploadTitle) {
      setError("Judul kategori wajib diisi atau pilih judul yang sudah ada");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const filesToUpload = activeTab === "VIDEO" ? files.slice(0, 1) : files;

      for (const currentFile of filesToUpload) {
        await galleryAPI.upload({
          judul: selectedUploadTitle,
          label: normalizedLabel || undefined,
          tipe: activeTab,
          lokasi: (lokasi || undefined) as Lokasi | undefined,
          file: currentFile,
          thumbnail: activeTab === "VIDEO" ? thumbnail || undefined : undefined,
        });
      }

      setJudul("");
      setJudulSource(NEW_TITLE_OPTION);
      setLabel("");
      setFiles([]);
      setThumbnail(null);
      const fileInput = document.getElementById("upload-media") as HTMLInputElement | null;
      const thumbInput = document.getElementById("upload-thumbnail") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      if (thumbInput) thumbInput.value = "";

      await loadData(activeTab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await galleryAPI.remove(id);
      await loadData(activeTab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus item");
    }
  };

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

  const groupedItems = useMemo<GalleryGroup[]>(() => {
    const map = new Map<string, GalleryGroup>();
    items.forEach((item) => {
      const rawTitle = item.judul.trim();
      const safeTitle = rawTitle || "Tanpa Judul";
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
  }, [items]);

  const existingTitles = useMemo(
    () => groupedItems.map((group) => group.title),
    [groupedItems],
  );

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

  const title = activeTab === "FOTO" ? "Galeri Foto" : "Galeri Video";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Galeri</h1>
        <p className="text-sm text-muted-foreground">
          Dokumentasi kegiatan EMS {NAMA_PT.PJP} dalam bentuk foto dan video.
        </p>
      </div>

      {/* upload form (HRD only) */}
      {isHRD ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Media Baru</CardTitle>
            <CardDescription>
              Pilih tab Foto atau Video, lalu upload file sesuai tipe media.
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
                    placeholder="Contoh: Jalan Jalan"
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
                  Semua file yang diupload dalam satu proses akan masuk ke 1 kategori judul yang sama.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Label (Opsional)</label>
                <Input
                  list="existing-gallery-labels"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: Produksi, Event, Pelatihan"
                />
                <datalist id="existing-gallery-labels">
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

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  File {activeTab === "FOTO" ? "Foto" : "Video"}
                </label>
                <Input
                  id="upload-media"
                  type="file"
                  accept={
                    activeTab === "FOTO"
                      ? "image/*"
                      : "video/mp4,video/webm,video/quicktime"
                  }
                  multiple={activeTab === "FOTO"}
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  required
                />
                {files.length > 0 ? (
                  <p className="text-xs text-muted-foreground">{files.length} file dipilih</p>
                ) : null}
              </div>

              {activeTab === "VIDEO" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail Video (Opsional)</label>
                  <Input
                    id="upload-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 md:col-span-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload {activeTab === "FOTO" ? "Foto" : "Video"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* search & toolbar */}
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
                onKeyDown={(e) => e.key === "Enter" && void loadData(activeTab, query)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void loadData(activeTab, query)}>
                <Search className="mr-2 h-4 w-4" />
                Cari
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  void loadData(activeTab, "");
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

      {/* tabs + gallery */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as GaleriTipeMedia)}
      >
        <TabsList>
          <TabsTrigger value="FOTO">
            <Camera className="mr-2 h-4 w-4" /> Foto
          </TabsTrigger>
          <TabsTrigger value="VIDEO">
            <Film className="mr-2 h-4 w-4" /> Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="FOTO" className="mt-4">
          <GroupedMediaGrid
            groups={groupedItems}
            loading={loading}
            onDelete={handleDelete}
            canDelete={isHRD}
            isVideo={false}
          />
        </TabsContent>

        <TabsContent value="VIDEO" className="mt-4">
          <GroupedMediaGrid
            groups={groupedItems}
            loading={loading}
            onDelete={handleDelete}
            canDelete={isHRD}
            isVideo={true}
          />
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        {title}: {items.length} item dalam {groupedItems.length} kategori
      </p>
    </div>
  );
}