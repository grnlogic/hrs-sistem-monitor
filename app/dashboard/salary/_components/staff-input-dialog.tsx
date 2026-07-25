"use client";

import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
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
import { Save } from "lucide-react";
import {
  type PageType,
  type SalaryRow,
  type AttendanceSummary,
  type CalculatedRow,
  type SalaryInputState,
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
    phase2ReadOnly,
    canPhase2Action,
    submitting,
    saveInputSalary,
  } = props;

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    inputsBySalaryId[selectedSalary.id]?.bonusItems || []
                  ).map((item, index) => (
                    <TableRow key={`bonus-${index}`}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {item.judul}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Input
                          disabled={phase2ReadOnly}
                          type="number"
                          min={0}
                          value={item.nominal}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Potongan</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Komponen</TableHead>
                    <TableHead>Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    inputsBySalaryId[selectedSalary.id]?.potonganItems || []
                  ).map((item, index) => (
                    <TableRow key={`potongan-${index}`}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {item.judul}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Input
                          disabled={phase2ReadOnly}
                          type="number"
                          min={0}
                          value={item.nominal}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t sm:justify-between items-center">
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={saveInputSalary}
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
