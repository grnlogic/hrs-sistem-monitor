"use client";

import * as React from "react";
import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
import { Checkbox } from "@/components/ui/form/checkbox";
import { Badge } from "@/components/ui/display/badge";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import type { CompanyFilter } from "@/lib/api/core";
import { employeeAPI } from "@/lib/api/karyawan";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { cn, formatCurrency } from "@/lib/utils";
import { getMaxOneMonthEndDate, parseDateOnlyUtc } from "@/lib/staff-salary-utils";
import {
  type PageType,
  type WorkflowStatus,
  type EmployeeRow,
  type AttendanceSummary,
  type EstimatedRow,
  toNumber,
} from "./salary-stepper-shared";

type StaffStep1Props = {
  pageType: PageType;
  staffStartDate: string;
  setStaffStartDate: (v: string) => void;
  staffEndDate: string;
  setStaffEndDate: (v: string) => void;
  nonStaffStartDate: string;
  setNonStaffStartDate: (v: string) => void;
  nonStaffEndDate: string;
  setNonStaffEndDate: (v: string) => void;
  loading: boolean;
  estimatedRows: EstimatedRow[];
  employees: EmployeeRow[];
  attendanceFor: (karyawanId: string) => AttendanceSummary;
  setAttendanceOverrides: React.Dispatch<
    React.SetStateAction<Record<string, AttendanceSummary>>
  >;
  workflowStatus: WorkflowStatus;
  canGenerate: boolean;
  submitting: boolean;
  handleGenerate: (selectedDivisions?: string[]) => void;
  company: CompanyFilter;
  onCompanyChange: (value: CompanyFilter) => void;
  hasGeneratedRows?: boolean;
  onGoToStep2?: () => void;
};

