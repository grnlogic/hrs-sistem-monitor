"use client";

import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { formatCurrency } from "@/lib/utils";
import { FileDown, FileBarChart2 } from "lucide-react";
import {
  type PageType,
  type SalaryRow,
  type CalculatedRow,
} from "./salary-stepper-shared";

type StaffStep3Props = {
  pageType: PageType;
  generatedRows: SalaryRow[];
  calculatedRow: (row: SalaryRow) => CalculatedRow;
  canPhase3Action: boolean;
  exportSlipsPerKaryawan: () => void;
  exportRekapSemua: () => void;
};

export function StaffStep3Export(props: StaffStep3Props) {
  const {
    pageType,
    generatedRows,
    calculatedRow,
    canPhase3Action,
    exportSlipsPerKaryawan,
    exportRekapSemua,
  } = props;

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Fase 3. Export PDF</h2>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              {pageType === "nonstaff" && <TableHead>Hari Efektif</TableHead>}
              {pageType === "nonstaff" && <TableHead>Upah Harian</TableHead>}
              <TableHead>Gaji Pokok</TableHead>
              <TableHead>Total Bonus</TableHead>
              <TableHead>Total Potongan</TableHead>
              <TableHead>Gaji Bersih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={pageType === "staff" ? 6 : 8}>
                  Belum ada data untuk export.
                </TableCell>
              </TableRow>
            )}
            {generatedRows.map((row) => {
              const calc = calculatedRow(row);
              return (
                <TableRow key={`rekap-${row.id}`}>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell>{row.divisi}</TableCell>
                  {pageType === "nonstaff" && (
                    <TableCell>{calc.hariEfektif ?? "-"}</TableCell>
                  )}
                  {pageType === "nonstaff" && (
                    <TableCell>
                      {calc.upahHarian
                        ? formatCurrency(calc.upahHarian)
                        : "-"}
                    </TableCell>
                  )}
                  <TableCell>{formatCurrency(calc.gajiPokok)}</TableCell>
                  <TableCell>{formatCurrency(calc.totalBonus)}</TableCell>
                  <TableCell>
                    {formatCurrency(calc.totalPotongan)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {formatCurrency(calc.gajiBersih)}
                      {calc.gajiBersih !== calc.gajiBersihSebelumBulat && (
                        <Badge
                          variant="outline"
                          className="whitespace-nowrap text-[10px] font-normal text-muted-foreground"
                        >
                          dibulatkan dari {formatCurrency(calc.gajiBersihSebelumBulat)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button
          variant="default"
          disabled={!canPhase3Action || generatedRows.length === 0}
          onClick={exportSlipsPerKaryawan}
          className="gap-2"
        >
          <FileDown className="w-4 h-4" />
          Export Slip Gabungan (15 per halaman)
        </Button>
        <Button
          variant="outline"
          disabled={!canPhase3Action || generatedRows.length === 0}
          onClick={exportRekapSemua}
          className="gap-2"
        >
          <FileBarChart2 className="w-4 h-4" />
          Export Rekap Semua
        </Button>
      </div>
    </section>
  );
}
