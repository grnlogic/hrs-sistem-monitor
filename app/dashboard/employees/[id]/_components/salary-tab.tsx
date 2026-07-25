import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  formatCurrency,
  formatPeriodeGaji,
  getSalaryRowKey,
  getStatusBadge,
} from "./utils";

interface SalaryTabProps {
  filteredSalaryHistory: any[];
  salaryRangeStart: string;
  salaryRangeEnd: string;
  setSalaryRangeStart: (value: string) => void;
  setSalaryRangeEnd: (value: string) => void;
  exportedSalaryGroups: any[];
  selectedExportedSalaryKey: string | null;
  setSelectedExportedSalaryKey: (value: string) => void;
  selectedSalary: any;
  selectedSalaryRincian: {
    bonusItems: Array<{ judul: string; nominal: number }>;
    potonganItems: Array<{ judul: string; nominal: number }>;
  };
}

export function SalaryTab({
  filteredSalaryHistory,
  salaryRangeStart,
  salaryRangeEnd,
  setSalaryRangeStart,
  setSalaryRangeEnd,
  exportedSalaryGroups,
  selectedExportedSalaryKey,
  setSelectedExportedSalaryKey,
  selectedSalary,
  selectedSalaryRincian,
}: SalaryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Gaji</CardTitle>
        <CardDescription>
          Histori pembayaran gaji karyawan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600">Dari tanggal</label>
            <Input
              type="date"
              value={salaryRangeStart}
              onChange={(event) => setSalaryRangeStart(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600">Sampai tanggal</label>
            <Input
              type="date"
              value={salaryRangeEnd}
              onChange={(event) => setSalaryRangeEnd(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSalaryRangeStart("");
                setSalaryRangeEnd("");
              }}
            >
              Reset Range
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Daftar Periode Gaji</h3>
              <p className="text-xs text-zinc-500">Pilih satu periode untuk melihat rincian bonus dan potongan.</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Gaji Bersih</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaryHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Tidak ada data gaji
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalaryHistory.map((salary, idx) => {
                    const rowKey = getSalaryRowKey(salary, idx);

                    return (
                      <TableRow
                        key={rowKey}
                        className=""
                      >
                        <TableCell className="font-medium">
                          {formatPeriodeGaji(salary.periodeAwal, salary.periodeAkhir)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(salary.gajiPokok) || 0)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(salary.totalGajiBersih) || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(salary.statusPembayaran || "-")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:col-span-5 rounded-lg border bg-zinc-50/40">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Rincian Periode Terpilih</h3>
              {exportedSalaryGroups.length > 0 ? (
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Daftar periode hasil export (Dibayar)
                  </label>
                  <select
                    className="h-8 w-full rounded border border-zinc-300 bg-white px-2 text-xs"
                    value={selectedExportedSalaryKey || ""}
                    onChange={(event) => setSelectedExportedSalaryKey(event.target.value)}
                  >
                    {exportedSalaryGroups.map((item) => (
                      <option key={item.key} value={item.key}>
                        {`${formatPeriodeGaji(item.periodeAwal, item.periodeAkhir)} · ${item.rows.length} entri · ${formatCurrency(
                          item.rows.reduce((sum: number, row: any) => sum + (Number(row.salary?.totalGajiBersih) || 0), 0)
                        )}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {selectedSalary ? (
                <>
                  <p className="text-xs text-zinc-600 mt-1">
                    {formatPeriodeGaji(selectedSalary.periodeAwal, selectedSalary.periodeAkhir)}
                  </p>
                  <div className="mt-2">{getStatusBadge(selectedSalary.statusPembayaran || "-")}</div>
                </>
              ) : (
                <p className="text-xs text-zinc-500 mt-1">Belum ada periode hasil export (status Dibayar).</p>
              )}
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-800">Bonus</h4>
                  <span className="text-xs font-medium text-zinc-800">
                    {formatCurrency(Number(selectedSalary?.bonus) || 0)}
                  </span>
                </div>
                {selectedSalaryRincian.bonusItems.length === 0 ? (
                  <p className="text-xs text-zinc-500">Tidak ada rincian bonus pada periode ini.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedSalaryRincian.bonusItems.map((item, idx) => (
                      <div
                        key={`bonus-${idx}`}
                        className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs"
                      >
                        <span className="text-zinc-900">{item.judul}</span>
                        <span className="font-medium text-zinc-900">{formatCurrency(item.nominal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-red-700">Potongan</h4>
                  <span className="text-xs font-medium text-red-700">
                    {formatCurrency(Number(selectedSalary?.potongan) || 0)}
                  </span>
                </div>
                {selectedSalaryRincian.potonganItems.length === 0 ? (
                  <p className="text-xs text-zinc-500">Tidak ada rincian potongan pada periode ini.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedSalaryRincian.potonganItems.map((item, idx) => (
                      <div
                        key={`potongan-${idx}`}
                        className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs"
                      >
                        <span className="text-red-900">{item.judul}</span>
                        <span className="font-medium text-red-800">{formatCurrency(item.nominal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border bg-white p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-600">
                  <span>Gaji Pokok</span>
                  <span>{formatCurrency(Number(selectedSalary?.gajiPokok) || 0)}</span>
                </div>
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-600">
                  <span>Total Bonus</span>
                  <span className="text-zinc-800">+ {formatCurrency(Number(selectedSalary?.bonus) || 0)}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-600">
                  <span>Total Potongan</span>
                  <span className="text-red-700">- {formatCurrency(Number(selectedSalary?.potongan) || 0)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold text-zinc-900">
                  <span>Gaji Bersih</span>
                  <span>{formatCurrency(Number(selectedSalary?.totalGajiBersih) || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
