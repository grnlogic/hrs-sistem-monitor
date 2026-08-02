"use client";

import * as React from "react";
import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
import { Checkbox } from "@/components/ui/form/checkbox";
import { CreatableCombobox } from "@/components/ui/form/creatable-combobox";
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Save } from "lucide-react";
import { useMasterGajiItems } from "./master-gaji-items";
import {
  type SnapshotRow,
  type InputState,
  type CalculatedSnapshot,
  buildDefaultInputState,
  toNumber,
} from "./nonstaff-salary-shared";
import { AUTO_BONUS_JUDUL } from "./salary-stepper-shared";

type NonStaffInputDialogProps = {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedSnapshot: SnapshotRow | undefined;
  startDate: string;
  endDate: string;
  inputsBySalaryId: Record<string, InputState>;
  canEditSalary: boolean;
  calculatedForSnapshot: (row: SnapshotRow) => CalculatedSnapshot;
  updateItem: (
    salaryId: string,
    key: "bonusItems" | "potonganItems",
    index: number,
    field: "judul" | "nominal",
    value: string
  ) => void;
  addItem: (salaryId: string, key: "bonusItems" | "potonganItems") => void;
  deleteItem: (
    salaryId: string,
    key: "bonusItems" | "potonganItems",
    index: number
  ) => void;
  addKikipingItem: (salaryId: string) => void;
  updatePakaiUangPribadi: (salaryId: string, value: boolean) => void;
  updateBayarMingguIni: (salaryId: string, value: boolean) => void;
  updateNominalCicilan: (salaryId: string, value: number | null) => void;
  upsertPinjamanItem: (salaryId: string, nominal: number, present: boolean) => void;
  submitting: boolean;
  saveInputSalary: () => void;
};

function formatPeriod(startDate: string, endDate: string): string {
  const format = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  return `${format(startDate)} s/d ${format(endDate)}`;
}

