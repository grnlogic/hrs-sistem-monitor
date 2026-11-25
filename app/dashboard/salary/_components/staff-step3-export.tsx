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
import { FileDown, Save, Edit3 } from "lucide-react";
import {
  type PageType,
  type SalaryRow,
  type CalculatedRow,
  type SalaryInputState,
  toNumber,
} from "./salary-stepper-shared";
import type { StaffSignatures } from "./staff-signature-dialog";

type StaffStep3Props = {
  pageType: PageType;
  generatedRows: SalaryRow[];
  calculatedRow: (row: SalaryRow) => CalculatedRow;
  inputsBySalaryId: Record<string, SalaryInputState>;
  divisionSummary: Array<{ divisi: string; total: number }>;
  signatures: StaffSignatures;
  onEditSignatures: () => void;
  canPhase3Action: boolean;
  submitting: boolean;
  handleSimpanRekapan: () => void;
  handleDownloadKeduaPdfOnly: () => void;
};

function LokasiChip({ lokasi }: { lokasi?: string }) {
  const clean = String(lokasi || "").toUpperCase().trim();
  if (!clean) return null;
  return (
    <Badge
      variant="outline"
      className="px-1.5 py-0 text-[10px] font-semibold text-zinc-600 border-zinc-200 bg-zinc-50"
    >
      {clean}
    </Badge>
  );
}

