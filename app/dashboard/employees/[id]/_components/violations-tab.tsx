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

interface ViolationsTabProps {
  violationHistory: any[];
}

export function ViolationsTab({ violationHistory }: ViolationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Pelanggaran</CardTitle>
        <CardDescription>
          Catatan pelanggaran dan sanksi yang diberikan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jenis Pelanggaran</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Sanksi</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violationHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Tidak ada data pelanggaran
                </TableCell>
              </TableRow>
            ) : (
              violationHistory.map((vio, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {vio.tanggalKejadian
                      ? new Date(vio.tanggalKejadian).toLocaleDateString(
                          "id-ID"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>{vio.jenisPelanggaran || "-"}</TableCell>
                  <TableCell>{vio.catatan || "-"}</TableCell>
                  <TableCell>{vio.jenisSanksi || "-"}</TableCell>
                  <TableCell>{vio.tindakLanjut || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
