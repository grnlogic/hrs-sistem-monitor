"use client";

import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
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
import { ArrowRight } from "lucide-react";
import {
  type SnapshotRow,
  type InputState,
  type CalculatedSnapshot,
  buildDefaultInputState,
  toNumber,
  CompanyBadge,
} from "./nonstaff-salary-shared";

type NonStaffStep2Props = {
  snapshotRows: SnapshotRow[];
  inputsBySalaryId: Record<string, InputState>;
  doneBySalaryId: Record<string, boolean>;
  calculatedForSnapshot: (row: SnapshotRow) => CalculatedSnapshot;
  openInputDialog: (row: SnapshotRow) => void;
  allDone: boolean;
  setStep: (step: 2 | 3) => void;
  onMarkAllDone: () => void;
};

export function NonStaffStep2BonusPotongan(props: NonStaffStep2Props) {
  const {
    snapshotRows,
    inputsBySalaryId,
    doneBySalaryId,
    calculatedForSnapshot,
    openInputDialog,
    allDone,
    setStep,
    onMarkAllDone,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fase 2. Input Bonus &amp; Potongan</CardTitle>
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
                <TableHead>Total dari Hari</TableHead>
                <TableHead>Total Bonus</TableHead>
                <TableHead>Total Potongan</TableHead>
                <TableHead>Gaji Akhir</TableHead>
                <TableHead>Detail Bonus</TableHead>
                <TableHead>Detail Potongan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshotRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    Belum ada snapshot data.
                  </TableCell>
                </TableRow>
              ) : (
                snapshotRows.map((row) => {
                  const input =
                    inputsBySalaryId[row.gajiId] ||
                    buildDefaultInputState();
                  const calc = calculatedForSnapshot(row);
                  const totalDariHari = Math.round(
                    row.hariEfektif * row.upahHarian
                  );

                  const bonusDetails = input.bonusItems.filter(
                    (item) =>
                      item.judul.trim() && toNumber(item.nominal) !== 0
                  );
                  const potonganDetails = input.potonganItems.filter(
                    (item) =>
                      item.judul.trim() && toNumber(item.nominal) !== 0
                  );

                  return (
                    <TableRow key={row.gajiId}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{row.nama}</span>
                          <CompanyBadge lokasi={row.lokasiDefault} />
                        </div>
                      </TableCell>
                      <TableCell>{row.divisi}</TableCell>
                      <TableCell>{row.hariEfektif}</TableCell>
                      <TableCell>
                        {formatCurrency(row.upahHarian)}
                      </TableCell>
                      <TableCell>{formatCurrency(totalDariHari)}</TableCell>
                      <TableCell>
                        {formatCurrency(calc.totalBonus)}
                      </TableCell>
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
                      <TableCell>
                        {bonusDetails.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="space-y-1 text-xs">
                            {bonusDetails.map((item, idx) => (
                              <p
                                key={`bonus-detail-${row.gajiId}-${idx}`}
                              >
                                {item.judul}:{" "}
                                <span className="font-medium">
                                  {formatCurrency(toNumber(item.nominal))}
                                </span>
                              </p>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {potonganDetails.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="space-y-1 text-xs">
                            {potonganDetails.map((item, idx) => (
                              <p
                                key={`potongan-detail-${row.gajiId}-${idx}`}
                              >
                                {item.judul}:{" "}
                                <span className="font-medium">
                                  {formatCurrency(toNumber(item.nominal))}
                                </span>
                              </p>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        {row.statusPembayaran === "Tidak Ada Absensi" && (
                          <div>
                            <Badge className="border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.22)] border-dashed border">
                              Tidak Ada Absensi
                            </Badge>
                          </div>
                        )}
                        <div>
                          {doneBySalaryId[row.gajiId] ? (
                            <Badge>Selesai</Badge>
                          ) : (
                            <Badge variant="secondary">Belum</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInputDialog(row)}
                          className="gap-2"
                        >
                          Input
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {allDone ? (
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button
              onClick={() => setStep(3)}
              size="lg"
              className="w-full md:w-auto gap-2"
            >
              Lanjut ke Export{" "}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          snapshotRows.length > 0 && (
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onMarkAllDone}
                size="lg"
                className="w-full md:w-auto"
              >
                Tandai Semua Selesai (Tanpa Penyesuaian)
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
