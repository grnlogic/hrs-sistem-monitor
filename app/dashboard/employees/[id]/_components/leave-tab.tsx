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
import { renderLeaveTypeLabel, renderLeaveStatusBadge } from "./utils";

interface LeaveTabProps {
  leaveHistory: any[];
  leaveInfo: any;
}

export function LeaveTab({ leaveHistory, leaveInfo }: LeaveTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Riwayat Cuti</span>
          {leaveInfo && (
            <span className="text-sm text-zinc-600">
              Jatah Cuti Tahunan {leaveInfo.tahun}: {leaveInfo.terpakai}/{leaveInfo.batasMaksimal} hari terpakai (sisa {leaveInfo.sisaCuti} hari)
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Histori pengajuan dan persetujuan cuti
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Jenis Cuti</TableHead>
              <TableHead>Tanggal Mulai</TableHead>
              <TableHead>Tanggal Selesai</TableHead>
              <TableHead>Jumlah Hari</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Tidak ada data cuti
                </TableCell>
              </TableRow>
            ) : (
              leaveHistory.map((leave, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">
                    {renderLeaveTypeLabel(leave)}
                  </TableCell>
                  <TableCell>
                    {leave.tanggalMulai
                      ? new Date(leave.tanggalMulai).toLocaleDateString(
                          "id-ID"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {leave.tanggalSelesai
                      ? new Date(leave.tanggalSelesai).toLocaleDateString(
                          "id-ID"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {leave.jumlahHari ? `${leave.jumlahHari} hari` : "-"}
                  </TableCell>
                  <TableCell>
                    {renderLeaveStatusBadge(leave.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
