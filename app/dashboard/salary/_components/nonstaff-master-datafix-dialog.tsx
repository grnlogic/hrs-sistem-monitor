"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/overlay/dialog";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { salaryAPI } from "@/lib/api/gaji";
import {
  Plus,
  Save,
  Settings,
  Pencil,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type MasterItemData = {
  id: string;
  tipe: "BONUS" | "POTONGAN";
  nama: string;
  nominalDefault: number | null;
  aktif?: boolean;
};

type NonStaffMasterDataFixDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
};

export function NonStaffMasterDataFixDialog({
  isOpen,
  onClose,
  onDataUpdated,
}: NonStaffMasterDataFixDialogProps) {
  const [activeTab, setActiveTab] = useState<"BONUS" | "POTONGAN">("BONUS");
  const [items, setItems] = useState<MasterItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form tambah item baru
  const [newNama, setNewNama] = useState("");
  const [newNominal, setNewNominal] = useState("");

  // State edit inline per row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editNominal, setEditNominal] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await salaryAPI.getSalaryItems();
      const list = Array.isArray(res) ? (res as MasterItemData[]) : [];
      setItems(list);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Gagal memuat daftar Data Fix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      setErrorMsg("");
      setSuccessMsg("");
      setNewNama("");
      setNewNominal("");
      setEditingId(null);
    }
  }, [isOpen, fetchItems]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = newNama.trim();
    if (!cleanNama) {
      setErrorMsg("Nama komponen wajib diisi.");
      return;
    }

    let parsedNominal: number | null = null;
    if (newNominal.trim()) {
      const n = Number(newNominal);
      if (isNaN(n) || n < 0) {
        setErrorMsg("Nominal default harus angka positif atau nol.");
        return;
      }
      parsedNominal = n;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await salaryAPI.createSalaryItem({
        type: activeTab,
        nama: cleanNama,
        nominalDefault: parsedNominal,
      });

      setSuccessMsg(`Komponen "${cleanNama}" berhasil ditambahkan.`);
      setNewNama("");
      setNewNominal("");
      await fetchItems();
      onDataUpdated?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menambahkan komponen Data Fix.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (item: MasterItemData) => {
    setEditingId(item.id);
    setEditNama(item.nama);
    setEditNominal(
      item.nominalDefault != null ? String(item.nominalDefault) : ""
    );
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNama("");
    setEditNominal("");
  };

  const handleSaveEdit = async (item: MasterItemData) => {
    const cleanNama = editNama.trim();
    if (!cleanNama) {
      setErrorMsg("Nama komponen tidak boleh kosong.");
      return;
    }

    let parsedNominal: number | null = null;
    if (editNominal.trim()) {
      const n = Number(editNominal);
      if (isNaN(n) || n < 0) {
        setErrorMsg("Nominal default harus angka positif atau nol.");
        return;
      }
      parsedNominal = n;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await salaryAPI.updateSalaryItem({
        id: item.id,
        nama: cleanNama,
        nominalDefault: parsedNominal,
      });

      setSuccessMsg(`Perubahan "${cleanNama}" berhasil disimpan.`);
      setEditingId(null);
      await fetchItems();
      onDataUpdated?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menyimpan perubahan komponen.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: MasterItemData) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus komponen "${item.nama}"? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await salaryAPI.deleteSalaryItem(item.id);
      setSuccessMsg(`Komponen "${item.nama}" berhasil dihapus.`);
      if (editingId === item.id) {
        setEditingId(null);
      }
      await fetchItems();
      onDataUpdated?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menghapus komponen.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentTabItems = items.filter((i) => i.tipe === activeTab);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Pengaturan Data Fix (Komponen Rutin Gaji)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kelola master komponen rutin dan nominal default untuk form Bonus &amp; Potongan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex border-b border-border/80 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("BONUS");
              setErrorMsg("");
              setSuccessMsg("");
              setEditingId(null);
            }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "BONUS"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Master Bonus ({items.filter((i) => i.tipe === "BONUS").length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("POTONGAN");
              setErrorMsg("");
              setSuccessMsg("");
              setEditingId(null);
            }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "POTONGAN"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Master Potongan ({items.filter((i) => i.tipe === "POTONGAN").length})
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Tambah Item Baru */}
        <form
          onSubmit={handleAddItem}
          className="rounded-xl border bg-muted/30 p-3.5 space-y-2"
        >
          <p className="text-xs font-semibold text-foreground">
            + Tambah Komponen {activeTab === "BONUS" ? "Bonus" : "Potongan"} Baru
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <Input
                type="text"
                placeholder={
                  activeTab === "BONUS"
                    ? "Nama Bonus (misal: Kikiping)"
                    : "Nama Potongan (misal: BPJS Ketenagakerjaan)"
                }
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                disabled={submitting}
                className="h-9 text-xs"
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                type="number"
                min={0}
                placeholder="Nominal default (Rp)"
                value={newNominal}
                onChange={(e) => setNewNominal(e.target.value)}
                disabled={submitting}
                className="h-9 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={submitting || !newNama.trim()}
                className="w-full h-9 text-xs gap-1"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Tambah
              </Button>
            </div>
          </div>
        </form>

        {/* Tabel Komponen */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-bold text-foreground">
                  Nama Komponen
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground min-w-[150px]">
                  Nominal Default
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right w-[150px]">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-28 text-center text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground mb-1" />
                    Memuat data komponen...
                  </TableCell>
                </TableRow>
              ) : currentTabItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-20 text-center text-xs text-muted-foreground"
                  >
                    Belum ada data komponen untuk {activeTab.toLowerCase()}.
                  </TableCell>
                </TableRow>
              ) : (
                currentTabItems.map((item) => {
                  const isEditing = editingId === item.id;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editNama}
                            onChange={(e) => setEditNama(e.target.value)}
                            disabled={submitting}
                            className="h-8 text-xs font-medium"
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs font-medium text-foreground">
                            {item.nama}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            placeholder="Tanpa default"
                            value={editNominal}
                            onChange={(e) => setEditNominal(e.target.value)}
                            disabled={submitting}
                            className="h-8 text-xs"
                          />
                        ) : (
                          <span className="text-xs">
                            {item.nominalDefault != null && item.nominalDefault > 0 ? (
                              formatCurrency(item.nominalDefault)
                            ) : (
                              <span className="text-muted-foreground italic">
                                Tanpa default
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              disabled={submitting}
                              onClick={() => handleSaveEdit(item)}
                              className="h-7 px-2.5 text-[11px] gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Simpan
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={submitting}
                              onClick={handleCancelEdit}
                              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                              Batal
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={submitting}
                              onClick={() => handleStartEdit(item)}
                              title="Edit komponen ini"
                              className="h-7 px-2.5 text-[11px] gap-1"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={submitting}
                              onClick={() => handleDeleteItem(item)}
                              title="Hapus komponen ini"
                              className="h-7 px-2.5 text-[11px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Hapus
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
