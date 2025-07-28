"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Card,
  CardContent,
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import { Plus, AlertTriangle, Clock } from "lucide-react";
import { getAllViolations, addViolation, employeeAPI } from "@/lib/api";

export default function ViolationsPage() {
  const [violations, setViolations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    karyawanId: "",
    jenisPelanggaran: "",
    tanggalKejadian: "",
    jenisSanksi: "",
    dokumenBukti: "",
    catatan: "",
    tindakLanjut: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [violationsResponse, employeesResponse] = await Promise.all([
        getAllViolations(),
        employeeAPI.getAll(),
      ]);
      setViolations(violationsResponse);
      setEmployees(employeesResponse);
    } catch (err) {
      setError("Gagal memuat data pelanggaran");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: any) => {
    e.preventDefault();
    try {
      await addViolation({
        karyawan: { id: Number(form.karyawanId) },
        jenisPelanggaran: form.jenisPelanggaran,
        tanggalKejadian: form.tanggalKejadian,
        jenisSanksi: form.jenisSanksi,
        dokumenBukti: form.dokumenBukti,
        catatan: form.catatan,
        tindakLanjut: form.tindakLanjut,
      });
      setShowForm(false);
      setForm({
        karyawanId: "",
        jenisPelanggaran: "",
        tanggalKejadian: "",
        jenisSanksi: "",
        dokumenBukti: "",
        catatan: "",
        tindakLanjut: "",
      });
      fetchData();
    } catch (err) {
      setError("Gagal menambah pelanggaran");
    }
  };

  const violationStats = {
    total: violations.length,
    ringan: violations.filter((item) => item.jenisSanksi === "Ringan").length,
    sedang: violations.filter((item) => item.jenisSanksi === "Sedang").length,
    berat: violations.filter((item) => item.jenisSanksi === "Berat").length,
    selesai: violations.filter((item) => item.tindakLanjut === "Selesai")
      .length,
    proses: violations.filter((item) => item.tindakLanjut === "Dalam Proses")
      .length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Pelanggaran
          </h1>
          <p className="text-muted-foreground">
            Kelola pelanggaran dan sanksi karyawan
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pelanggaran
        </Button>
      </div>
      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Tambah Pelanggaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleAdd}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label>Karyawan</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.karyawanId}
                  onChange={(e) =>
                    setForm({ ...form, karyawanId: e.target.value })
                  }
                  required
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.nip})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Jenis Pelanggaran</label>
                <Input
                  value={form.jenisPelanggaran}
                  onChange={(e) =>
                    setForm({ ...form, jenisPelanggaran: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label>Tanggal Kejadian</label>
                <Input
                  type="date"
                  value={form.tanggalKejadian}
                  onChange={(e) =>
                    setForm({ ...form, tanggalKejadian: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label>Jenis Sanksi</label>
                <Input
                  value={form.jenisSanksi}
                  onChange={(e) =>
                    setForm({ ...form, jenisSanksi: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Dokumen Bukti</label>
                <Input
                  value={form.dokumenBukti}
                  onChange={(e) =>
                    setForm({ ...form, dokumenBukti: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Catatan</label>
                <Input
                  value={form.catatan}
                  onChange={(e) =>
                    setForm({ ...form, catatan: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label>Tindak Lanjut</label>
                <Input
                  value={form.tindakLanjut}
                  onChange={(e) =>
                    setForm({ ...form, tindakLanjut: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pelanggaran
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{violationStats.total}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ringan</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {violationStats.ringan}
            </div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sedang</CardTitle>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {violationStats.sedang}
            </div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berat</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {violationStats.berat}
            </div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {violationStats.selesai}
            </div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {violationStats.proses}
            </div>
            <p className="text-xs text-muted-foreground">Kasus</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggaran Karyawan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis Pelanggaran</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Jenis Sanksi</TableHead>
                  <TableHead>Dokumen Bukti</TableHead>
                  <TableHead>Tindak Lanjut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((violation) => {
                  const employee =
                    violation.karyawan ||
                    employees.find(
                      (emp) =>
                        emp.id === violation.karyawan?.id ||
                        emp.id === violation.karyawan
                    );
                  return (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={employee?.avatar || "/placeholder.svg"}
                              alt={employee?.name}
                            />
                            <AvatarFallback>
                              {employee?.name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.nip}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{violation.tanggalKejadian}</TableCell>
                      <TableCell className="font-medium">
                        {violation.jenisPelanggaran}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {violation.catatan}
                      </TableCell>
                      <TableCell>{violation.jenisSanksi}</TableCell>
                      <TableCell>{violation.dokumenBukti}</TableCell>
                      <TableCell>{violation.tindakLanjut}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {violations.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Tidak ada data pelanggaran yang ditemukan
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
