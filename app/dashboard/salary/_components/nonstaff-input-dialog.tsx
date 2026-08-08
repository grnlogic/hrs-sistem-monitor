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
import { Badge } from "@/components/ui/display/badge";
import { formatCurrency } from "@/lib/utils";
import { roundUpToHundred, calcGajiBersih } from "@/lib/salary-utils";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { useMasterGajiItems } from "./master-gaji-items";
import {
  type SnapshotRow,
  type InputState,
  type CalculatedSnapshot,
  buildDefaultInputState,
  toNumber,
  CompanyBadge,
} from "./nonstaff-salary-shared";
import { AUTO_BONUS_JUDUL, AUTO_BONUS_NOMINAL } from "./salary-stepper-shared";

type NonStaffInputDialogProps = {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedSnapshot: SnapshotRow | undefined;
  startDate: string;
  endDate: string;
  inputsBySalaryId: Record<string, InputState>;
  canEditSalary: boolean;
  submitting: boolean;
  saveInputSalary: (salaryId: string, finalState: InputState) => void;
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
    submitting,
    saveInputSalary,
  } = props;

  const { bonusOptions, potonganOptions, load, ensureItemSaved } = useMasterGajiItems();

  // Local draft state — isolates edits so changes only persist when user clicks "Simpan Perubahan"
  const [draftState, setDraftState] = React.useState<InputState>(buildDefaultInputState());

  React.useEffect(() => {
    if (dialogOpen && selectedSnapshot) {
      const parentState = inputsBySalaryId[selectedSnapshot.gajiId] || buildDefaultInputState();
      const draft: InputState = JSON.parse(JSON.stringify(parentState));

      // Auto-fill bonus "kikiping" (10.000) for initial/unsaved draft
      if (
        !draft.isBonusSaved &&
        (draft.bonusItems.length === 0 ||
          (draft.bonusItems.length === 1 &&
            (draft.bonusItems[0].judul === "Bonus" || draft.bonusItems[0].judul === "" || !draft.bonusItems[0].judul) &&
            Number(draft.bonusItems[0].nominal) === 0))
      ) {
        draft.bonusItems = [{ judul: AUTO_BONUS_JUDUL, nominal: AUTO_BONUS_NOMINAL }];
      }

      setDraftState(draft);
    }
  }, [dialogOpen, selectedSnapshot, inputsBySalaryId]);

  React.useEffect(() => {
    if (dialogOpen) load();
  }, [dialogOpen, load]);



  const piutangInfo = draftState.piutangInfo;
  const piutangKonflik = Boolean(draftState.piutangKonflik);
  const piutangAktifCount = Number(draftState.piutangAktifCount || 0);
  const pakaiUangPribadi = draftState.pakaiUangPribadi || false;
  const bayarMingguIni = draftState.bayarMingguIni !== false;
  const sisaSaldoPiutang = Number(piutangInfo?.sisaSaldo || 0);
  const nominalCicilanDefault = Number(piutangInfo?.jumlahCicilan || 0);
  const nominalOverride = draftState.nominalCicilan ?? nominalCicilanDefault;
  const nominalCicilanEfektif = Math.min(
    Math.max(0, nominalOverride),
    Math.max(0, sisaSaldoPiutang)
  );

  // Sync Pinjaman item inside draftState
  React.useEffect(() => {
    if (!selectedSnapshot || !piutangInfo) return;
    setDraftState((prev) => {
      const idx = prev.potonganItems.findIndex(
        (i) => i.judul.toLowerCase() === "pinjaman"
      );
      const present = bayarMingguIni && nominalCicilanEfektif > 0;
      let list = [...prev.potonganItems];
      if (!present) {
        if (idx >= 0) list = list.filter((_, k) => k !== idx);
      } else if (idx >= 0) {
        if (list[idx].nominal === nominalCicilanEfektif) return prev;
        list[idx] = { ...list[idx], nominal: nominalCicilanEfektif };
      } else {
        list = [...list, { judul: "Pinjaman", nominal: nominalCicilanEfektif }];
      }
      return { ...prev, potonganItems: list };
    });
  }, [selectedSnapshot, piutangInfo, bayarMingguIni, nominalCicilanEfektif]);

  // Handlers for draftState
  const updateDraftItem = (
    key: "bonusItems" | "potonganItems",
    index: number,
    field: "judul" | "nominal",
    value: string
  ) => {
    setDraftState((prev) => {
      const list = [...prev[key]];
      const updated = { ...list[index] };
      if (field === "judul") {
        updated.judul = value;
      } else {
        updated.nominal = toNumber(value);
      }
      list[index] = updated;
      return { ...prev, [key]: list };
    });
  };

  const addDraftItem = (key: "bonusItems" | "potonganItems") => {
    setDraftState((prev) => ({
      ...prev,
      [key]: [...prev[key], { judul: "", nominal: 0 }],
    }));
  };

  const deleteDraftItem = (key: "bonusItems" | "potonganItems", index: number) => {
    setDraftState((prev) => {
      const target = prev[key][index];
      if (target?.isDefault) return prev;
      return {
        ...prev,
        [key]: prev[key].filter((_, i) => i !== index),
      };
    });
  };

  const handleResetBonus = () => {
    setDraftState((prev) => ({
      ...prev,
      bonusItems: [{ judul: "Bonus", nominal: 0 }],
    }));
  };

  const calcLive = React.useMemo(() => {
    if (!selectedSnapshot) {
      return { totalBonus: 0, totalPotongan: 0, gajiBersih: 0, gajiBersihSebelumBulat: 0 };
    }
    const totalBonus = draftState.bonusItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const totalPotongan = draftState.potonganItems.reduce((sum, item) => sum + toNumber(item.nominal), 0);
    const { gajiBersih, gajiBersihSebelumBulat } = calcGajiBersih(
      selectedSnapshot.gajiPokok + totalBonus,
      totalPotongan,
      draftState.manualGajiBersih
    );
    return {
      totalBonus,
      totalPotongan,
      gajiBersih,
      gajiBersihSebelumBulat,
    };
  }, [selectedSnapshot, draftState]);

  const handleSave = () => {
    if (!selectedSnapshot) return;
    const persist = [
      ...draftState.bonusItems.map((item) => ensureItemSaved("BONUS", item.judul)),
      ...draftState.potonganItems.map((item) => ensureItemSaved("POTONGAN", item.judul)),
    ];
    void Promise.all(persist).finally(() => {
      saveInputSalary(selectedSnapshot.gajiId, draftState);
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{selectedSnapshot?.nama}</span>
            <CompanyBadge lokasi={selectedSnapshot?.lokasiDefault} />
            <span className="text-muted-foreground font-normal">
              - {selectedSnapshot?.divisi} - {formatPeriod(startDate, endDate)}
            </span>
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Bonus</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEditSalary}
                  className="h-8 text-xs gap-1.5 text-zinc-700 border-zinc-300 hover:bg-zinc-100"
                  onClick={handleResetBonus}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Bonus
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul Bonus</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead className="w-[140px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftState.bonusItems.map((item, index) => (
                      <TableRow key={`bonus-${selectedSnapshot.gajiId}-${index}`}>
                        <TableCell>
                          <CreatableCombobox
                            options={bonusOptions}
                            value={item.judul}
                            disabled={!canEditSalary}
                            placeholder="Pilih atau ketik nama bonus..."
                            onChange={(judul) =>
                              updateDraftItem("bonusItems", index, "judul", judul)
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
                              updateDraftItem("bonusItems", index, "nominal", event.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Reset nominal bonus ini ke 0"
                              className="h-8 text-xs text-zinc-600 hover:text-amber-700 hover:bg-amber-50 gap-1 px-2"
                              disabled={!canEditSalary}
                              onClick={() => updateDraftItem("bonusItems", index, "nominal", "0")}
                            >
                              <RotateCcw className="w-3 h-3" /> Reset
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={!canEditSalary}
                              onClick={() => deleteDraftItem("bonusItems", index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canEditSalary}
                    onClick={() => addDraftItem("bonusItems")}
                    className="gap-1 text-primary border-primary/20 hover:bg-primary/5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Bonus
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEditSalary}
                    className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={handleResetBonus}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Bonus
                  </Button>
                </div>
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
                      <TableHead className="w-[80px]">Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftState.potonganItems
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
                                  updateDraftItem("potonganItems", index, "judul", judul)
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
                                  updateDraftItem("potonganItems", index, "nominal", event.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={item.isDefault || isPinjamanTerkelola || piutangKonflik}
                                onClick={() => deleteDraftItem("potonganItems", index)}
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
                  disabled={!canEditSalary}
                  onClick={() => addDraftItem("potonganItems")}
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
                            setDraftState((prev) => ({
                              ...prev,
                              bayarMingguIni: Boolean(checked),
                              nominalCicilan: Boolean(checked) ? prev.nominalCicilan : null,
                            }))
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
                              setDraftState((prev) => ({ ...prev, nominalCicilan: null }));
                              return;
                            }
                            setDraftState((prev) => ({
                              ...prev,
                              nominalCicilan: Math.min(Math.max(0, Number(digits)), sisaSaldoPiutang),
                            }));
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
                            setDraftState((prev) => ({
                              ...prev,
                              pakaiUangPribadi: Boolean(checked),
                            }))
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Pembulatan Gaji (Take-Home Pay)</span>
                  {calcLive.gajiBersih !== calcLive.gajiBersihSebelumBulat && (
                    <Badge variant="outline" className="text-xs font-normal border-amber-300 bg-amber-50 text-amber-900">
                      dibulatkan dari {formatCurrency(calcLive.gajiBersihSebelumBulat)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Nominal Pembulatan Gaji
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      disabled={!canEditSalary}
                      placeholder={calcLive.gajiBersihSebelumBulat.toString()}
                      value={
                        draftState.manualGajiBersih != null
                          ? draftState.manualGajiBersih.toLocaleString("id-ID")
                          : ""
                      }
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        if (digits === "") {
                          setDraftState((prev) => ({ ...prev, manualGajiBersih: null }));
                        } else {
                          setDraftState((prev) => ({ ...prev, manualGajiBersih: Number(digits) }));
                        }
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Gaji sebelum pembulatan: {formatCurrency(calcLive.gajiBersihSebelumBulat)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEditSalary}
                      className="text-xs h-9 bg-zinc-50 border-zinc-300 hover:bg-zinc-100"
                      onClick={() => {
                        const autoRound = roundUpToHundred(calcLive.gajiBersihSebelumBulat);
                        setDraftState((prev) => ({ ...prev, manualGajiBersih: autoRound }));
                      }}
                    >
                      Bulatkan ke 100 ({formatCurrency(roundUpToHundred(calcLive.gajiBersihSebelumBulat))})
                    </Button>
                    {draftState.manualGajiBersih != null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!canEditSalary}
                        className="text-xs h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setDraftState((prev) => ({ ...prev, manualGajiBersih: null }));
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
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
                    {formatCurrency(calcLive.totalBonus)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Potongan</span>
                  <span>
                    {formatCurrency(calcLive.totalPotongan)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Gaji Bersih</span>
                  <span>
                    {formatCurrency(calcLive.gajiBersih)}
                  </span>
                </div>
                {draftState.sisaPiutang !== undefined &&
                  draftState.sisaPiutang !== null &&
                  draftState.sisaPiutang > 0 && (
                    <div className="flex justify-between border-t pt-2 text-muted-foreground">
                      <span>Sisa Piutang</span>
                      <span>
                        {formatCurrency(draftState.sisaPiutang)}
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
