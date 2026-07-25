import { Button } from "@/components/ui/form/button";
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
import { formatIzinSakitTanggal, renderIzinSakitBadge } from "./utils";

interface IzinSakitTabProps {
  filteredIzinSakitHistory: any[];
  izinSakitFilter: "all" | "IZIN" | "TIDAK_HADIR";
  setIzinSakitFilter: (value: "all" | "IZIN" | "TIDAK_HADIR") => void;
}

export function IzinSakitTab({
  filteredIzinSakitHistory,
  izinSakitFilter,
  setIzinSakitFilter,
}: IzinSakitTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Izin & Sakit</CardTitle>
        <CardDescription>
          Data izin dan tidak hadir dari absensi harian
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={izinSakitFilter === "all" ? "default" : "outline"}
            onClick={() => setIzinSakitFilter("all")}
          >
            Semua
          </Button>
          <Button
            type="button"
            size="sm"
            variant={izinSakitFilter === "IZIN" ? "default" : "outline"}
            onClick={() => setIzinSakitFilter("IZIN")}
          >
            Izin
          </Button>
          <Button
            type="button"
            size="sm"
            variant={izinSakitFilter === "TIDAK_HADIR" ? "default" : "outline"}
            onClick={() => setIzinSakitFilter("TIDAK_HADIR")}
          >
            Sakit
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Lembur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIzinSakitHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Tidak ada riwayat izin atau sakit
                </TableCell>
              </TableRow>
            ) : (
              filteredIzinSakitHistory.map((item, index) => (
                <TableRow key={String(item.id)}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {formatIzinSakitTanggal(item.tanggal)}
                  </TableCell>
                  <TableCell>{renderIzinSakitBadge(item.status)}</TableCell>
                  <TableCell>{item.keterangan || "-"}</TableCell>
                  <TableCell>{item.isLembur ? "Lembur" : "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
