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
import { getStatusBadge, formatIzinSakitTanggal } from "./utils";

interface AttendanceTabProps {
  attendanceHistory: any[];
}

export function AttendanceTab({ attendanceHistory }: AttendanceTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Absensi</CardTitle>
        <CardDescription>Catatan kehadiran karyawan</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam Masuk</TableHead>
              <TableHead>Jam Pulang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Tidak ada data absensi
                </TableCell>
              </TableRow>
            ) : (
              attendanceHistory.map((absen, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1 items-start">
                      <span>{formatIzinSakitTanggal(absen.tanggal)}</span>
                      {absen.statusPembayaran === "Dibayar" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/50 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                          Sudah Dibayar
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/50 text-[10px] px-1.5 py-0.5 font-semibold leading-none rounded-md">
                          Belum Dibayar
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{absen.jamMasuk || "-"}</TableCell>
                  <TableCell>{absen.jamPulang || "-"}</TableCell>
                  <TableCell>
                    {getStatusBadge(absen.status || "-")}
                  </TableCell>
                  <TableCell>{absen.keterangan || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
