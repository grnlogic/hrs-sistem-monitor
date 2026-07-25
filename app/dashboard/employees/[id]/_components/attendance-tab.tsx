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
import { getStatusBadge } from "./utils";

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
                    {absen.tanggal || "-"}
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
