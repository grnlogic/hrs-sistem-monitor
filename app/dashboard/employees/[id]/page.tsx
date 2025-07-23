"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Badge } from "@/components/ui/display/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import { ArrowLeft, Edit, Phone, Mail, Calendar, Building } from "lucide-react";
import { employeeAPI } from "@/lib/api";

export default function EmployeeDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("personal");
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [violationHistory, setViolationHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const id =
          typeof params.id === "string"
            ? params.id
            : Array.isArray(params.id)
            ? params.id[0]
            : "";
        const data = await employeeAPI.getById(id);

        // Ambil data utama dari data.karyawan
        let karyawan = data.karyawan;
        if (!karyawan || String(karyawan.id) !== String(id)) {
          throw new Error("Karyawan tidak ditemukan");
        }

        // Filter data cuti, pelanggaran, absensi, gaji berdasarkan karyawan.id
        const cuti = (data.cuti || []).filter(
          (c: any) => String(c.karyawan?.id) === String(id)
        );
        const pelanggaran = (data.pelanggaran || []).filter(
          (p: any) => String(p.karyawan?.id) === String(id)
        );
        const absensi = (data.absensi || []).filter(
          (a: any) => String(a.karyawan?.id) === String(id)
        );
        const gaji = (data.gaji || []).filter(
          (g: any) => String(g.karyawan?.id) === String(id)
        );

        // Mapping data karyawan
        const mapped = {
          id: karyawan.id,
          name: karyawan.namaLengkap || karyawan.name || "-",
          nip: karyawan.nik || karyawan.nip || "-",
          department: karyawan.departemen || karyawan.department || "-",
          position: karyawan.jabatan || karyawan.position || "-",
          status:
            karyawan.statusKaryawan === "AKTIF"
              ? "Aktif"
              : karyawan.statusKaryawan === "TIDAK_AKTIF"
              ? "Tidak Aktif"
              : karyawan.statusKaryawan === "CUTI"
              ? "Cuti"
              : karyawan.statusKaryawan || karyawan.status || "-",
          joinDate: karyawan.tanggalMasuk || karyawan.joinDate || null,
          phone: karyawan.noHp || karyawan.phone || "-",
          email: karyawan.email || "-",
          address: karyawan.alamat || karyawan.address || "-",
          birthDate: karyawan.tanggalLahir || karyawan.birthDate || null,
          avatar: karyawan.fotoProfil || karyawan.avatar || null,
          salary: karyawan.gajiPerHari
            ? `Rp ${Number(karyawan.gajiPerHari).toLocaleString("id-ID")}`
            : karyawan.salary || "-",
          emergencyContact: {
            name: karyawan.kontakDaruratNama || "-",
            relation: karyawan.kontakDaruratHubungan || "-",
            phone: karyawan.kontakDaruratNoHp || "-",
          },
        };
        setEmployee(mapped);
        setSalaryHistory(gaji);
        setAttendanceHistory(absensi);
        setLeaveHistory(
          cuti.map((c: any) => ({
            ...c,
            karyawan: undefined, // Hilangkan field karyawan agar tidak error di table
          }))
        );
        setViolationHistory(
          pelanggaran.map((p: any) => ({
            ...p,
            karyawan: undefined,
          }))
        );
      } catch (err) {
        setError("Gagal memuat data karyawan");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aktif":
      case "Hadir":
      case "Disetujui":
      case "Dibayar":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            {status}
          </Badge>
        );
      case "Terlambat":
      case "Pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {status}
          </Badge>
        );
      case "Sakit":
      case "Ditolak":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">
          {error || "Data karyawan tidak ditemukan"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <a href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Detail Karyawan
            </h1>
            <p className="text-gray-600">Informasi lengkap karyawan</p>
          </div>
        </div>
        <Button asChild>
          <a href={`/dashboard/employees/${employee.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Data
          </a>
        </Button>
      </div>

      {/* Employee Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={employee.avatar || "/placeholder.svg"}
                alt={employee.name}
              />
              <AvatarFallback className="text-2xl">
                {employee.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {employee.name}
                </h2>
                <p className="text-lg text-gray-600">{employee.position}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500">
                    NIP: {employee.nip}
                  </span>
                  {getStatusBadge(employee.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.department}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.phone}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {employee.email}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Bergabung{" "}
                    {new Date(employee.joinDate).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Data Pribadi</TabsTrigger>
          <TabsTrigger value="salary">Riwayat Gaji</TabsTrigger>
          <TabsTrigger value="attendance">Riwayat Absensi</TabsTrigger>
          <TabsTrigger value="leave">Riwayat Cuti</TabsTrigger>
          <TabsTrigger value="violations">Pelanggaran</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pribadi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tanggal Lahir
                  </label>
                  <p className="text-gray-900">
                    {new Date(employee.birthDate).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Alamat
                  </label>
                  <p className="text-gray-900">{employee.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Gaji Pokok
                  </label>
                  <p className="text-gray-900">{employee.salary}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kontak Darurat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nama
                  </label>
                  <p className="text-gray-900">
                    {employee.emergencyContact.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Hubungan
                  </label>
                  <p className="text-gray-900">
                    {employee.emergencyContact.relation}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nomor Telepon
                  </label>
                  <p className="text-gray-900">
                    {employee.emergencyContact.phone}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="salary">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Gaji</CardTitle>
              <CardDescription>
                Histori pembayaran gaji karyawan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Potongan</TableHead>
                    <TableHead>Gaji Bersih</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Tidak ada data gaji
                      </TableCell>
                    </TableRow>
                  ) : (
                    salaryHistory.map((salary, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {salary.periode || "-"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(salary.gajiPokok || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(salary.bonus || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(salary.potongan || 0)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(salary.gajiBersih || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(salary.status || "-")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
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
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Cuti</CardTitle>
              <CardDescription>
                Histori pengajuan dan persetujuan cuti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Tanggal Mulai</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alasan</TableHead>
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
                        <TableCell className="font-medium">
                          {leave.jenisCuti || "-"}
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
                          {leave.tanggalMulai && leave.tanggalSelesai
                            ? (new Date(leave.tanggalSelesai).getTime() -
                                new Date(leave.tanggalMulai).getTime()) /
                                (1000 * 60 * 60 * 24) +
                              1 +
                              " hari"
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(leave.status || "-")}
                        </TableCell>
                        <TableCell>{leave.alasan || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
