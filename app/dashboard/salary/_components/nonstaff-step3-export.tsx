"use client";

import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/display/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { formatCurrency } from "@/lib/utils";
import { FileDown, FileBarChart2, Save } from "lucide-react";
import {
  type SnapshotRow,
  type CalculatedSnapshot,
} from "./nonstaff-salary-shared";

type NonStaffStep3Props = {
  snapshotRows: SnapshotRow[];
  calculatedForSnapshot: (row: SnapshotRow) => CalculatedSnapshot;
  divisionSummary: Array<{ divisi: string; total: number }>;
  submitting: boolean;
  handleExportSlipGabungan: () => void;
  handleExportRekapSemua: () => void;
  handleSimpanRekapan: () => void;
};

export function NonStaffStep3Export(props: NonStaffStep3Props) {
  const {
    snapshotRows,
    calculatedForSnapshot,
    divisionSummary,
    submitting,
    handleExportSlipGabungan,
    handleExportRekapSemua,
    handleSimpanRekapan,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fase 3. Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Divisi</TableHead>
                <TableHead>Hari Efektif</TableHead>
                <TableHead>Upah Harian</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Total Bonus</TableHead>
                <TableHead>Total Potongan</TableHead>
                <TableHead>Gaji Bersih</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshotRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    Belum ada data untuk export.
                  </TableCell>
                </TableRow>
              ) : (
                snapshotRows.map((row) => {
                  const calc = calculatedForSnapshot(row);
                  return (
                    <TableRow key={`rekap-${row.gajiId}`}>
                      <TableCell>{row.nama}</TableCell>
                      <TableCell>{row.divisi}</TableCell>
                      <TableCell>{row.hariEfektif}</TableCell>
                      <TableCell>
                        {formatCurrency(row.upahHarian)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(row.gajiPokok)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(calc.totalBonus)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(calc.totalPotongan)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(calc.gajiBersih)}
                      </TableCell>
                      <TableCell>
                        {row.statusPembayaran === "Tidak Ada Absensi" ? (
                          <Badge className="border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.22)] border-dashed border">
                            Tidak Ada Absensi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-500 bg-zinc-100/50">
                            Belum Dibayar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {divisionSummary.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Belum ada summary divisi.
              </CardContent>
            </Card>
          ) : (
            divisionSummary.map((item) => (
              <Card key={item.divisi}>
                <CardContent className="space-y-1 pt-6">
                  <p className="text-sm font-semibold">{item.divisi}</p>
                  <p className="text-sm">
                    Total:{" "}
                    <span className="font-semibold">
                      {formatCurrency(item.total)}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
          <Button
            onClick={handleExportSlipGabungan}
            disabled={submitting || snapshotRows.length === 0}
            className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            <FileDown className="w-4 h-4" />
            Export Slip Gabungan (PDF)
          </Button>
          <Button
            variant="outline"
            onClick={handleExportRekapSemua}
            disabled={submitting || snapshotRows.length === 0}
            className="gap-2"
          >
            <FileBarChart2 className="w-4 h-4" />
            Export Rekap Semua (PDF)
          </Button>
          <div className="sm:ml-auto">
            <Button
              onClick={handleSimpanRekapan}
              disabled={submitting || snapshotRows.length === 0}
              className="w-full gap-2 bg-zinc-700 hover:bg-zinc-800 text-white"
            >
              <Save className="w-4 h-4" />
              Simpan Rekapan &amp; Set Terbayar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