export function StaffStep1Generate(props: StaffStep1Props) {
  const {
    pageType,
    staffStartDate,
    setStaffStartDate,
    staffEndDate,
    setStaffEndDate,
    nonStaffStartDate,
    setNonStaffStartDate,
    nonStaffEndDate,
    setNonStaffEndDate,
    loading,
    estimatedRows,
    employees,
    attendanceFor,
    setAttendanceOverrides,
    workflowStatus,
    canGenerate,
    submitting,
    handleGenerate,
    company,
    onCompanyChange,
    hasGeneratedRows = false,
    onGoToStep2,
  } = props;

  const staffRangeError = React.useMemo(() => {
    if (pageType !== "staff") return "";
    if (!staffStartDate || !staffEndDate) {
      return "Tanggal mulai dan tanggal akhir wajib diisi.";
    }
    const start = parseDateOnlyUtc(staffStartDate);
    const end = parseDateOnlyUtc(staffEndDate);
    if (!start || !end) {
      return "Format tanggal periode tidak valid.";
    }
    if (end.getTime() < start.getTime()) {
      return "Tanggal akhir tidak boleh lebih kecil dari tanggal mulai.";
    }
    const maxEnd = getMaxOneMonthEndDate(start);
    if (end.getTime() > maxEnd.getTime()) {
      return "Rentang periode Staff maksimal 1 bulan.";
    }
    return "";
  }, [pageType, staffStartDate, staffEndDate]);

  const [availableDivisions, setAvailableDivisions] = React.useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = React.useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = React.useState(false);

  React.useEffect(() => {
    async function fetchDivisions() {
      try {
        setLoadingDivisions(true);
        const data = await employeeAPI.getDivisiList(pageType, company);
        setAvailableDivisions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Gagal mengambil daftar divisi:", err);
      } finally {
        setLoadingDivisions(false);
      }
    }
    fetchDivisions();
  }, [pageType, company]);

  const filteredRows = React.useMemo(() => {
    if (selectedDivisions.length === 0) return estimatedRows;
    return estimatedRows.filter((row) => selectedDivisions.includes(row.divisi || ""));
  }, [estimatedRows, selectedDivisions]);

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Fase 1. Generate</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-foreground">
            Perusahaan
          </label>
          <CompanySwitcher value={company} onChange={onCompanyChange} className="h-10 w-full" />
        </div>
        {pageType === "staff" ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-foreground">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={staffStartDate}
                onChange={(e) => setStaffStartDate(e.target.value)}
                className={cn(staffRangeError && "border-destructive")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-foreground">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={staffEndDate}
                onChange={(e) => setStaffEndDate(e.target.value)}
                className={cn(staffRangeError && "border-destructive")}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm text-foreground">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={nonStaffStartDate}
                onChange={(e) => setNonStaffStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-foreground">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={nonStaffEndDate}
                onChange={(e) => setNonStaffEndDate(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {pageType === "staff" && staffRangeError && (
        <p className="mt-2 text-xs text-destructive">{staffRangeError}</p>
      )}

      {/* Division filter checkbox list */}
      <div className="mt-4 rounded-md border border-input p-3 bg-zinc-50/50">
        <p className="text-xs font-semibold text-zinc-500 mb-2">Filter Divisi (Kosongkan untuk Semua Divisi)</p>
        {loadingDivisions ? (
          <span className="text-xs text-muted-foreground animate-pulse">Memuat daftar divisi...</span>
        ) : availableDivisions.length === 0 ? (
          <span className="text-xs text-muted-foreground">Tidak ada daftar divisi untuk kategori ini.</span>
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

      {pageType === "staff" &&
        filteredRows.some(
          (r) => (r.statusPembayaran || "").toLowerCase() === "dibayar"
        ) && (
          <Alert className="mt-4 bg-emerald-50/80 border-emerald-200 text-emerald-900">
            <AlertDescription className="text-xs">
              <strong>Info Gaji Dibayar:</strong> Terdapat{" "}
              <strong>
                {
                  filteredRows.filter(
                    (r) => (r.statusPembayaran || "").toLowerCase() === "dibayar"
                  ).length
                }
              </strong>{" "}
              karyawan yang gajinya sudah berstatus <strong>&quot;Sudah Dibayar&quot;</strong> untuk periode ini.
            </AlertDescription>
          </Alert>
        )}

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Divisi</TableHead>
              {pageType === "staff" ? (
                <>
                  <TableHead>Status Karyawan</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Upah Harian</TableHead>
                  <TableHead>Hari Hadir</TableHead>
                  <TableHead>Setengah Hari</TableHead>
                  <TableHead>Lembur</TableHead>
                  <TableHead>Estimasi Gaji</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={pageType === "staff" ? 4 : 8}>
                  Memuat data...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={pageType === "staff" ? 4 : 8}>
                  Tidak ada data karyawan.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filteredRows.map((row) => {
                if (pageType === "staff") {
                  return (
                    <TableRow key={row.karyawanId}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{row.nama}</span>
                          {(row.statusPembayaran || "").toLowerCase() === "dibayar" && (
                            <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 text-[10px] py-0 px-1.5 font-normal">
                              Sudah Dibayar
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{row.divisi}</TableCell>
                      <TableCell>
                        {"statusKaryawan" in row ? row.statusKaryawan : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(row.gajiPokok)}</TableCell>
                    </TableRow>
                  );
                }

                const employee = employees.find(
                  (item) => item.id === row.karyawanId
                );
                const summary = attendanceFor(row.karyawanId);
                const canEdit = workflowStatus === "DRAFT";

                return (
                  <TableRow key={row.karyawanId}>
                    <TableCell>{row.nama}</TableCell>
                    <TableCell>{row.divisi}</TableCell>
                    <TableCell>
                      {formatCurrency(toNumber(employee?.gajiPerHari))}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        className="h-8 w-20"
                        value={summary.hadir}
                        onChange={(e) =>
                          setAttendanceOverrides((prev) => ({
                            ...prev,
                            [row.karyawanId]: {
                              ...summary,
                              hadir: toNumber(e.target.value),
                            },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        className="h-8 w-20"
                        value={summary.setengahHari}
                        onChange={(e) =>
                          setAttendanceOverrides((prev) => ({
                            ...prev,
                            [row.karyawanId]: {
                              ...summary,
                              setengahHari: toNumber(e.target.value),
                            },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        className="h-8 w-20"
                        value={summary.lembur}
                        onChange={(e) =>
                          setAttendanceOverrides((prev) => ({
                            ...prev,
                            [row.karyawanId]: {
                              ...summary,
                              lembur: toNumber(e.target.value),
                            },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(toNumber(row.gajiPokok))}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        {hasGeneratedRows && onGoToStep2 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onGoToStep2}
            className="w-full md:w-auto gap-2"
          >
            Buka Fase 2 (Data Periode Ini Sudah Ada)
          </Button>
        )}
        <Button
          onClick={() => handleGenerate(selectedDivisions)}
          disabled={!canGenerate || submitting || Boolean(staffRangeError)}
          size="lg"
          className="w-full md:w-auto gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{" "}
              Memproses...
            </>
          ) : (
            <>
            Generate Gaji
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
