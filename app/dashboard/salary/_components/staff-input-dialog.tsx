"use client";

import * as React from "react";
import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
import { CreatableCombobox } from "@/components/ui/form/creatable-combobox";
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
import { calcGajiBersih } from "@/lib/salary-utils";
import { Plus, Trash2, Save, RotateCcw, Settings } from "lucide-react";
import { useMasterGajiItems } from "./master-gaji-items";
import { NonStaffMasterDataFixDialog } from "./nonstaff-master-datafix-dialog";
import {
  type PageType,
  type SalaryRow,
  type AttendanceSummary,
  type CalculatedRow,
  type SalaryInputState,
  buildDefaultInputState,
  toNumber,
} from "./salary-stepper-shared";

type StaffInputDialogProps = {
  pageType: PageType;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedSalary: SalaryRow | undefined;
  periodLabel: string;
  inputsBySalaryId: Record<string, SalaryInputState>;
  loadingDetail?: boolean;
  masterItemsVersion?: number;
  attendanceFor: (karyawanId: string) => AttendanceSummary;
  calculatedRow: (row: SalaryRow) => CalculatedRow;
  phase2ReadOnly: boolean;
  canPhase2Action: boolean;
  submitting: boolean;
  saveInputSalary: (salaryId: string, finalState: SalaryInputState) => void;
};

function emptyStaffInputState(): SalaryInputState {
  return {
    bonusItems: [],
    potonganItems: [],
    bonusPKB: null,
    sisaPiutang: null,
  };
}

function cloneInputState(
  state: SalaryInputState | undefined,
  pageType: PageType
): SalaryInputState {
  const source =
    state ||
    (pageType === "staff" ? emptyStaffInputState() : buildDefaultInputState());
  return {
    bonusItems: source.bonusItems.map((item) => ({ ...item })),
    potonganItems: source.potonganItems.map((item) => ({ ...item })),
    bonusPKB: source.bonusPKB ?? null,
    sisaPiutang: source.sisaPiutang ?? null,
  };
}

