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
import { Plus, Trash2, Save } from "lucide-react";
import { useMasterGajiItems } from "./master-gaji-items";
import {
  type PageType,
  type SalaryRow,
  type AttendanceSummary,
  type CalculatedRow,
  type SalaryInputState,
  AUTO_BONUS_JUDUL,
} from "./salary-stepper-shared";

type StaffInputDialogProps = {
  pageType: PageType;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  selectedSalary: SalaryRow | undefined;
  periodLabel: string;
  inputsBySalaryId: Record<string, SalaryInputState>;
  attendanceFor: (karyawanId: string) => AttendanceSummary;
  calculatedRow: (row: SalaryRow) => CalculatedRow;
  updateItem: (
    salaryId: string,
    kind: "bonusItems" | "potonganItems",
    index: number,
    key: "judul" | "nominal",
    value: string
  ) => void;
  addItem: (salaryId: string, kind: "bonusItems" | "potonganItems") => void;
  deleteItem: (
    salaryId: string,
    kind: "bonusItems" | "potonganItems",
    index: number
  ) => void;
  addKikipingItem: (salaryId: string) => void;
  updateSisaPiutang: (salaryId: string, value: number | null) => void;
  phase2ReadOnly: boolean;
  canPhase2Action: boolean;
  submitting: boolean;
  saveInputSalary: () => void;
};

