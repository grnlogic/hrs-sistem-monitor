"use client";

import * as React from "react";
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
import { ArrowRight, Settings } from "lucide-react";
import { NonStaffMasterDataFixDialog } from "./nonstaff-master-datafix-dialog";
import {
  type SalaryRow,
  type CalculatedRow,
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
  onDataFixUpdated?: () => void;
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
    onDataFixUpdated,
  } = props;

  const [dataFixOpen, setDataFixOpen] = React.useState(false);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">
          Fase 2. Input Bonus &amp; Potongan
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDataFixOpen(true)}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Settings className="h-4 w-4" />
          Setting Data Fix
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Gaji Pokok</TableHead>
              <TableHead>Total Bonus</TableHead>
              <TableHead>Total Potongan</TableHead>
              <TableHead>Gaji Bersih</TableHead>
              <TableHead>Status Input</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  Belum ada data generate untuk periode ini.
                </TableCell>
              </TableRow>
            )}
            {generatedRows.map((row) => {
              const calc = calculatedRow(row);
              const isPaid = (row.statusPembayaran || "").toLowerCase() === "dibayar";
              const readOnly = phase2ReadOnly || isPaid;

              return (
                <TableRow key={row.id}>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell>{row.divisi}</TableCell>
                  <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                  <TableCell>{formatCurrency(calc.totalBonus)}</TableCell>
                  <TableCell>{formatCurrency(calc.totalPotongan)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(calc.gajiBersih)}
                  </TableCell>
                  <TableCell>
                    {isPaid ? (
                      <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Sudah Dibayar
                      </Badge>
                    ) : inputDoneBySalaryId[row.id] ? (
                      <Badge>Selesai</Badge>
                    ) : (
                      <Badge variant="secondary">Belum</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isPaid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="gap-2 opacity-60 cursor-not-allowed"
                        title="Gaji sudah dibayar, data bonus/potongan tidak dapat diubah"
                      >
                        Sudah Dibayar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInputDialog(row)}
                        className="gap-2"
                      >
                        {readOnly ? "Lihat" : "Input"}
                      </Button>
                    )}
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

      <NonStaffMasterDataFixDialog
        isOpen={dataFixOpen}
        onClose={() => setDataFixOpen(false)}
        onDataUpdated={onDataFixUpdated}
      />
    </section>
  );
}
