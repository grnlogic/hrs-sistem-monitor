"use client";

import React, { useEffect, useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { divisiAPI, MasterDivisiItem } from "@/lib/api/divisi";

export default function MasterDivisiPage() {
  const [divisiList, setDivisiList] = useState<MasterDivisiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDivisiItem | null>(null);
  const [formData, setFormData] = useState<{
    nama: string;
    kategori: "staff" | "nonstaff";
    gajiPerHari: string;
    keterangan: string;
  }>({
    nama: "",
    kategori: "nonstaff",
    gajiPerHari: "",
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete State
  const [deletingItem, setDeletingItem] = useState<MasterDivisiItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDivisi = async () => {
    try {
      setLoading(true);
      const data = await divisiAPI.getAll();
      setDivisiList(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengambil data divisi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisi();
  }, []);

  const filteredDivisi = useMemo(() => {
    return divisiList.filter((item) => {
      const matchSearch = item.nama.toLowerCase().includes(search.toLowerCase()) ||
        (item.keterangan || "").toLowerCase().includes(search.toLowerCase());
      const matchKategori = filterKategori === "all" || item.kategori === filterKategori;
      return matchSearch && matchKategori;
    });
  }, [divisiList, search, filterKategori]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ nama: "", kategori: "nonstaff", gajiPerHari: "", keterangan: "" });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MasterDivisiItem) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama,
      kategori: item.kategori,
      gajiPerHari: item.gajiPerHari != null ? String(item.gajiPerHari) : "",
      keterangan: item.keterangan || "",
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      setErrorMsg("Nama divisi tidak boleh kosong");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = {
        nama: formData.nama,
        kategori: formData.kategori,
        gajiPerHari: formData.gajiPerHari ? Number(formData.gajiPerHari) : null,
        keterangan: formData.keterangan,
      };

      if (editingItem) {
        await divisiAPI.update(editingItem.id, payload);
        setSuccessMsg(`Divisi "${formData.nama.toUpperCase()}" berhasil diperbarui`);
      } else {
        await divisiAPI.create(payload);
        setSuccessMsg(`Divisi baru "${formData.nama.toUpperCase()}" berhasil ditambahkan`);
      }

      setIsModalOpen(false);
      fetchDivisi();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data divisi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      setDeleting(true);
      await divisiAPI.delete(deletingItem.id);
      setSuccessMsg(`Divisi "${deletingItem.nama}" berhasil dihapus`);
      setDeletingItem(null);
      fetchDivisi();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus divisi");
      setDeletingItem(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Pengaturan · Master Divisi</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola daftar divisi perusahaan, pengelompokan kategori staff/non-staff, serta alokasi karyawan.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus size={16} />
          Tambah Divisi Baru
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && !isModalOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Filters & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Divisi</p>
              <h3 className="text-2xl font-bold mt-1">{divisiList.length}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Divisi Staff</p>
              <h3 className="text-2xl font-bold mt-1 text-indigo-600">
                {divisiList.filter((d) => d.kategori === "staff").length}
              </h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Divisi Non-Staff</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {divisiList.filter((d) => d.kategori === "nonstaff").length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Daftar Master Divisi</CardTitle>
              <CardDescription className="text-xs">
                Divisi terdaftar yang aktif dan dapat dipilih dalam sistem HRD.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari divisi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFilterKategori("all")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterKategori === "all" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKategori("staff")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterKategori === "staff" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKategori("nonstaff")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterKategori === "nonstaff" ? "bg-background shadow text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Non-Staff
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Memuat data divisi...</p>
            </div>
          ) : filteredDivisi.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto opacity-30 mb-2" />
              <p className="font-medium text-foreground">Divisi Tidak Ditemukan</p>
              <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau tambah divisi baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Nama Divisi</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Karyawan Aktif</th>
                    <th className="px-4 py-3 text-right">Tarif Upah/Hari</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDivisi.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {item.nama}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.kategori === "staff"
                              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {item.kategori === "staff" ? "Staff / Bulanan" : "Non-Staff / Harian-Borongan"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users size={14} className="text-primary/70" />
                          <span className="font-semibold text-foreground">{item.jumlahKaryawan}</span> Karyawan
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {item.gajiPerHari ? formatCurrency(item.gajiPerHari) : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                        {item.keterangan || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingItem(item)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {editingItem ? "Edit Divisi" : "Tambah Divisi Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingItem
                  ? "Perbarui nama, kategori, atau keterangan divisi yang sudah ada."
                  : "Masukkan rincian divisi baru yang ingin ditambahkan ke sistem."}
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <Alert variant="destructive" className="my-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-xs font-semibold">
                  Nama Divisi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nama"
                  placeholder="Contoh: MAINTENANCE, LINTING, QA"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Kategori Divisi</Label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs transition-all ${
                      formData.kategori === "nonstaff"
                        ? "border-primary bg-primary/5 font-semibold text-primary"
                        : "border-input hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kategori"
                      value="nonstaff"
                      checked={formData.kategori === "nonstaff"}
                      onChange={() => setFormData({ ...formData, kategori: "nonstaff" })}
                      className="sr-only"
                    />
                    <div>
                      <p className="font-semibold">Non-Staff</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Pabrik, Produksi, Harian/Borongan</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs transition-all ${
                      formData.kategori === "staff"
                        ? "border-primary bg-primary/5 font-semibold text-primary"
                        : "border-input hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kategori"
                      value="staff"
                      checked={formData.kategori === "staff"}
                      onChange={() => setFormData({ ...formData, kategori: "staff" })}
                      className="sr-only"
                    />
                    <div>
                      <p className="font-semibold">Staff / Kantor</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Manajemen, Administrasi, Bulanan</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gajiPerHari" className="text-xs font-semibold">
                  Tarif Upah Harian (Rp) <span className="text-muted-foreground font-normal">(Opsional)</span>
                </Label>
                <Input
                  id="gajiPerHari"
                  type="number"
                  placeholder="Contoh: 65000"
                  value={formData.gajiPerHari}
                  onChange={(e) => setFormData({ ...formData, gajiPerHari: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Tarif standar per hari untuk karyawan yang bekerja pada divisi ini.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keterangan" className="text-xs font-semibold">
                  Keterangan (Opsional)
                </Label>
                <textarea
                  id="keterangan"
                  rows={3}
                  placeholder="Catatan tambahan mengenai divisi ini..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Simpan Perubahan" : "Tambah Divisi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Hapus Divisi "{deletingItem?.nama}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm pt-1">
              {deletingItem && (deletingItem.jumlahKaryawan || 0) > 0 ? (
                <span className="text-destructive font-medium block bg-destructive/10 p-3 rounded-lg border border-destructive/20 mt-2">
                  Peringatan: Terdapat {deletingItem.jumlahKaryawan} karyawan aktif di divisi ini. Divisi tidak dapat dihapus sebelum seluruh karyawan dipindahkan ke divisi lain.
                </span>
              ) : (
                "Apakah Anda yakin ingin menghapus divisi ini secara permanen? Tindakan ini tidak dapat dibatalkan."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || (deletingItem?.jumlahKaryawan || 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus Divisi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
