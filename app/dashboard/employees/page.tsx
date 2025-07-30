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
  Edit,
  Users,
  UserCheck,
  UserX,
  Building,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { employeeAPI } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUrls, setAvatarUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  // Function untuk load foto dengan authentication
  const loadAvatarWithAuth = async (employeeId: string, avatarUrl: string) => {
    const token = localStorage.getItem("token");
    if (!token || !avatarUrl) return;

    try {
      const response = await fetch(avatarUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setAvatarUrls((prev) => ({
          ...prev,
          [employeeId]: imageUrl,
        }));
      }
    } catch (error) {
      console.error(`Gagal memuat foto untuk karyawan ${employeeId}:`, error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await employeeAPI.getAll();
      // Mapping data dari API ke struktur yang diharapkan frontend
      const mapped = data.map((emp: any) => ({
        id: emp.id,
        name: emp.namaLengkap || emp.name || "-",
        nip: emp.nik || emp.nip || "-",
        department: emp.departemen || emp.department || "-",
        position: emp.jabatan || emp.position || "-",
        status:
          emp.statusKaryawan === "AKTIF"
            ? "Aktif"
            : emp.statusKaryawan === "TIDAK_AKTIF"
            ? "Tidak Aktif"
            : emp.statusKaryawan === "CUTI"
            ? "Cuti"
            : emp.statusKaryawan || emp.status || "-",
        joinDate: emp.tanggalMasuk || emp.joinDate || null,
        email: emp.email || "-",
        // Jika ada foto profil, gunakan endpoint foto dari backend
        // Endpoint: GET /api/karyawan/{id}/foto
        avatar: emp.fotoProfil
          ? employeeAPI.getFotoUrl(emp.id.toString())
          : null,
        // tambahkan field lain jika perlu
        emergencyContact: {
          name: emp.namaKontakDarurat || "-",
          relation: emp.hubunganKontakDarurat || "-",
          phone: emp.noTeleponKontakDarurat || "-",
        },
      }));
      setEmployees(mapped);
    } catch (err) {
      setError("Gagal memuat data karyawan");
    } finally {
      setIsLoading(false);
    }
  };

  // Load foto untuk semua karyawan setelah data dimuat
  useEffect(() => {
    if (employees.length > 0) {
      employees.forEach((employee) => {
        if (employee.avatar) {
          loadAvatarWithAuth(employee.id.toString(), employee.avatar);
        }
      });
    }
  }, [employees]);

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(
        (employee) =>
          employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(
        (employee) => employee.department === departmentFilter
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (employee) => employee.status === statusFilter
      );
    }

    setFilteredEmployees(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aktif":
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>;
      case "Tidak Aktif":
        return <Badge variant="destructive">Tidak Aktif</Badge>;
      case "Cuti":
        return <Badge className="bg-yellow-100 text-yellow-800">Cuti</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const employeeStats = {
    total: employees.length,
    active: employees.filter((emp) => emp.status === "Aktif").length,
    inactive: employees.filter((emp) => emp.status === "Tidak Aktif").length,
    departments: [...new Set(employees.map((emp) => emp.department))].length,
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Karyawan
          </h1>
          <p className="text-muted-foreground">
            Kelola data dan informasi karyawan
          </p>
        </div>
        <Button asChild>
          <a href="/dashboard/employees/new">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Karyawan
          </a>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Karyawan
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeStats.total}</div>
            <p className="text-xs text-muted-foreground">Semua karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Karyawan Aktif
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employeeStats.active}
            </div>
            <p className="text-xs text-muted-foreground">Sedang bekerja</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidak Aktif</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {employeeStats.inactive}
            </div>
            <p className="text-xs text-muted-foreground">Tidak bekerja</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departemen</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employeeStats.departments}
            </div>
            <p className="text-xs text-muted-foreground">Total departemen</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Karyawan</CardTitle>
          <CardDescription>
            Informasi lengkap semua karyawan perusahaan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan nama, NIP, atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {[...new Set(employees.map((emp) => emp.department))].map(
                  (dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                <SelectItem value="Cuti">Cuti</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Tanggal Masuk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={avatarUrls[employee.id] || "/placeholder.svg"}
                            alt={employee.name}
                            onError={(e) => {
                              // Jika gambar gagal dimuat, gunakan fallback
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                            }}
                          />
                          <AvatarFallback>
                            {employee.name
                              ? employee.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{employee.nip}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      {new Date(employee.joinDate).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <a href={`/dashboard/employees/${employee.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat Detail
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={`/dashboard/employees/${employee.id}/edit`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Karyawan
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredEmployees.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Tidak ada data karyawan yang ditemukan
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
