"use client";

import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Checkbox } from "@/components/ui/form/checkbox";
import { employeeAPI } from "@/lib/api/karyawan";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { formatCurrency } from "@/lib/utils";
import { Search, ArrowRight } from "lucide-react";
import {
  type AttendanceSummary,
  toNumber,
} from "./nonstaff-salary-shared";

type NonStaffStep1Props = {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  selectedDivisions: string[];
  setSelectedDivisions: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  effectiveReviewRows: Array<
    AttendanceSummary & { gajiPokok: number }
  >;
  manualHariEfektif: Record<string, number>;
  setManualHariEfektif: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  savingHariEfektifByKaryawanId: Record<string, boolean>;
  canEditSalary: boolean;
  submitting: boolean;
  handleShowData: () => void;
  handleHariEfektifBlur: (row: AttendanceSummary) => void;
  handleConfirmAndContinue: () => void;
};

export function NonStaffStep1Review(props: NonStaffStep1Props) {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedDivisions,
    setSelectedDivisions,
    loading,
    effectiveReviewRows,
    manualHariEfektif,
    setManualHariEfektif,
    savingHariEfektifByKaryawanId,
    canEditSalary,
    submitting,
    handleShowData,
    handleHariEfektifBlur,
    handleConfirmAndContinue,
  } = props;

  const [availableDivisions, setAvailableDivisions] = React.useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = React.useState(false);

  React.useEffect(() => {
    async function fetchDivisions() {
      try {
        setLoadingDivisions(true);
        const data = await employeeAPI.getDivisiList("nonstaff");
        setAvailableDivisions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Gagal mengambil daftar divisi:", err);
      } finally {
        setLoadingDivisions(false);
      }
    }
    fetchDivisions();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fase 1. Review &amp; Konfirmasi Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm">Dari tanggal</label>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Sampai tanggal</label>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleShowData}
              disabled={loading}
              className="w-full md:w-auto gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{" "}
                  Memuat...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Tampilkan Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Division filter checkbox list */}
        <div className="rounded-md border border-input p-3 bg-zinc-50/50">
          <p className="text-xs font-semibold text-zinc-500 mb-2">Filter Divisi (Kosongkan untuk Semua Divisi)</p>
          {loadingDivisions ? (
            <span className="text-xs text-muted-foreground animate-pulse">Memuat daftar divisi...</span>
          ) : availableDivisions.length === 0 ? (
            <span className="text-xs text-muted-foreground">Tidak ada daftar divisi non-staff.</span>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availableDivisions.map((div) => (
                <label key={div} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox
                    checked={selectedDivisions.includes(div)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDivisions((prev) => [...prev, div]);
                      } else {
                        setSelectedDivisions((prev) => prev.filter((item) => item !== div));
                      }
                    }}
                  />
                  <span className="text-zinc-700">{div}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Divisi</TableHead>
                <TableHead>Hari Hadir</TableHead>
                <TableHead>Setengah Hari</TableHead>
                <TableHead>Lembur</TableHead>
                <TableHead>Hari Efektif</TableHead>
                <TableHead>Upah Harian</TableHead>
                <TableHead>Estimasi Gaji Pokok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {effectiveReviewRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>Belum ada data review.</TableCell>
                </TableRow>
              ) : (
                effectiveReviewRows.map((row) => {
                  const value =
                    manualHariEfektif[row.karyawanId] ?? row.hariEfektif;
                  const gajiPokok = Math.round(value * row.upahHarian);
                  return (
                    <TableRow key={row.karyawanId}>
                      <TableCell>{row.nama}</TableCell>
                      <TableCell>{row.divisi}</TableCell>
                      <TableCell>{row.hariHadir}</TableCell>
                      <TableCell>{row.setengahHari}</TableCell>
                      <TableCell>{row.lembur}</TableCell>
                      <TableCell>
                        {canEditSalary ? (
                          <>
                            <Input
                              type="number"
                              min={0}
                              step="0.5"
                              value={value}
                              disabled={Boolean(
                                savingHariEfektifByKaryawanId[row.karyawanId]
                              )}
                              onChange={(event) =>
                                setManualHariEfektif((prev) => ({
                                  ...prev,
                                  [row.karyawanId]: toNumber(
                                    event.target.value
                                  ),
                                }))
                              }
                              onBlur={() => {
                                void handleHariEfektifBlur(row);
                              }}
                              className="h-8 w-24"
                            />
                            {savingHariEfektifByKaryawanId[row.karyawanId] ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Menyimpan...
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="font-medium">{value}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(row.upahHarian)}
                      </TableCell>
                      <TableCell>{formatCurrency(gajiPokok)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {canEditSalary ? (
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button
              onClick={handleConfirmAndContinue}
              disabled={submitting || effectiveReviewRows.length === 0}
              size="lg"
              className="w-full md:w-auto gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{" "}
                  Memproses Draft &amp; Menyimpan...
                </>
              ) : (
                <>
                  Konfirmasi &amp; Lanjut{" "}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="pt-4 border-t mt-4">
            <Alert>
              <AlertDescription>
                Preview selesai. Untuk lanjut input bonus/potongan gunakan
                akun <strong>AKUNTANSI</strong>.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