export function StaffInputDialog(props: StaffInputDialogProps) {
  const {
    pageType,
    dialogOpen,
    setDialogOpen,
    selectedSalary,
    periodLabel,
    inputsBySalaryId,
    attendanceFor,
    calculatedRow,
    updateItem,
    addItem,
    deleteItem,
    addKikipingItem,
    updateSisaPiutang,
    phase2ReadOnly,
    canPhase2Action,
    submitting,
    saveInputSalary,
  } = props;

  const { bonusOptions, potonganOptions, load, ensureItemSaved } = useMasterGajiItems();

  React.useEffect(() => {
    if (dialogOpen) load();
  }, [dialogOpen, load]);

  // Auto-fill bonus "kikiping" (10.000): tambahkan 1 baris bila karyawan ini
  // belum punya baris kikiping di periode ini. Idempotent — buka-tutup dialog
  // berkali-kali tetap hanya 1 baris (cek by nama). Baris bisa diedit/dihapus.
  React.useEffect(() => {
    if (!dialogOpen || !selectedSalary) return;
    const salaryId = selectedSalary.id;
    const bonusList = inputsBySalaryId[salaryId]?.bonusItems || [];
    const hasKikiping = bonusList.some(
      (item) => item.judul.toLowerCase() === AUTO_BONUS_JUDUL
    );
    if (!hasKikiping) {
      addKikipingItem(salaryId);
      void ensureItemSaved("BONUS", AUTO_BONUS_JUDUL);
    }
  }, [dialogOpen, selectedSalary, inputsBySalaryId, addKikipingItem, ensureItemSaved]);

  const handleSave = () => {
    const state = selectedSalary ? inputsBySalaryId[selectedSalary.id] : undefined;
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {selectedSalary?.nama} - {selectedSalary?.divisi} - {periodLabel}
          </DialogTitle>
          <DialogDescription>Input bonus dan potongan.</DialogDescription>
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
                      {formatCurrency(calculatedRow(selectedSalary).gajiPokok)}
                    </span>
                  </p>
                  {(selectedSalary.divisi || "")
                    .toLowerCase()
                    .includes("blending") && (
                    <p>
                      Tunjangan Blending:{" "}
                      <span className="font-semibold">
                        {formatCurrency(
                          calculatedRow(selectedSalary).tunjanganItems.reduce(
                            (sum, item) => sum + item.nominal,
                            0
                          )
                        )}
                      </span>
                    </p>
                  )}
                </div>
                <div className="mt-2">
                  <label className="mb-1 block text-sm text-foreground">
                    Bonus PKB (Segera Hadir)
                  </label>
                  <Input disabled value="-" />
                </div>
              </div>
            )}

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Bonus</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Komponen</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Hapus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    inputsBySalaryId[selectedSalary.id]?.bonusItems || []
                  ).map((item, index) => (
                    <TableRow key={`bonus-${selectedSalary.id}-${index}`}>
                      <TableCell>
                        <CreatableCombobox
                          options={bonusOptions}
                          value={item.judul}
                          disabled={phase2ReadOnly}
                          placeholder="Pilih atau ketik nama bonus..."
                          onChange={(judul) =>
                            updateItem(
                              selectedSalary.id,
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
                          disabled={phase2ReadOnly}
                          type="number"
                          min={0}
                          value={item.nominal}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            updateItem(
                              selectedSalary.id,
                              "bonusItems",
                              index,
                              "nominal",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={phase2ReadOnly}
                          onClick={() =>
                            deleteItem(selectedSalary.id, "bonusItems", index)
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
                disabled={phase2ReadOnly}
                onClick={() => addItem(selectedSalary.id, "bonusItems")}
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
                  {(
                    inputsBySalaryId[selectedSalary.id]?.potonganItems || []
                  ).map((item, index) => (
                    <TableRow key={`potongan-${selectedSalary.id}-${index}`}>
                      <TableCell>
                        <CreatableCombobox
                          options={potonganOptions}
                          value={item.judul}
                          disabled={phase2ReadOnly}
                          placeholder="Pilih atau ketik nama potongan..."
                          onChange={(judul) =>
                            updateItem(
                              selectedSalary.id,
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
                          disabled={phase2ReadOnly}
                          type="number"
                          min={0}
                          value={item.nominal}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            updateItem(
                              selectedSalary.id,
                              "potonganItems",
                              index,
                              "nominal",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={phase2ReadOnly}
                          onClick={() =>
                            deleteItem(selectedSalary.id, "potonganItems", index)
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
                disabled={phase2ReadOnly}
                onClick={() => addItem(selectedSalary.id, "potonganItems")}
                className="mt-2 gap-1 text-primary border-primary/20 hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Potongan
              </Button>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Sisa Piutang (Informasional)</p>
              <Input
                disabled={phase2ReadOnly}
                type="number"
                min={0}
                placeholder="Masukkan sisa piutang (kosongkan jika tidak ada)"
                onWheel={(e) => e.currentTarget.blur()}
                value={
                  inputsBySalaryId[selectedSalary.id]?.sisaPiutang === undefined ||
                  inputsBySalaryId[selectedSalary.id]?.sisaPiutang === null
                    ? ""
                    : inputsBySalaryId[selectedSalary.id].sisaPiutang ?? ""
                }
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  updateSisaPiutang(selectedSalary.id, val);
                }}
              />
            </div>

            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Preview Slip</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Gaji Pokok</span>
                  <span>
                    {formatCurrency(calculatedRow(selectedSalary).gajiPokok)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Bonus</span>
                  <span>
                    {formatCurrency(
                      calculatedRow(selectedSalary).totalBonus
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Potongan</span>
                  <span>
                    {formatCurrency(
                      calculatedRow(selectedSalary).totalPotongan
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Gaji Bersih</span>
                  <span>
                    {formatCurrency(calculatedRow(selectedSalary).gajiBersih)}
                  </span>
                </div>
                {inputsBySalaryId[selectedSalary.id]?.sisaPiutang !== undefined &&
                  inputsBySalaryId[selectedSalary.id]?.sisaPiutang !== null &&
                  inputsBySalaryId[selectedSalary.id]?.sisaPiutang! > 0 && (
                    <div className="flex justify-between border-t pt-2 text-muted-foreground">
                      <span>Sisa Piutang</span>
                      <span>
                        {formatCurrency(inputsBySalaryId[selectedSalary.id].sisaPiutang!)}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t sm:justify-between items-center">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canPhase2Action || submitting}
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
  );
}