export function StaffInputDialog(props: StaffInputDialogProps) {
  const {
    pageType,
    dialogOpen,
    setDialogOpen,
    selectedSalary,
    periodLabel,
    inputsBySalaryId,
    loadingDetail = false,
    masterItemsVersion = 0,
    attendanceFor,
    calculatedRow,
    phase2ReadOnly,
    canPhase2Action,
    submitting,
    saveInputSalary,
  } = props;

  const { bonusOptions, potonganOptions, load, refresh, ensureItemSaved } = useMasterGajiItems();
  const [dataFixOpen, setDataFixOpen] = React.useState(false);

  const [draftState, setDraftState] = React.useState<SalaryInputState>(() =>
    pageType === "staff" ? emptyStaffInputState() : buildDefaultInputState()
  );

  const sourceState = selectedSalary ? inputsBySalaryId[selectedSalary.id] : undefined;

  // Inisialisasi draft lokal hanya saat dialog dibuka / berpindah karyawan / detail API selesai dimuat.
  // Selama dialog terbuka, semua edit hanya mengubah draftState agar "Batal" tidak mencemari state parent.
  const syncedKeyRef = React.useRef<string>("");
  React.useEffect(() => {
    if (!dialogOpen || !selectedSalary) {
      syncedKeyRef.current = "";
      return;
    }
    const nextKey = `${selectedSalary.id}:${loadingDetail ? "loading" : "ready"}:${sourceState ? "has" : "none"}`;
    if (!loadingDetail && syncedKeyRef.current !== nextKey) {
      setDraftState(cloneInputState(sourceState, pageType));
      syncedKeyRef.current = nextKey;
    }
  }, [dialogOpen, selectedSalary, loadingDetail, sourceState, pageType]);

  React.useEffect(() => {
    if (dialogOpen) {
      void load();
    }
  }, [dialogOpen, load, masterItemsVersion]);

  const updateDraftItem = (
    kind: "bonusItems" | "potonganItems",
    index: number,
    key: "judul" | "nominal",
    value: string
  ) => {
    setDraftState((prev) => {
      const list = [...prev[kind]];
      const current = list[index];
      if (!current) return prev;
      list[index] =
        key === "judul"
          ? { ...current, judul: value }
          : { ...current, nominal: Math.max(0, toNumber(value)) };
      return { ...prev, [kind]: list };
    });
  };

  const selectDraftOption = (
    kind: "bonusItems" | "potonganItems",
    index: number,
    option: { label: string; nominalDefault?: number | null }
  ) => {
    setDraftState((prev) => {
      const list = [...prev[kind]];
      const current = list[index];
      if (!current) return prev;
      list[index] = {
        ...current,
        judul: option.label,
        nominal:
          option.nominalDefault != null
            ? Math.max(0, Number(option.nominalDefault))
            : current.nominal,
      };
      return { ...prev, [kind]: list };
    });
  };

  const addDraftItem = (kind: "bonusItems" | "potonganItems") => {
    setDraftState((prev) => ({
      ...prev,
      [kind]: [...prev[kind], { judul: "", nominal: 0 }],
    }));
  };

  const deleteDraftItem = (
    kind: "bonusItems" | "potonganItems",
    index: number
  ) => {
    setDraftState((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((_, i) => i !== index),
    }));
  };

  const handleResetBonus = () => {
    setDraftState((prev) => ({
      ...prev,
      bonusItems: [],
    }));
  };

  const handleSave = () => {
    if (!selectedSalary) return;
    const persist = [
      ...draftState.bonusItems.map((item) => ensureItemSaved("BONUS", item.judul)),
      ...draftState.potonganItems.map((item) => ensureItemSaved("POTONGAN", item.judul)),
    ];
    void Promise.all(persist).finally(() =>
      saveInputSalary(selectedSalary.id, cloneInputState(draftState, pageType))
    );
  };

  const previewCalc = React.useMemo(() => {
    if (!selectedSalary) {
      return {
        gajiPokok: 0,
        totalBonus: 0,
        totalPotongan: 0,
        gajiBersih: 0,
        gajiBersihSebelumBulat: 0,
      };
    }
    const base = calculatedRow(selectedSalary);
    const totalBonus = draftState.bonusItems.reduce(
      (sum, item) => sum + toNumber(item.nominal),
      0
    );
    const totalPotongan = draftState.potonganItems.reduce(
      (sum, item) => sum + toNumber(item.nominal),
      0
    );
    const totalTunjangan = base.tunjanganItems.reduce(
      (sum, item) => sum + toNumber(item.nominal),
      0
    );
    const { gajiBersih, gajiBersihSebelumBulat } = calcGajiBersih(
      base.gajiPokok + totalTunjangan + totalBonus,
      totalPotongan
    );
    return {
      gajiPokok: base.gajiPokok,
      totalBonus,
      totalPotongan,
      gajiBersih,
      gajiBersihSebelumBulat,
    };
  }, [selectedSalary, calculatedRow, draftState]);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSalary?.nama} - {selectedSalary?.divisi} - {periodLabel}
            </DialogTitle>
            <DialogDescription>
              Pilih komponen dari Data Fix atau ketik nama komponen baru. Perubahan hanya tersimpan saat menekan Simpan.
            </DialogDescription>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-4">
              {pageType === "nonstaff" && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Ringkasan Kehadiran</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                    <p>
                      Hari Hadir:{" "}
                      <span className="font-semibold">
                        {attendanceFor(selectedSalary.karyawanId).hadir}
                      </span>
                    </p>
                    <p>
                      Setengah Hari:{" "}
                      <span className="font-semibold">
                        {attendanceFor(selectedSalary.karyawanId).setengahHari}
                      </span>
                    </p>
                    <p>
                      Lembur:{" "}
                      <span className="font-semibold">
                        {attendanceFor(selectedSalary.karyawanId).lembur}
                      </span>
                    </p>
                    <p>
                      Hari Efektif:{" "}
                      <span className="font-semibold">
                        {calculatedRow(selectedSalary).hariEfektif ?? 0}
                      </span>
                    </p>
                    <p>
                      Upah Harian:{" "}
                      <span className="font-semibold">
                        {formatCurrency(
                          calculatedRow(selectedSalary).upahHarian || 0
                        )}
                      </span>
                    </p>
                    <p>
                      Gaji Pokok:{" "}
                      <span className="font-semibold">
                        {formatCurrency(previewCalc.gajiPokok)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Bonus</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={phase2ReadOnly}
                      onClick={() => setDataFixOpen(true)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Settings className="h-3.5 w-3.5" /> Setting Data Fix
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={phase2ReadOnly || draftState.bonusItems.length === 0}
                      onClick={handleResetBonus}
                      className="h-8 gap-1 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset Bonus
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftState.bonusItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-4 text-center text-xs text-muted-foreground">
                          Belum ada komponen bonus. Klik &quot;+ Tambah Bonus&quot; untuk menambahkan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      draftState.bonusItems.map((item, index) => (
                        <TableRow key={`bonus-${selectedSalary.id}-${index}`}>
                          <TableCell>
                            <CreatableCombobox
                              options={bonusOptions}
                              value={item.judul}
                              disabled={phase2ReadOnly || loadingDetail}
                              placeholder="Pilih atau ketik nama bonus..."
                              onSelectOption={(opt) =>
                                selectDraftOption("bonusItems", index, opt)
                              }
                              onChange={(judul) =>
                                updateDraftItem("bonusItems", index, "judul", judul)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              disabled={phase2ReadOnly || loadingDetail}
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={item.nominal === 0 ? "" : String(item.nominal)}
                              onChange={(e) =>
                                updateDraftItem(
                                  "bonusItems",
                                  index,
                                  "nominal",
                                  e.target.value.replace(/[^0-9]/g, "")
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={phase2ReadOnly || loadingDetail}
                              onClick={() => deleteDraftItem("bonusItems", index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={phase2ReadOnly || loadingDetail}
                  onClick={() => addDraftItem("bonusItems")}
                  className="mt-2 gap-1 text-primary border-primary/20 hover:bg-primary/5"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Bonus
                </Button>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Potongan</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftState.potonganItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-4 text-center text-xs text-muted-foreground">
                          Belum ada komponen potongan. Klik &quot;+ Tambah Potongan&quot; untuk menambahkan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      draftState.potonganItems.map((item, index) => (
                        <TableRow key={`potongan-${selectedSalary.id}-${index}`}>
                          <TableCell>
                            <CreatableCombobox
                              options={potonganOptions}
                              value={item.judul}
                              disabled={phase2ReadOnly || loadingDetail}
                              placeholder="Pilih atau ketik nama potongan..."
                              onSelectOption={(opt) =>
                                selectDraftOption("potonganItems", index, opt)
                              }
                              onChange={(judul) =>
                                updateDraftItem("potonganItems", index, "judul", judul)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              disabled={phase2ReadOnly || loadingDetail}
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={item.nominal === 0 ? "" : String(item.nominal)}
                              onChange={(e) =>
                                updateDraftItem(
                                  "potonganItems",
                                  index,
                                  "nominal",
                                  e.target.value.replace(/[^0-9]/g, "")
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={phase2ReadOnly || loadingDetail}
                              onClick={() => deleteDraftItem("potonganItems", index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={phase2ReadOnly || loadingDetail}
                  onClick={() => addDraftItem("potonganItems")}
                  className="mt-2 gap-1 text-primary border-primary/20 hover:bg-primary/5"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Potongan
                </Button>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Sisa Piutang (Informasional)</p>
                <Input
                  disabled={phase2ReadOnly || loadingDetail}
                  type="number"
                  min={0}
                  placeholder="Masukkan sisa piutang (kosongkan jika tidak ada)"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={
                    draftState.sisaPiutang === undefined ||
                    draftState.sisaPiutang === null
                      ? ""
                      : draftState.sisaPiutang
                  }
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    setDraftState((prev) => ({ ...prev, sisaPiutang: val }));
                  }}
                />
              </div>

              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Preview Slip</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Gaji Pokok</span>
                    <span>{formatCurrency(previewCalc.gajiPokok)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bonus</span>
                    <span>{formatCurrency(previewCalc.totalBonus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Potongan</span>
                    <span>{formatCurrency(previewCalc.totalPotongan)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Gaji Bersih</span>
                    <span>{formatCurrency(previewCalc.gajiBersih)}</span>
                  </div>
                  {draftState.sisaPiutang !== undefined &&
                    draftState.sisaPiutang !== null &&
                    draftState.sisaPiutang > 0 && (
                      <div className="flex justify-between border-t pt-2 text-muted-foreground">
                        <span>Sisa Piutang</span>
                        <span>{formatCurrency(draftState.sisaPiutang)}</span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t sm:justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canPhase2Action || submitting || loadingDetail}
              className="gap-2 w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{" "}
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NonStaffMasterDataFixDialog
        isOpen={dataFixOpen}
        onClose={() => setDataFixOpen(false)}
        onDataUpdated={() => {
          void refresh();
        }}
      />
    </>
  );
}
