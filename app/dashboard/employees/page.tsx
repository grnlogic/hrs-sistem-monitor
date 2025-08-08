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
  DropdownMenuSeparator,
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
  Trash2,
  Users,
  UserCheck,
  UserX,
  Building,
  Download,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlay/dialog";
import { Checkbox } from "@/components/ui/form/checkbox";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedDataInfo, setRelatedDataInfo] = useState<string>("");
  const [showForceDeleteOption, setShowForceDeleteOption] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"safe" | "force">("safe");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "name",
    "nip",
    "department",
    "position",
    "status",
    "joinDate",
    "email",
  ]);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDeleteEmployee = async (employee: Employee) => {
    setIsDeleting(true);
    try {
      if (deleteMode === "force") {
        // Force delete dengan semua data terkait
        await employeeAPI.forceDelete(employee.id.toString());
      } else {
        // Safe delete (default)
        await employeeAPI.delete(employee.id.toString());
      }

      setEmployees((prev) => prev.filter((emp) => emp.id !== employee.id));
      setFilteredEmployees((prev) =>
        prev.filter((emp) => emp.id !== employee.id)
      );
      setEmployeeToDelete(null);
      setDeleteDialogOpen(false);
      setShowForceDeleteOption(false);
      setDeleteMode("safe");
      setRelatedDataInfo("");
    } catch (err: any) {
      // Jika gagal karena ada data terkait, tampilkan opsi force delete
      if (err.message && err.message.includes("data terkait")) {
        setShowForceDeleteOption(true);
        setError(err.message);
      } else {
        setError("Gagal menghapus karyawan: " + (err.message || err));
        console.error("Error deleting employee:", err);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Fungsi untuk cek data terkait sebelum delete
  const handleCheckRelatedData = async (employee: Employee) => {
    try {
      const response = await employeeAPI.checkRelatedData(
        employee.id.toString()
      );
      setRelatedDataInfo(response);
      setEmployeeToDelete(employee);
      setDeleteDialogOpen(true);
      setShowForceDeleteOption(false);
      setDeleteMode("safe");
    } catch (err: any) {
      setError("Gagal mengecek data terkait: " + (err.message || err));
      console.error("Error checking related data:", err);
    }
  };

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

  // Fungsi untuk export ke PDF
  const exportToPDF = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text("Data Karyawan", 14, 15);
      doc.setFontSize(10);
      doc.text(
        `Diekspor pada: ${new Date().toLocaleDateString("id-ID")}`,
        14,
        25
      );

      // Mapping field names
      const fieldMapping: { [key: string]: string } = {
        name: "Nama",
        nip: "NIK",
        department: "Departemen",
        position: "Posisi",
        status: "Status",
        joinDate: "Tanggal Masuk",
        email: "Email",
        emergencyContactName: "Kontak Darurat",
        emergencyContactPhone: "No. Telepon Darurat",
      };

      // Prepare headers
      const headers = selectedFields.map(
        (field) => fieldMapping[field] || field
      );

      // Prepare data
      const data = filteredEmployees.map((employee) => {
        return selectedFields.map((field) => {
          switch (field) {
            case "name":
              return employee.name;
            case "nip":
              return employee.nip;
            case "department":
              return employee.department;
            case "position":
              return employee.position;
            case "status":
              return employee.status;
            case "joinDate":
              return employee.joinDate
                ? new Date(employee.joinDate).toLocaleDateString("id-ID")
                : "-";
            case "email":
              return employee.email;
            case "emergencyContactName":
              return employee.emergencyContact?.name || "-";
            case "emergencyContactPhone":
              return employee.emergencyContact?.phone || "-";
            default:
              return "-";
          }
        });
      });

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Save file
      doc.save(`data-karyawan-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      setError("Gagal mengekspor ke PDF");
    }
  };

  // Fungsi untuk export ke Excel
  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      // Mapping field names
      const fieldMapping: { [key: string]: string } = {
        name: "Nama",
        nip: "NIK",
        department: "Departemen",
        position: "Posisi",
        status: "Status",
        joinDate: "Tanggal Masuk",
        email: "Email",
        emergencyContactName: "Kontak Darurat",
        emergencyContactPhone: "No. Telepon Darurat",
      };

      // Prepare data for Excel
      const data = filteredEmployees.map((employee) => {
        const row: { [key: string]: any } = {};

        selectedFields.forEach((field) => {
          const header = fieldMapping[field] || field;
          switch (field) {
            case "name":
              row[header] = employee.name;
              break;
            case "nip":
              row[header] = employee.nip;
              break;
            case "department":
              row[header] = employee.department;
              break;
            case "position":
              row[header] = employee.position;
              break;
            case "status":
              row[header] = employee.status;
              break;
            case "joinDate":
              row[header] = employee.joinDate
                ? new Date(employee.joinDate).toLocaleDateString("id-ID")
                : "-";
              break;
            case "email":
              row[header] = employee.email;
              break;
            case "emergencyContactName":
              row[header] = employee.emergencyContact?.name || "-";
              break;
            case "emergencyContactPhone":
              row[header] = employee.emergencyContact?.phone || "-";
              break;
            default:
              row[header] = "-";
          }
        });

        return row;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Karyawan");

      // Save file
      XLSX.writeFile(
        workbook,
        `data-karyawan-${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      setError("Gagal mengekspor ke Excel");
    }
  };

  // Handle export
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setError("Pilih minimal satu field untuk diekspor");
      return;
    }

    setIsExporting(true);
    try {
      if (exportFormat === "pdf") {
        await exportToPDF();
      } else {
        await exportToExcel();
      }
      setExportDialogOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      setError("Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle field selection
  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Available fields for export
  const availableFields = [
    { key: "name", label: "Nama Lengkap" },
    { key: "nip", label: "NIK" },
    { key: "department", label: "Departemen" },
    { key: "position", label: "Posisi/Jabatan" },
    { key: "status", label: "Status Karyawan" },
    { key: "joinDate", label: "Tanggal Masuk" },
    { key: "email", label: "Email" },
    { key: "emergencyContactName", label: "Nama Kontak Darurat" },
    { key: "emergencyContactPhone", label: "No. Telepon Darurat" },
  ];

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
        <div className="flex gap-2">
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Export Data Karyawan</DialogTitle>
                <DialogDescription>
                  Pilih data yang ingin diekspor dan format file yang
                  diinginkan.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Format Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Format Export
                  </label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="pdf"
                        name="format"
                        value="pdf"
                        checked={exportFormat === "pdf"}
                        onChange={(e) =>
                          setExportFormat(e.target.value as "pdf" | "excel")
                        }
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor="pdf"
                        className="flex items-center text-sm"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="excel"
                        name="format"
                        value="excel"
                        checked={exportFormat === "excel"}
                        onChange={(e) =>
                          setExportFormat(e.target.value as "pdf" | "excel")
                        }
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor="excel"
                        className="flex items-center text-sm"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        Excel
                      </label>
                    </div>
                  </div>
                </div>

                {/* Field Selection */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Data yang Diekspor
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {availableFields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={field.key}
                          checked={selectedFields.includes(field.key)}
                          onCheckedChange={() => handleFieldToggle(field.key)}
                        />
                        <label htmlFor={field.key} className="text-sm">
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedFields.length} dari {availableFields.length} field
                    dipilih
                  </p>
                </div>

                {/* Info */}
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Info:</strong> Data akan diekspor berdasarkan filter
                    yang sedang aktif. Saat ini akan mengekspor{" "}
                    {filteredEmployees.length} dari {employees.length} karyawan.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setExportDialogOpen(false)}
                  disabled={isExporting}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting || selectedFields.length === 0}
                >
                  {isExporting
                    ? "Mengekspor..."
                    : `Export ${exportFormat.toUpperCase()}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button asChild>
            <a href="/dashboard/employees/new">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Karyawan
            </a>
          </Button>
        </div>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              handleCheckRelatedData(employee);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Karyawan
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Hapus Karyawan
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Anda akan menghapus karyawan{" "}
                <span className="font-semibold">{employeeToDelete?.name}</span>
              </p>

              {relatedDataInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    Informasi Data Terkait:
                  </p>
                  <p className="text-sm text-blue-700">{relatedDataInfo}</p>
                </div>
              )}

              {showForceDeleteOption && (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ Pilih Mode Penghapusan:
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="safe-delete"
                        name="deleteMode"
                        value="safe"
                        checked={deleteMode === "safe"}
                        onChange={(e) =>
                          setDeleteMode(e.target.value as "safe" | "force")
                        }
                        className="h-4 w-4"
                      />
                      <label htmlFor="safe-delete" className="text-sm">
                        <span className="font-medium text-green-700">
                          Safe Delete
                        </span>
                        <span className="text-gray-600">
                          {" "}
                          - Hanya hapus data karyawan (menjaga histori)
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="force-delete"
                        name="deleteMode"
                        value="force"
                        checked={deleteMode === "force"}
                        onChange={(e) =>
                          setDeleteMode(e.target.value as "safe" | "force")
                        }
                        className="h-4 w-4"
                      />
                      <label htmlFor="force-delete" className="text-sm">
                        <span className="font-medium text-red-700">
                          Force Delete
                        </span>
                        <span className="text-gray-600">
                          {" "}
                          - Hapus semua data termasuk histori
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-xs text-red-700">
                      ⚠️ <strong>Peringatan:</strong> Force Delete akan
                      menghapus semua data absensi, gaji, cuti, dan pelanggaran.
                      Data yang terhapus tidak dapat dikembalikan!
                    </p>
                  </div>
                </div>
              )}

              {!showForceDeleteOption && (
                <p className="text-sm text-gray-600">
                  Aksi ini akan menghapus data karyawan. Jika karyawan memiliki
                  data terkait, sistem akan memberikan opsi penghapusan yang
                  sesuai.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setEmployeeToDelete(null);
                setDeleteDialogOpen(false);
                setShowForceDeleteOption(false);
                setDeleteMode("safe");
                setRelatedDataInfo("");
              }}
              disabled={isDeleting}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (employeeToDelete) {
                  handleDeleteEmployee(employeeToDelete);
                }
              }}
              disabled={isDeleting}
              className={`${
                deleteMode === "force"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isDeleting
                ? "Menghapus..."
                : deleteMode === "force"
                ? "Force Delete"
                : "Hapus Karyawan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
