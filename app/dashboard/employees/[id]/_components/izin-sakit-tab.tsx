import { useMemo } from "react";
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
import { formatIzinSakitTanggal, renderIzinSakitBadge, determineSubStatus } from "./utils";

interface IzinSakitTabProps {
  izinSakitHistory: any[];
  filteredIzinSakitHistory: any[];
  izinSakitFilter: "all" | "IZIN" | "SAKIT" | "ALPA" | "LIBUR";
  setIzinSakitFilter: (value: "all" | "IZIN" | "SAKIT" | "ALPA" | "LIBUR") => void;
}

export function IzinSakitTab({
  izinSakitHistory,
  filteredIzinSakitHistory,
  izinSakitFilter,
  setIzinSakitFilter,
}: IzinSakitTabProps) {
  
  // Hitung statistik untuk kartu
  const stats = useMemo(() => {
    let izinCount = 0;
    let sakitCount = 0;
    let alpaCount = 0;
    let liburCount = 0;

    izinSakitHistory.forEach((item) => {
      const sub = determineSubStatus(item?.status, item?.keterangan || item?.notes);
      if (sub === "IZIN") izinCount++;
      else if (sub === "SAKIT") sakitCount++;
      else if (sub === "ALPA") alpaCount++;
      else if (sub === "LIBUR") liburCount++;
    });

    return { izinCount, sakitCount, alpaCount, liburCount };
  }, [izinSakitHistory]);

  return (
    <div className="space-y-4">
      {/* Kartu Ringkasan Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/40 border-blue-100/80 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardDescription className="text-blue-600 font-semibold text-xs flex items-center gap-1">
              <span>📝</span> Total Izin
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <span className="text-3xl font-extrabold text-blue-900">{stats.izinCount}</span>
            <span className="text-xs text-blue-500 font-medium ml-1">Hari</span>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/40 border-amber-100/80 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardDescription className="text-amber-600 font-semibold text-xs flex items-center gap-1">
              <span>🤒</span> Total Sakit
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <span className="text-3xl font-extrabold text-amber-900">{stats.sakitCount}</span>
            <span className="text-xs text-amber-500 font-medium ml-1">Hari</span>
          </CardContent>
        </Card>

        <Card className="bg-red-50/40 border-red-100/80 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardDescription className="text-red-600 font-semibold text-xs flex items-center gap-1">
              <span>❌</span> Total Alpa
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <span className="text-3xl font-extrabold text-red-900">{stats.alpaCount}</span>
            <span className="text-xs text-red-500 font-medium ml-1">Hari</span>
          </CardContent>
        </Card>

        <Card className="bg-zinc-50/40 border-zinc-200/60 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardDescription className="text-zinc-600 font-semibold text-xs flex items-center gap-1">
              <span>🌴</span> Total Libur/Off
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <span className="text-3xl font-extrabold text-zinc-800">{stats.liburCount}</span>
            <span className="text-xs text-zinc-500 font-medium ml-1">Hari</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kehadiran Karyawan</CardTitle>
          <CardDescription>
            Data riwayat izin, sakit, alpa, atau libur/off kerja karyawan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
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
              📝 Izin
            </Button>
            <Button
              type="button"
              size="sm"
              variant={izinSakitFilter === "SAKIT" ? "default" : "outline"}
              onClick={() => setIzinSakitFilter("SAKIT")}
            >
              🤒 Sakit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={izinSakitFilter === "ALPA" ? "default" : "outline"}
              onClick={() => setIzinSakitFilter("ALPA")}
            >
              ❌ Alpa
            </Button>
            <Button
              type="button"
              size="sm"
              variant={izinSakitFilter === "LIBUR" ? "default" : "outline"}
              onClick={() => setIzinSakitFilter("LIBUR")}
            >
              🌴 Libur
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto w-full">
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
                    <TableCell colSpan={5} className="text-center py-6 text-zinc-500 text-sm">
                      Tidak ada riwayat kehadiran dengan status terfilter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIzinSakitHistory.map((item, index) => (
                    <TableRow key={String(item.id)}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {formatIzinSakitTanggal(item.tanggal)}
                      </TableCell>
                      <TableCell>{renderIzinSakitBadge(item.status, item.keterangan || item.notes)}</TableCell>
                      <TableCell>{item.keterangan || item.notes || "-"}</TableCell>
                      <TableCell>{item.isLembur || item.lembur ? "Lembur" : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