export function StaffStep3Export(props: StaffStep3Props) {
  const {
    pageType,
    generatedRows,
    calculatedRow,
    inputsBySalaryId,
    divisionSummary,
    signatures,
    onEditSignatures,
    canPhase3Action,
    submitting,
    handleSimpanRekapan,
    handleDownloadKeduaPdfOnly,
  } = props;

  const alreadyPaid = useMemo(() => {
    if (generatedRows.length === 0) return false;
    return generatedRows.every(
      (r) => (r.statusPembayaran || "").toLowerCase() === "dibayar"
    );
  }, [generatedRows]);

  const activeBonusCols = useMemo(() => {
    const cols = new Set<string>();
    generatedRows.forEach((row) => {
      const input = inputsBySalaryId[row.id];
      input?.bonusItems?.forEach((item) => {
        if (item.judul.trim() && toNumber(item.nominal) > 0) {
          cols.add(item.judul.trim());
        }
      });
    });
    return Array.from(cols);
  }, [generatedRows, inputsBySalaryId]);

  const activePotonganCols = useMemo(() => {
    const cols = new Set<string>();
    generatedRows.forEach((row) => {
      const input = inputsBySalaryId[row.id];
      input?.potonganItems?.forEach((item) => {
        if (item.judul.trim() && toNumber(item.nominal) > 0) {
          cols.add(item.judul.trim());
        }
      });
    });
    return Array.from(cols);
  }, [generatedRows, inputsBySalaryId]);

  const totals = useMemo(() => {
    let totalGajiPokok = 0;
    const totalBonusCols = new Array(activeBonusCols.length).fill(0);
    const totalPotonganCols = new Array(activePotonganCols.length).fill(0);
    let totalAllPotongan = 0;
    let totalGajiBersih = 0;

    generatedRows.forEach((row) => {
      const calc = calculatedRow(row);
      const input = inputsBySalaryId[row.id] || { bonusItems: [], potonganItems: [] };

      totalGajiPokok += calc.gajiPokok;
      totalAllPotongan += calc.totalPotongan;
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
      totalGajiPokok,
      totalBonusCols,
      totalPotonganCols,
      totalAllPotongan,
      totalGajiBersih,
    };
  }, [generatedRows, calculatedRow, inputsBySalaryId, activeBonusCols, activePotonganCols]);

  const totalColCount = 8 + activeBonusCols.length + activePotonganCols.length + (pageType === "nonstaff" ? 2 : 0);

  return (
    <Card className="rounded-2xl border-zinc-100 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <CardTitle className="text-zinc-800 font-bold">
            Fase 3. Export &amp; Finalisasi
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Periksa rincian gaji Staff sebelum finalisasi pembayaran dan mengunduh slip/rekap PDF.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-zinc-100">
          <Table>
            <TableHeader className="bg-zinc-50/70">
              <TableRow>
                <TableHead className="font-semibold text-zinc-700">Nama</TableHead>
                <TableHead className="font-semibold text-zinc-700">Divisi</TableHead>
                {pageType === "nonstaff" && <TableHead className="font-semibold text-zinc-700 text-center">Hari Efektif</TableHead>}
                {pageType === "nonstaff" && <TableHead className="font-semibold text-zinc-700 text-right">Upah Harian</TableHead>}
                <TableHead className="font-semibold text-zinc-700 text-right">Gaji Pokok</TableHead>
                {activeBonusCols.map((col) => (
                  <TableHead key={`head-b-${col}`} className="font-semibold text-zinc-700 text-right">
                    {col} (Bonus)
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-emerald-800 text-right bg-emerald-50/40">
                  Total Bonus
                </TableHead>
                <TableHead className="font-semibold text-amber-950 text-right bg-amber-50/60 font-bold">
                  Gaji Bruto
                </TableHead>
                {activePotonganCols.map((col) => (
                  <TableHead key={`head-p-${col}`} className="font-semibold text-zinc-700 text-right">
                    {col} (Potongan)
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-rose-800 text-right bg-rose-50/40">
                  Total Potongan
                </TableHead>
                <TableHead className="font-semibold text-zinc-700 text-right">
                  Gaji Bersih
                </TableHead>
                <TableHead className="font-semibold text-zinc-700 text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalColCount} className="text-center text-zinc-500 py-8">
                    Belum ada data untuk export.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {generatedRows.map((row) => {
                    const calc = calculatedRow(row);
                    const input = inputsBySalaryId[row.id] || { bonusItems: [], potonganItems: [] };
                    const gajiBruto = calc.gajiPokok + calc.totalBonus;
                    const isPaid = (row.statusPembayaran || "").toLowerCase() === "dibayar";

                    return (
                      <TableRow key={`rekap-${row.id}`} className="hover:bg-zinc-50/50">
                        <TableCell className="font-medium text-zinc-800">
                          <div className="flex items-center gap-1.5">
                            <span>{row.nama}</span>
                            <LokasiChip lokasi={row.lokasiKerja} />
                          </div>
                        </TableCell>
                        <TableCell>{row.divisi}</TableCell>
                        {pageType === "nonstaff" && (
                          <TableCell className="text-center">{calc.hariEfektif ?? "-"}</TableCell>
                        )}
                        {pageType === "nonstaff" && (
                          <TableCell className="text-right">
                            {calc.upahHarian ? formatCurrency(calc.upahHarian) : "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-right">{formatCurrency(calc.gajiPokok)}</TableCell>

                        {activeBonusCols.map((col) => {
                          const item = input.bonusItems?.find((b) => b.judul.trim() === col);
                          const nominal = item ? toNumber(item.nominal) : 0;
                          return (
                            <TableCell key={`cell-b-${row.id}-${col}`} className="text-right text-emerald-600">
                              {nominal > 0 ? formatCurrency(nominal) : "-"}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-right font-semibold text-emerald-700 bg-emerald-50/30">
                          {formatCurrency(calc.totalBonus)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-950 bg-amber-50/40">
                          {formatCurrency(gajiBruto)}
                        </TableCell>

                        {activePotonganCols.map((col) => {
                          const item = input.potonganItems?.find((p) => p.judul.trim() === col);
                          const nominal = item ? toNumber(item.nominal) : 0;
                          return (
                            <TableCell key={`cell-p-${row.id}-${col}`} className="text-right text-rose-600">
                              {nominal > 0 ? formatCurrency(nominal) : "-"}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-right font-semibold text-rose-700 bg-rose-50/30">
                          {formatCurrency(calc.totalPotongan)}
                        </TableCell>

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
                          <Badge
                            variant="outline"
                            className={
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "text-zinc-500 bg-zinc-100/50"
                            }
                          >
                            {row.statusPembayaran || "Belum Dibayar"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {(() => {
                    const totalAllBonus = totals.totalBonusCols.reduce((sum, v) => sum + v, 0);
                    const totalGajiBruto = totals.totalGajiPokok + totalAllBonus;

                    return (
                      <TableRow className="bg-zinc-50/90 font-bold border-t-2 border-zinc-300">
                        <TableCell colSpan={2} className="text-zinc-900 font-bold text-sm">
                          TOTAL SUMMARY
                        </TableCell>
                        {pageType === "nonstaff" && <TableCell />}
                        {pageType === "nonstaff" && <TableCell />}
                        <TableCell className="text-right text-zinc-900 font-bold">
                          {formatCurrency(totals.totalGajiPokok)}
                        </TableCell>

                        {activeBonusCols.map((col, idx) => (
                          <TableCell key={`total-b-${col}`} className="text-right text-emerald-700 font-bold">
                            {formatCurrency(totals.totalBonusCols[idx])}
                          </TableCell>
                        ))}

                        <TableCell className="text-right text-emerald-800 font-bold bg-emerald-50/50">
                          {formatCurrency(totalAllBonus)}
                        </TableCell>
                        <TableCell className="text-right text-amber-950 font-bold bg-amber-100/70">
                          {formatCurrency(totalGajiBruto)}
                        </TableCell>

                        {activePotonganCols.map((col, idx) => (
                          <TableCell key={`total-p-${col}`} className="text-right text-rose-700 font-bold">
                            {formatCurrency(totals.totalPotonganCols[idx])}
                          </TableCell>
                        ))}

                        <TableCell className="text-right text-rose-800 font-bold bg-rose-50/50">
                          {formatCurrency(totals.totalAllPotongan)}
                        </TableCell>
                        <TableCell className="text-right text-zinc-950 font-bold">
                          {formatCurrency(totals.totalGajiBersih)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })()}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Total per Divisi */}
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

        {/* Panel Otorisasi & Catatan */}
        <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/30 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-sm font-bold text-zinc-800">
              Otorisasi &amp; Catatan Rekapitulasi
            </h4>
            <Button
              type="button"
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
                &ldquo;{signatures.catatan}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Action Button: Simpan / Bayarkan atau Download Ulang File PDF */}
        <div className="flex items-center justify-end pt-6 border-t mt-6">
          {alreadyPaid ? (
            <Button
              type="button"
              onClick={handleDownloadKeduaPdfOnly}
              disabled={!canPhase3Action || submitting || generatedRows.length === 0}
              className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-11 px-6 font-medium shadow-xs"
            >
              <FileDown className="w-4 h-4" />
              Download Ulang File PDF
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSimpanRekapan}
              disabled={!canPhase3Action || submitting || generatedRows.length === 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 font-medium shadow-xs"
            >
              <Save className="w-4 h-4" />
              Simpan / Bayarkan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
