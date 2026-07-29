"use client";

import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import {
  type SalaryRow,
  type CalculatedRow,
  toNumber,
} from "./salary-stepper-shared";

type StaffStep2Props = {
  generatedRows: SalaryRow[];
  inputDoneBySalaryId: Record<string, boolean>;
  calculatedRow: (row: SalaryRow) => CalculatedRow;
  openInputDialog: (row: SalaryRow) => void;
  phase2ReadOnly: boolean;
  canPhase2Action: boolean;
  allInputDone: boolean;
  setActiveStep: (step: 2 | 3) => void;
  onMarkAllDone: () => void;
};

export function StaffStep2BonusPotongan(props: StaffStep2Props) {
  const {
    generatedRows,
    inputDoneBySalaryId,
    calculatedRow,
    openInputDialog,
    phase2ReadOnly,
    canPhase2Action,
    allInputDone,
    setActiveStep,
    onMarkAllDone,
  } = props;

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">
        Fase 2. Input Bonus &amp; Potongan
      </h2>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Gaji Pokok</TableHead>
              <TableHead>Status Input</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  Belum ada data generate untuk periode ini.
                </TableCell>
              </TableRow>
            )}
            {generatedRows.map((row) => {
              const calc = calculatedRow(row);
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell>{row.divisi}</TableCell>
                  <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                  <TableCell>
                    {inputDoneBySalaryId[row.id] ? (
                      <Badge>Selesai</Badge>
                    ) : (
                      <Badge variant="secondary">Belum</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInputDialog(row)}
                      className="gap-2"
                    >
                      {phase2ReadOnly ? "Lihat" : "Input"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {allInputDone ? (
        <div className="mt-4 flex justify-end pt-4 border-t">
          <Button
            onClick={() => setActiveStep(3)}
            disabled={!canPhase2Action}
            size="lg"
            className="w-full md:w-auto gap-2"
          >
            Lanjut ke Export{" "}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        generatedRows.length > 0 && (
          <div className="mt-4 flex justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onMarkAllDone}
              disabled={!canPhase2Action}
              size="lg"
              className="w-full md:w-auto"
            >
              Tandai Semua Selesai (Tanpa Penyesuaian)
            </Button>
          </div>
        )
      )}
    </section>
  );
}
