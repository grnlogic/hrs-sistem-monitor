"use client";

import React, { useMemo } from "react";
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
import { FileDown, FileBarChart2, Save, Edit3 } from "lucide-react";
import {
  type SnapshotRow,
  type CalculatedSnapshot,
  type InputState,
  toNumber,
} from "./nonstaff-salary-shared";

type NonStaffStep3Props = {
  snapshotRows: SnapshotRow[];
  calculatedForSnapshot: (row: SnapshotRow) => CalculatedSnapshot;
  divisionSummary: Array<{ divisi: string; total: number }>;
  submitting: boolean;
  handleExportSlipGabungan: () => void;
  handleExportRekapSemua: () => void;
  handleSimpanRekapan: () => void;
  signatures: { diketahuiOleh: string; dibuatOleh: string; catatan: string };
  onEditSignatures: () => void;
  inputsBySalaryId: Record<string, InputState>;
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
    signatures,
    onEditSignatures,
    inputsBySalaryId,
  } = props;

  const alreadyPaid = useMemo(() => {
    return (
      snapshotRows.length > 0 &&
      snapshotRows.every(
        (r) => (r.statusPembayaran || "").toLowerCase() === "dibayar"
      )
    );
  }, [snapshotRows]);

  // 1. Collect unique blanko columns across all rows where nominal > 0
  const activeBonusCols = useMemo(() => {
    const cols = new Set<string>();
    snapshotRows.forEach((row) => {
      const input = inputsBySalaryId[row.gajiId];
      if (input?.bonusItems) {
        input.bonusItems.forEach((item) => {
          if (item.judul.trim() && toNumber(item.nominal) > 0) {
            cols.add(item.judul.trim());
          }
        });
      }
    });
    return Array.from(cols);
  }, [snapshotRows, inputsBySalaryId]);

  const activePotonganCols = useMemo(() => {
    const cols = new Set<string>();
    snapshotRows.forEach((row) => {
      const input = inputsBySalaryId[row.gajiId];
      if (input?.potonganItems) {
        input.potonganItems.forEach((item) => {
          if (item.judul.trim() && toNumber(item.nominal) > 0) {
            cols.add(item.judul.trim());
          }
        });
      }
    });
    return Array.from(cols);
  }, [snapshotRows, inputsBySalaryId]);

  // 2. Compute column totals
  const totals = useMemo(() => {
    let totalHariEfektif = 0;
    let totalUpahHarian = 0;
    let totalGajiPokok = 0;
    const totalBonusCols = new Array(activeBonusCols.length).fill(0);
    const totalPotonganCols = new Array(activePotonganCols.length).fill(0);
    let totalGajiBersih = 0;

    snapshotRows.forEach((row) => {
      const calc = calculatedForSnapshot(row);
      const input = inputsBySalaryId[row.gajiId] || { bonusItems: [], potonganItems: [] };

      totalHariEfektif += row.hariEfektif;
      totalUpahHarian += row.upahHarian;
      totalGajiPokok += row.gajiPokok;
      totalGajiBersih += calc.gajiBersih;

      activeBonusCols.forEach((col, idx) => {
        const item = input.bonusItems?.find((b) => b.judul.trim() === col);
        totalBonusCols[idx] += item ? toNumber(item.nominal) : 0;
      });

      activePotonganCols.forEach((col, idx) => {
        const item = input.potonganItems?.find((p) => p.judul.trim() === col);
        totalPotonganCols[idx] += item ? toNumber(item.nominal) : 0;
      });
    });

    return {
      totalHariEfektif,
      totalUpahHarian,
      totalGajiPokok,
      totalBonusCols,
      totalPotonganCols,
      totalGajiBersih,
    };
  }, [snapshotRows, calculatedForSnapshot, inputsBySalaryId, activeBonusCols, activePotonganCols]);

  return (
    <Card className="rounded-2xl border-zinc-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-zinc-800 font-bold">Fase 3. Export & Finalisasi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-zinc-100">
          <Table>
            <TableHeader className="bg-zinc-50/70">
              <TableRow>
                <TableHead className="font-semibold text-zinc-700">Nama</TableHead>
                <TableHead className="font-semibold text-zinc-700">Divisi</TableHead>
                <TableHead className="font-semibold text-zinc-700 text-center">Hari Efektif</TableHead>
                <TableHead className="font-semibold text-zinc-700 text-right">Upah Harian</TableHead>
                <TableHead className="font-semibold text-zinc-700 text-right">Gaji Pokok</TableHead>
                {activeBonusCols.map((col) => (
                  <TableHead key={`head-b-${col}`} className="font-semibold text-zinc-700 text-right">
                    {col} (Bonus)
                  </TableHead>
                ))}
                {activePotonganCols.map((col) => (
                  <TableHead key={`head-p-${col}`} className="font-semibold text-zinc-700 text-right">
                    {col} (Potongan)
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-zinc-700 text-right">Gaji Bersih</TableHead>
                <TableHead className="font-semibold text-zinc-700 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshotRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9 + activeBonusCols.length + activePotonganCols.length} className="text-center text-zinc-500 py-8">
                    Belum ada data untuk export.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {snapshotRows.map((row) => {
                    const calc = calculatedForSnapshot(row);
                    const input = inputsBySalaryId[row.gajiId] || { bonusItems: [], potonganItems: [] };

                    return (
                      <TableRow key={`rekap-${row.gajiId}`} className="hover:bg-zinc-50/50">
                        <TableCell className="font-medium text-zinc-800">{row.nama}</TableCell>
                        <TableCell>{row.divisi}</TableCell>
                        <TableCell className="text-center">{row.hariEfektif}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.upahHarian)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.gajiPokok)}</TableCell>

                        {/* Render active dynamic bonus cells */}
                        {activeBonusCols.map((col) => {
                          const item = input.bonusItems?.find((b) => b.judul.trim() === col);
                          const nominal = item ? toNumber(item.nominal) : 0;
                          return (
                            <TableCell key={`cell-b-${row.gajiId}-${col}`} className="text-right text-emerald-600">
                              {nominal > 0 ? formatCurrency(nominal) : "-"}
                            </TableCell>
                          );
                        })}

                        {/* Render active dynamic potongan cells */}
                        {activePotonganCols.map((col) => {
                          const item = input.potonganItems?.find((p) => p.judul.trim() === col);
                          const nominal = item ? toNumber(item.nominal) : 0;
                          return (
                            <TableCell key={`cell-p-${row.gajiId}-${col}`} className="text-right text-rose-600">
                              {nominal > 0 ? formatCurrency(nominal) : "-"}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-right font-bold text-zinc-950">
                          <div className="flex items-center justify-end gap-2">
                            {formatCurrency(calc.gajiBersih)}
                            {calc.gajiBersih !== calc.gajiBersihSebelumBulat && (
                              <Badge
                                variant="outline"
                                className="whitespace-nowrap text-[9px] font-normal text-muted-foreground px-1 py-0"
                              >
                                dibulatkan
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {row.statusPembayaran === "Tidak Ada Absensi" ? (
                            <Badge className="border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.22)] border-dashed border">
                              Tidak Ada Absensi
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={`text-zinc-500 bg-zinc-100/50 ${row.statusPembayaran === 'Dibayar' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                              {row.statusPembayaran || "Belum Dibayar"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <TableRow className="bg-zinc-50/70 font-bold border-t-2 border-zinc-200">
                    <TableCell colSpan={2} className="text-zinc-900 font-bold">Total</TableCell>
                    <TableCell className="text-center text-zinc-900 font-bold">{totals.totalHariEfektif}</TableCell>
                    <TableCell className="text-right text-zinc-900 font-bold">{formatCurrency(totals.totalUpahHarian)}</TableCell>
                    <TableCell className="text-right text-zinc-900 font-bold">{formatCurrency(totals.totalGajiPokok)}</TableCell>

                    {activeBonusCols.map((col, idx) => (
                      <TableCell key={`total-b-${col}`} className="text-right text-emerald-700 font-bold">
                        {formatCurrency(totals.totalBonusCols[idx])}
                      </TableCell>
                    ))}

                    {activePotonganCols.map((col, idx) => (
                      <TableCell key={`total-p-${col}`} className="text-right text-rose-700 font-bold">
                        {formatCurrency(totals.totalPotonganCols[idx])}
                      </TableCell>
                    ))}

                    <TableCell className="text-right text-zinc-950 font-bold">{formatCurrency(totals.totalGajiBersih)}</TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Division Summary */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {divisionSummary.length === 0 ? (
            <Card className="rounded-xl border-zinc-100 shadow-sm">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Belum ada summary divisi.
              </CardContent>
            </Card>
          ) : (
            divisionSummary.map((item) => (
              <Card key={item.divisi} className="rounded-xl border-zinc-100 shadow-sm bg-zinc-50/20">
                <CardContent className="space-y-1 pt-6">
                  <p className="text-xs text-muted-foreground font-semibold">{item.divisi}</p>
                  <p className="text-lg font-bold text-zinc-800">
                    {formatCurrency(item.total)}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Signatures & Notes Panel */}
        <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/30 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-sm font-bold text-zinc-800">
              Otorisasi &amp; Catatan Rekapitulasi
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditSignatures}
              className="text-xs h-8 rounded-lg border-zinc-200 gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Ubah Tanda Tangan
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Dibuat Oleh</p>
              <p className="font-semibold text-zinc-800">{signatures.dibuatOleh}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Diketahui Oleh</p>
              <p className="font-semibold text-zinc-800">{signatures.diketahuiOleh}</p>
            </div>
          </div>
          {signatures.catatan && (
            <div className="pt-2 border-t text-sm">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Catatan</p>
              <p className="text-zinc-700 whitespace-pre-line bg-white p-3 rounded-lg border border-zinc-100 text-xs italic">
                "{signatures.catatan}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
          <Button
            onClick={handleExportSlipGabungan}
            disabled={submitting || snapshotRows.length === 0}
            className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11"
          >
            <FileDown className="w-4 h-4" />
            Export Slip Gabungan (PDF)
          </Button>
          <Button
            variant="outline"
            onClick={handleExportRekapSemua}
            disabled={submitting || snapshotRows.length === 0}
            className="gap-2 rounded-xl h-11 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          >
            <FileBarChart2 className="w-4 h-4" />
            Export Rekap Semua (PDF)
          </Button>
          <div className="sm:ml-auto">
            <Button
              onClick={handleSimpanRekapan}
              disabled={submitting || snapshotRows.length === 0 || alreadyPaid}
              className="w-full gap-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-xl h-11"
            >
              <Save className="w-4 h-4" />
              {alreadyPaid ? "Rekapan Sudah Terbayar" : "Simpan Rekapan & Set Terbayar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