export function NonStaffInputDialog(props: NonStaffInputDialogProps) {
  const {
    dialogOpen,
    setDialogOpen,
    selectedSnapshot,
    startDate,
    endDate,
    inputsBySalaryId,
    canEditSalary,
    calculatedForSnapshot,
    updateItem,
    addItem,
    deleteItem,
    addKikipingItem,
    updatePakaiUangPribadi,
    updateBayarMingguIni,
    updateNominalCicilan,
    upsertPinjamanItem,
    submitting,
    saveInputSalary,
  } = props;

  const { bonusOptions, potonganOptions, load, ensureItemSaved } = useMasterGajiItems();

  const currentInputState = selectedSnapshot ? inputsBySalaryId[selectedSnapshot.gajiId] : undefined;
  const piutangInfo = currentInputState?.piutangInfo;
  // Data tidak sehat: >1 piutang aktif — kontrol dikunci, rekap ditolak BE.
  const piutangKonflik = Boolean(currentInputState?.piutangKonflik);
  const piutangAktifCount = Number(currentInputState?.piutangAktifCount || 0);
  const pakaiUangPribadi = currentInputState?.pakaiUangPribadi || false;
  // Kontrol cicilan piutang: bayar minggu ini (default) + nominal override
  // (default = cicilan/minggu, di-clamp ke sisa saldo).
  const bayarMingguIni = currentInputState?.bayarMingguIni !== false;
  const sisaSaldoPiutang = Number(piutangInfo?.sisaSaldo || 0);
  const nominalCicilanDefault = Number(piutangInfo?.jumlahCicilan || 0);
  const nominalOverride = currentInputState?.nominalCicilan ?? nominalCicilanDefault;
  const nominalCicilanEfektif = Math.min(
    Math.max(0, nominalOverride),
    Math.max(0, sisaSaldoPiutang)
  );

  // Sinkronkan item potongan "Pinjaman" dengan kontrol panel piutang:
  // override → nilai item ikut berubah (tabel & preview slip live konsisten),
  // skip → item dihapus. Idempotent — tidak memicu loop karena nilai stabil.
  React.useEffect(() => {
    if (!selectedSnapshot || !piutangInfo) return;
    upsertPinjamanItem(
      selectedSnapshot.gajiId,
      nominalCicilanEfektif,
      bayarMingguIni && nominalCicilanEfektif > 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSnapshot?.gajiId, piutangInfo?.id, bayarMingguIni, nominalCicilanEfektif]);

  React.useEffect(() => {
    if (dialogOpen) load();
  }, [dialogOpen, load]);

  // Auto-fill bonus "kikiping" (10.000): tambahkan 1 baris bila karyawan ini
  // belum punya baris kikiping di periode ini. Idempotent — buka-tutup dialog
  // berkali-kali tetap hanya 1 baris (cek by nama). Baris bisa diedit/dihapus.
  React.useEffect(() => {
    if (!dialogOpen || !selectedSnapshot) return;
    const salaryId = selectedSnapshot.gajiId;
    const bonusList = inputsBySalaryId[salaryId]?.bonusItems || [];
    const hasKikiping = bonusList.some(
      (item) => item.judul.toLowerCase() === AUTO_BONUS_JUDUL
    );
    if (!hasKikiping) {
      addKikipingItem(salaryId);
      void ensureItemSaved("BONUS", AUTO_BONUS_JUDUL);
    }
  }, [dialogOpen, selectedSnapshot, inputsBySalaryId, addKikipingItem, ensureItemSaved]);

  const handleSave = () => {
    const state = selectedSnapshot
      ? inputsBySalaryId[selectedSnapshot.gajiId]
      : undefined;
    const persist = state
      ? [
          ...state.bonusItems.map((item) => ensureItemSaved("BONUS", item.judul)),
          ...state.potonganItems.map((item) => ensureItemSaved("POTONGAN", item.judul)),
        ]
      : [];
    void Promise.all(persist).finally(saveInputSalary);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {selectedSnapshot?.nama} - {selectedSnapshot?.divisi} -{" "}
            {formatPeriod(startDate, endDate)}
          </DialogTitle>
          <DialogDescription>
            Input bonus dan potongan untuk karyawan ini.
          </DialogDescription>
        </DialogHeader>

        {selectedSnapshot ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="mb-2 text-sm font-semibold">
                  Ringkasan Kehadiran
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                  <p>
                    Hari Hadir:{" "}
                    <span className="font-semibold">
                      {selectedSnapshot.hariHadir}
                    </span>
                  </p>
                  <p>
                    Setengah Hari:{" "}
                    <span className="font-semibold">
                      {selectedSnapshot.setengahHari}
                    </span>
                  </p>
                  <p>
                    Lembur:{" "}
                    <span className="font-semibold">
                      {selectedSnapshot.lembur}
                    </span>
                  </p>
                  <p>
                    Hari Efektif:{" "}
                    <span className="font-semibold">
                      {selectedSnapshot.hariEfektif}
                    </span>
                  </p>
                  <p>
                    Upah Harian:{" "}
                    <span className="font-semibold">
                      {formatCurrency(selectedSnapshot.upahHarian)}
                    </span>
                  </p>
                  <p>
                    Gaji Pokok:{" "}
                    <span className="font-semibold">
                      {formatCurrency(selectedSnapshot.gajiPokok)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bonus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul Bonus</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      inputsBySalaryId[selectedSnapshot.gajiId]
                        ?.bonusItems || []
                    ).map((item, index) => (
                      <TableRow key={`bonus-${selectedSnapshot.gajiId}-${index}`}>
                        <TableCell>
                          <CreatableCombobox
                            options={bonusOptions}
                            value={item.judul}
                            disabled={!canEditSalary}
                            placeholder="Pilih atau ketik nama bonus..."
                            onChange={(judul) =>
                              updateItem(
                                selectedSnapshot.gajiId,
                                "bonusItems",
                                index,
                                "judul",
                                judul
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            onWheel={(e) => e.currentTarget.blur()}
                            value={
                              toNumber(item.nominal) === 0
                                ? ""
                                : item.nominal
                            }
                            disabled={!canEditSalary}
                            onChange={(event) =>
                              updateItem(
                                selectedSnapshot.gajiId,
                                "bonusItems",
                                index,
                                "nominal",
                                event.target.value
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={!canEditSalary}
                            onClick={() =>
                              deleteItem(
                                selectedSnapshot.gajiId,
                                "bonusItems",
                                index
                              )
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canEditSalary}
                  onClick={() =>
                    addItem(selectedSnapshot.gajiId, "bonusItems")
                  }
                  className="mt-2 gap-1 text-primary border-primary/20 hover:bg-primary/5"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Bonus
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Potongan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul Potongan</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      inputsBySalaryId[selectedSnapshot.gajiId]
                        ?.potonganItems || []
                    )
                      // Saat skip minggu ini: baris Pinjaman disembunyikan dari
                      // tabel (panel piutang yang mengatur), slip juga tanpa Pinjaman.
                      .filter(
                        (item) =>
                          !(piutangInfo && !bayarMingguIni && item.judul.toLowerCase() === "pinjaman")
                      )
                      .map((item, index) => {
                        const isPinjamanTerkelola = Boolean(
                          piutangInfo && item.judul.toLowerCase() === "pinjaman"
                        );
                        return (
                      <TableRow key={`potongan-${selectedSnapshot.gajiId}-${index}`}>
                        <TableCell>
                          <CreatableCombobox
                            options={potonganOptions}
                            value={item.judul}
                            disabled={!canEditSalary || isPinjamanTerkelola || piutangKonflik}
                            placeholder="Pilih atau ketik nama potongan..."
                            onChange={(judul) =>
                              updateItem(
                                selectedSnapshot.gajiId,
                                "potonganItems",
                                index,
                                "judul",
                                judul
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type={isPinjamanTerkelola ? "text" : "number"}
                            min={0}
                            placeholder="0"
                            onWheel={(e) => e.currentTarget.blur()}
                            value={
                              isPinjamanTerkelola
                                ? nominalCicilanEfektif > 0
                                  ? nominalCicilanEfektif.toLocaleString("id-ID")
                                  : ""
                                : toNumber(item.nominal) === 0
                                  ? ""
                                  : item.nominal
                            }
                            disabled={!canEditSalary || isPinjamanTerkelola || piutangKonflik}
                            onChange={(event) =>
                              updateItem(
                                selectedSnapshot.gajiId,
                                "potonganItems",
                                index,
                                "nominal",
                                event.target.value
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={item.isDefault || isPinjamanTerkelola || piutangKonflik}
                            onClick={() =>
                              deleteItem(
                                selectedSnapshot.gajiId,
                                "potonganItems",
                                index
                              )
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                      })}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addItem(selectedSnapshot.gajiId, "potonganItems")
                  }
                  className="mt-2 gap-1 text-primary border-primary/20 hover:bg-primary/5"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Potongan
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informasi Piutang & Pinjaman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {piutangKonflik && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                    <p className="font-semibold">
                      Data piutang tidak sehat: karyawan ini memiliki {piutangAktifCount} piutang
                      aktif sekaligus (sistem hanya mengizinkan 1).
                    </p>
                    <p className="mt-1">
                      Kontrol cicilan dikunci dan rekapan tidak dapat disimpan sampai data
                      dirapikan (lunasi/cek di halaman Loans). Hubungi admin.
                    </p>
                  </div>
                )}
                {piutangInfo ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-zinc-50 p-2.5 rounded-lg border">
                        <p className="font-semibold text-zinc-500">Sisa Saldo</p>
                        <p className="text-sm font-bold text-zinc-950 mt-0.5">
                          {formatCurrency(piutangInfo.sisaSaldo)}
                        </p>
                      </div>
                      <div className="bg-zinc-50 p-2.5 rounded-lg border">
                        <p className="font-semibold text-zinc-500">Cicilan / Minggu</p>
                        <p className="text-sm font-bold text-zinc-950 mt-0.5">
                          {formatCurrency(piutangInfo.jumlahCicilan)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1.5">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="bayarMingguIni"
                          disabled={!canEditSalary || piutangKonflik}
                          checked={bayarMingguIni}
                          onCheckedChange={(checked) =>
                            updateBayarMingguIni(selectedSnapshot.gajiId, Boolean(checked))
                          }
                        />
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor="bayarMingguIni"
                            className="text-xs font-semibold text-zinc-900 cursor-pointer"
                          >
                            Bayar Minggu Ini
                          </label>
                          <p className="text-[10px] text-zinc-500 font-normal">
                            {bayarMingguIni
                              ? "Cicilan periode ini dipotong dari gaji seperti biasa."
                              : "Skip cicilan minggu ini. Saldo tidak berkurang dan tidak ada potongan Pinjaman di slip."}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-1">
                        <label
                          htmlFor="nominalCicilanOverride"
                          className="text-xs font-semibold text-zinc-700"
                        >
                          Nominal Cicilan Minggu Ini
                        </label>
                        <Input
                          id="nominalCicilanOverride"
                          disabled={!canEditSalary || !bayarMingguIni || piutangKonflik}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={
                            nominalCicilanEfektif > 0
                              ? nominalCicilanEfektif.toLocaleString("id-ID")
                              : ""
                          }
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            if (digits === "") {
                              updateNominalCicilan(selectedSnapshot.gajiId, null);
                              return;
                            }
                            // Clamp live ke sisa saldo (pelunasan terakhir).
                            updateNominalCicilan(
                              selectedSnapshot.gajiId,
                              Math.min(Math.max(0, Number(digits)), sisaSaldoPiutang)
                            );
                          }}
                        />
                        <p className="text-[10px] text-zinc-500">
                          Default {formatCurrency(nominalCicilanDefault)}. Maksimal sisa saldo{" "}
                          {formatCurrency(sisaSaldoPiutang)} — otomatis di-clamp.
                        </p>
                      </div>

                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="pakaiUangPribadi"
                          disabled={!canEditSalary || !bayarMingguIni || piutangKonflik}
                          checked={pakaiUangPribadi}
                          onCheckedChange={(checked) =>
                            updatePakaiUangPribadi(selectedSnapshot.gajiId, Boolean(checked))
                          }
                        />
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor="pakaiUangPribadi"
                            className="text-xs font-semibold text-zinc-900 cursor-pointer"
                          >
                            Pakai Uang Pribadi
                          </label>
                          <p className="text-[10px] text-zinc-500 font-normal">
                            {!bayarMingguIni
                              ? "Tidak relevan — cicilan minggu ini di-skip."
                              : pakaiUangPribadi
                                ? "Cicilan dibayar tunai. Tidak mengurangi take-home pay slip gaji ini."
                                : "Cicilan otomatis dipotong dan mengurangi take-home pay slip gaji."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 py-2">
                    Karyawan tidak memiliki pinjaman aktif terdaftar di sistem.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Preview Slip Live
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Gaji Pokok</span>
                  <span>
                    {formatCurrency(selectedSnapshot.gajiPokok)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Bonus</span>
                  <span>
                    {formatCurrency(
                      calculatedForSnapshot(selectedSnapshot).totalBonus
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Potongan</span>
                  <span>
                    {formatCurrency(
                      calculatedForSnapshot(selectedSnapshot).totalPotongan
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Gaji Bersih</span>
                  <span>
                    {formatCurrency(
                      calculatedForSnapshot(selectedSnapshot).gajiBersih
                    )}
                  </span>
                </div>
                {inputsBySalaryId[selectedSnapshot.gajiId]?.sisaPiutang !== undefined &&
                  inputsBySalaryId[selectedSnapshot.gajiId]?.sisaPiutang !== null &&
                  inputsBySalaryId[selectedSnapshot.gajiId]?.sisaPiutang! > 0 && (
                    <div className="flex justify-between border-t pt-2 text-muted-foreground">
                      <span>Sisa Piutang</span>
                      <span>
                        {formatCurrency(inputsBySalaryId[selectedSnapshot.gajiId].sisaPiutang!)}
                      </span>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <DialogFooter className="pt-4 border-t sm:justify-between items-center">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || !canEditSalary}
            className="gap-2 w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{" "}
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Simpan Perubahan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
