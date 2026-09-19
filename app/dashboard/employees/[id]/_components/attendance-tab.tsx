import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/display/badge";
import { AlertTriangle, Info } from "lucide-react";
import { getStatusBadge, formatIzinSakitTanggal, getLokasiBadge } from "./utils";

interface AttendanceTabProps {
  attendanceHistory: any[];
  lokasiDefault?: string;
}

export function AttendanceTab({ attendanceHistory, lokasiDefault = "PJP" }: AttendanceTabProps) {
  const [locationFilter, setLocationFilter] = useState<string>("ALL");

  // Ringkasan per lokasi
  const locationSummary = useMemo(() => {
    const stats: Record<string, { hadir: number; paid: number; unpaid: number; mismatch: number }> = {
      PJP: { hadir: 0, paid: 0, unpaid: 0, mismatch: 0 },
      SP: { hadir: 0, paid: 0, unpaid: 0, mismatch: 0 },
      PRIMA: { hadir: 0, paid: 0, unpaid: 0, mismatch: 0 },
    };

    for (const item of attendanceHistory) {
      const loc = String(item.lokasi || "PJP").toUpperCase();
      if (!stats[loc]) {
        stats[loc] = { hadir: 0, paid: 0, unpaid: 0, mismatch: 0 };
      }
      const isHadir =
        item.hadir ||
        String(item.status).toUpperCase() === "HADIR" ||
        String(item.status).toUpperCase() === "SETENGAH_HARI";
      if (isHadir) {
        stats[loc].hadir += 1;
        if (item.statusPembayaran === "Dibayar") {
          stats[loc].paid += 1;
        } else {
          stats[loc].unpaid += 1;
        }
        if (
          item.mismatchType === "PAID_OTHER_LOCATION" ||
          item.mismatchType === "RECORDED_OTHER_LOCATION"
        ) {
          stats[loc].mismatch += 1;
        }
      }
    }
    return stats;
  }, [attendanceHistory]);

  const filteredAttendance = useMemo(() => {
    if (locationFilter === "ALL") return attendanceHistory;
    return attendanceHistory.filter(
      (a) => String(a.lokasi || "").toUpperCase() === locationFilter
    );
  }, [attendanceHistory, locationFilter]);

  const totalMismatches = useMemo(() => {
    return attendanceHistory.filter(
      (a) =>
        a.mismatchType === "PAID_OTHER_LOCATION" ||
        a.mismatchType === "RECORDED_OTHER_LOCATION"
    ).length;
  }, [attendanceHistory]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Riwayat Absensi</CardTitle>
            <CardDescription>
              Catatan kehadiran karyawan (Lokasi Default:{" "}
              <span className="font-semibold text-zinc-900">{lokasiDefault}</span>)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-600 whitespace-nowrap">
              Filter Lokasi:
            </label>
            <select
              className="h-8 rounded border border-zinc-300 bg-white px-2 text-xs font-medium text-zinc-800"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="ALL">Semua Lokasi</option>
              <option value="PJP">PJP</option>
              <option value="SP">SP</option>
              <option value="PRIMA">PRIMA</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Ringkasan Kehadiran per Lokasi */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.entries(locationSummary).map(([loc, stat]) => (
            <div
              key={loc}
              className="rounded-lg border bg-zinc-50/60 p-2.5 text-xs flex flex-col justify-between gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">{getLokasiBadge(loc)}</span>
                <span className="text-zinc-500 font-medium">{stat.hadir} hari hadir</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-700 font-medium">{stat.paid} Dibayar</span>
                <span className="text-zinc-300">·</span>
                <span className="text-amber-700 font-medium">{stat.unpaid} Belum Dibayar</span>
                {stat.mismatch > 0 && (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span className="text-red-600 font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> {stat.mismatch} di lokasi lain
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Peringatan jika ada ketidaksesuaian */}
        {totalMismatches > 0 && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Peringatan Ketidaksesuaian Lokasi Gaji &amp; Absensi ({totalMismatches} hari)
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Ditemukan absensi di mana karyawan hadir di satu lokasi, tetapi gajinya
                tercatat/dibayarkan di rekap lokasi lain. Silakan periksa tanda peringatan pada baris
                tabel di bawah.
              </p>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Lokasi Kerja</TableHead>
              <TableHead>Jam Masuk</TableHead>
              <TableHead>Jam Pulang</TableHead>
              <TableHead>Status Absensi</TableHead>
              <TableHead>Status Gaji di Lokasi Ini</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-zinc-500 py-6">
                  Tidak ada data absensi
                </TableCell>
              </TableRow>
            ) : (
              filteredAttendance.map((absen, idx) => {
                const isSeconded = Boolean(
                  absen.isDiperbantukan ||
                    (lokasiDefault && absen.lokasi && absen.lokasi !== lokasiDefault)
                );

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <span>{formatIzinSakitTanggal(absen.tanggal)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getLokasiBadge(absen.lokasi)}
                        {isSeconded && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                            Diperbantukan
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{absen.jamMasuk || "-"}</TableCell>
                    <TableCell>{absen.jamPulang || "-"}</TableCell>
                    <TableCell>{getStatusBadge(absen.status || "-")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {absen.statusPembayaran === "Dibayar" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                            Sudah Dibayar{" "}
                            {absen.gajiTerkait?.rekapId ? `(Rekap #${absen.gajiTerkait.rekapId})` : ""}
                          </Badge>
                        ) : absen.mismatchType === "PAID_OTHER_LOCATION" ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                              Belum Dibayar di {absen.lokasi}
                            </Badge>
                            <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Dibayar di{" "}
                              {absen.gajiLokasiLain?.lokasi} (Rekap #{absen.gajiLokasiLain?.rekapId})
                            </Badge>
                          </div>
                        ) : absen.mismatchType === "RECORDED_OTHER_LOCATION" ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                              Belum Dibayar di {absen.lokasi}
                            </Badge>
                            <Badge className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] px-1.5 py-0.5 font-medium leading-none rounded-md">
                              Tercatat di {absen.gajiLokasiLain?.lokasi} (Draft)
                            </Badge>
                          </div>
                        ) : absen.mismatchType === "NO_GAJI_RECORD" ? (
                          <Badge
                            variant="outline"
                            className="bg-zinc-50 text-zinc-600 border-zinc-200 text-[10px] px-1.5 py-0.5 font-normal leading-none rounded-md flex items-center gap-1"
                          >
                            <Info className="h-3 w-3 text-zinc-400" /> Belum Digenerate
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                            Belum Dibayar
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{absen.keterangan || "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
