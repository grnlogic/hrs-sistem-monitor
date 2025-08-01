"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/display/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Calendar,
  Users,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { leaveAPI } from "@/lib/api";

export default function LeavePage() {
  // State dan hooks HARUS di dalam function component
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [employeeLeaveInfo, setEmployeeLeaveInfo] = useState<{
    [key: string]: any;
  }>({});

  useEffect(() => {
    setLoading(true);
    leaveAPI
      .getAll()
      .then(async (data) => {
        setLeaveData(data);
        setFilteredData(data);

        // Ambil informasi cuti untuk setiap karyawan
        const leaveInfoMap: { [key: string]: any } = {};
        for (const leave of data) {
          if (leave.karyawan?.id && !leaveInfoMap[leave.karyawan.id]) {
            try {
              const info = await leaveAPI.getEmployeeLeaveInfo(
                leave.karyawan.id.toString()
              );
              leaveInfoMap[leave.karyawan.id] = info;
            } catch (err) {
              console.error(
                "Gagal mengambil informasi cuti untuk karyawan:",
                leave.karyawan.id
              );
            }
          }
        }
        setEmployeeLeaveInfo(leaveInfoMap);
      })
      .catch(() => setError("Gagal memuat data cuti"))
      .finally(() => setLoading(false));
  }, []);

  // Handler
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterData(term, typeFilter, statusFilter);
  };

  const filterData = (search: string, type: string, status: string) => {
    let filtered = leaveData;
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.karyawan?.nama?.toLowerCase().includes(search.toLowerCase()) ||
          item.karyawan?.nip?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (type !== "all") {
      filtered = filtered.filter((item) =>
        item.jenisCuti.toLowerCase().includes(type.toLowerCase())
      );
    }
    if (status !== "all") {
      filtered = filtered.filter(
        (item) => item.status.toLowerCase() === status.toLowerCase()
      );
    }
    setFilteredData(filtered);
  };

  const handleApprove = async (id: string) => {
    try {
      await leaveAPI.approve(id);
      setLeaveData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "APPROVED" } : item
        )
      );
      setFilteredData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "APPROVED" } : item
        )
      );
    } catch {}
  };
  const handleReject = async (id: string) => {
    const reason = prompt("Masukkan alasan penolakan:");
    if (!reason) return;
    try {
      await leaveAPI.reject(id, reason);
      setLeaveData((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "REJECTED", alasan: reason }
            : item
        )
      );
      setFilteredData((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "REJECTED", alasan: reason }
            : item
        )
      );
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "CUTI_TAHUNAN":
        return (
          <Badge className="bg-blue-100 text-blue-800">Cuti Tahunan</Badge>
        );
      case "CUTI_SAKIT":
        return <Badge className="bg-red-100 text-red-800">Cuti Sakit</Badge>;
      case "CUTI_MELAHIRKAN":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            Cuti Melahirkan
          </Badge>
        );
      case "CUTI_KHUSUS":
        return (
          <Badge className="bg-orange-100 text-orange-800">Cuti Khusus</Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const leaveStats = {
    total: leaveData.length,
    approved: leaveData.filter((item) => item.status === "APPROVED").length,
    pending: leaveData.filter((item) => item.status === "PENDING").length,
    rejected: leaveData.filter((item) => item.status === "REJECTED").length,
    totalDays: leaveData
      .filter((item) => item.status === "APPROVED")
      .reduce(
        (sum, item) =>
          sum +
          (new Date(item.tanggalSelesai).getTime() -
            new Date(item.tanggalMulai).getTime()) /
            (1000 * 3600 * 24) +
          1,
        0
      ),
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Cuti</h1>
          <p className="text-muted-foreground">
            Kelola pengajuan cuti karyawan
          </p>
        </div>
        <Button asChild>
          <a href="/dashboard/leave/new">
            <Plus className="h-4 w-4 mr-2" />
            Ajukan Cuti
          </a>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengajuan
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveStats.total}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {leaveStats.approved}
            </div>
            <p className="text-xs text-muted-foreground">Pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {leaveStats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {leaveStats.rejected}
            </div>
            <p className="text-xs text-muted-foreground">Pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hari Cuti
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveStats.totalDays}</div>
            <p className="text-xs text-muted-foreground">Hari kerja</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Batas Cuti/Tahun
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Hari kerja per karyawan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Cuti</CardTitle>
          <CardDescription>
            Kelola dan approve pengajuan cuti karyawan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama atau NIP..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Jenis Cuti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="tahunan">Cuti Tahunan</SelectItem>
                <SelectItem value="sakit">Cuti Sakit</SelectItem>
                <SelectItem value="melahirkan">Cuti Melahirkan</SelectItem>
                <SelectItem value="khusus">Cuti Khusus</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="disetujui">Disetujui</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Memuat data cuti...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sisa Hari</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {leave.karyawan?.nama}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {leave.karyawan?.nip}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(leave.jenisCuti)}</TableCell>
                      <TableCell>
                        {new Date(leave.tanggalMulai).toLocaleDateString(
                          "id-ID"
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(leave.tanggalSelesai).toLocaleDateString(
                          "id-ID"
                        )}
                      </TableCell>
                      <TableCell>
                        {Math.ceil(
                          (new Date(leave.tanggalSelesai).getTime() -
                            new Date(leave.tanggalMulai).getTime()) /
                            (1000 * 3600 * 24)
                        ) + 1}{" "}
                        hari
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {leave.alasan}
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        {employeeLeaveInfo[leave.karyawan?.id] ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {employeeLeaveInfo[leave.karyawan?.id].sisaCuti}
                              /12 hari
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  employeeLeaveInfo[leave.karyawan?.id]
                                    .sisaCuti > 6
                                    ? "bg-green-500"
                                    : employeeLeaveInfo[leave.karyawan?.id]
                                        .sisaCuti > 3
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{
                                  width: `${
                                    (employeeLeaveInfo[leave.karyawan?.id]
                                      .sisaCuti /
                                      12) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </DropdownMenuItem>
                            {leave.status === "PENDING" && (
                              <>
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => handleApprove(leave.id)}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleReject(leave.id)}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Tolak
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredData.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center">
                Tidak ada data cuti yang ditemukan
              </TableCell>
            </TableRow>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
