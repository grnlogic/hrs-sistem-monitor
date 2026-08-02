"use client";

import { useState, useEffect } from "react";
import { useCompany } from "@/components/providers/company-provider";
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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { getNamaPtByKode } from "@/lib/constants/perusahaan";
import { employeeAPI } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/navigation/tabs";
import { StatCard } from "./_components/StatCard";
import { DeactivateDialog } from "./_components/DeactivateDialog";
import { ExportDialog } from "./_components/ExportDialog";
import { UnlockDialog } from "./_components/UnlockDialog";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("Aktif");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUrls, setAvatarUrls] = useState<{ [key: string]: string }>({});
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<Employee | null>(
    null
  );
  const [isDeactivating, setIsDeactivating] = useState(false);
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
  const [successMessage, setSuccessMessage] = useState("");
  const [isSensitiveUnlocked, setIsSensitiveUnlocked] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [pendingUnlockAction, setPendingUnlockAction] = useState<
    "preview" | "export"
  >("preview");
  const { company } = useCompany();

  useEffect(() => {
    fetchEmployees();

    // Periksa cookie apakah akses sensitif sudah pernah dibuka sebelumnya (misal dalam 4 jam terakhir)
    const isUnlockedCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sensitive_data_unlocked="));
    if (isUnlockedCookie && isUnlockedCookie.split("=")[1] === "true") {
      setIsSensitiveUnlocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const handleDeactivateEmployee = async (employee: Employee) => {
    setIsDeactivating(true);
    try {
      await employeeAPI.deactivate(employee.id.toString());

      // Biarkan 3 detik loading pop up sebelum menutup dan memperbarui UI
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, status: "Tidak Aktif" } : emp
        )
      );
      setFilteredEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, status: "Tidak Aktif" } : emp
        )
      );
      setEmployeeToDeactivate(null);
      setDeactivateDialogOpen(false);
      setError("");

      setSuccessMessage(`Karyawan ${employee.name} berhasil dinonaktifkan`);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: any) {
      setError("Gagal menonaktifkan karyawan: " + (err.message || err));
      console.error("Error deactivating employee:", err);
      setDeactivateDialogOpen(false);
      setEmployeeToDeactivate(null);
    } finally {
      setIsDeactivating(false);
    }
  };

  const promptDeactivateEmployee = (employee: Employee) => {
    setEmployeeToDeactivate(employee);
    setDeactivateDialogOpen(true);
    setError("");
  };

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  // Function untuk load foto dengan authentication
  const loadAvatarWithAuth = async (employeeId: string, avatarUrl: string) => {
    const token = localStorage.getItem("token");
    if (!token || !avatarUrl) return;

    const avatarWithVersion = `${avatarUrl}${
      avatarUrl.includes("?") ? "&" : "?"
    }v=${Date.now()}`;

    try {
      const response = await fetch(avatarWithVersion, {
        cache: "no-store",
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
        lokasiDefault:
          String(emp.lokasiDefault || "").toUpperCase() === "SP"
            ? "SP"
            : String(emp.lokasiDefault || "").toUpperCase() === "PRIMA"
            ? "PRIMA"
            : "PJP",
        position: emp.jabatan || emp.position || "-",
        status:
          emp.statusKaryawan === "AKTIF"
            ? "Aktif"
            : (emp.statusKaryawan === "TIDAK_AKTIF" || emp.statusKaryawan === "NONAKTIF" || emp.statusKaryawan === "NON_AKTIF")
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

  const formatLokasiLabel = (lokasi?: "PJP" | "SP" | "PRIMA") => {
    return getNamaPtByKode(lokasi);
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

  const maskName = (name?: string | null) => {
    if (!name || name === "-") return "-";
    const trimmed = name.trim();
    if (trimmed.length <= 2) return `${trimmed[0] || "*"}*`;
    return `${trimmed.slice(0, 2)}${"*".repeat(Math.max(trimmed.length - 2, 2))}`;
  };

  const maskNIK = (nik?: string | null) => {
    if (!nik || nik === "-") return "-";
    const clean = nik.trim();
    if (clean.length <= 4) return "*".repeat(clean.length);
    return `${"*".repeat(clean.length - 4)}${clean.slice(-4)}`;
  };

  const maskEmail = (email?: string | null) => {
    if (!email || email === "-") return "-";
    const atIndex = email.indexOf("@");
    if (atIndex <= 1) return "***";
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    return `${local[0]}${"*".repeat(Math.max(local.length - 1, 2))}${domain}`;
  };

  const verifySensitivePassword = async (password: string) => {
    const response = await fetch("/api/security/sensitive-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || "Password tidak valid");
    }

    return true;
  };

  const askUnlockForAction = (action: "preview" | "export") => {
    setPendingUnlockAction(action);
    setUnlockPassword("");
    setUnlockError("");
    setUnlockDialogOpen(true);
  };

  const handleUnlockSensitiveData = async () => {
    if (!unlockPassword.trim()) {
      setUnlockError("Password wajib diisi");
      return;
    }

    setIsUnlocking(true);
    setUnlockError("");
    try {
      await verifySensitivePassword(unlockPassword.trim());
      setIsSensitiveUnlocked(true);
      
      // Simpan di cookies selama 4 jam agar tidak perlu sering-sering isi password
      const date = new Date();
      date.setTime(date.getTime() + 4 * 60 * 60 * 1000);
      document.cookie = `sensitive_data_unlocked=true;expires=${date.toUTCString()};path=/`;

      setUnlockDialogOpen(false);
      setUnlockPassword("");
      setSuccessMessage("Data sensitif berhasil dibuka (aktif selama 4 jam)");
      setTimeout(() => setSuccessMessage(""), 5000);

      if (pendingUnlockAction === "export") {
        setExportDialogOpen(true);
      }
    } catch (err: any) {
      setUnlockError(err.message || "Password tidak valid");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handlePreviewAllClick = () => {
    if (isSensitiveUnlocked) {
      setIsSensitiveUnlocked(false);
      
      // Hapus cookie jika user sengaja mengunci kembali
      document.cookie = "sensitive_data_unlocked=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";

      setSuccessMessage("Data sensitif berhasil dikunci kembali");
      setTimeout(() => setSuccessMessage(""), 5000);
      return;
    }

    askUnlockForAction("preview");
  };

  const handleOpenExportDialog = () => {
    if (!isSensitiveUnlocked) {
      askUnlockForAction("export");
      return;
    }

    setExportDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aktif":
        return <Badge className="bg-zinc-100 text-zinc-900">Aktif</Badge>;
      case "Tidak Aktif":
        return <Badge variant="destructive">Tidak Aktif</Badge>;
      case "Cuti":
        return <Badge className="bg-zinc-100 text-zinc-800">Cuti</Badge>;
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
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
          <Button
            variant={isSensitiveUnlocked ? "secondary" : "outline"}
            onClick={handlePreviewAllClick}
          >
            {isSensitiveUnlocked ? "Kunci Data Sensitif" : "Preview All Data"}
          </Button>
          <ExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            exportFormat={exportFormat}
            onExportFormatChange={setExportFormat}
            selectedFields={selectedFields}
            onFieldToggle={handleFieldToggle}
            availableFields={availableFields}
            isExporting={isExporting}
            onExport={handleExport}
            onOpenDialog={handleOpenExportDialog}
            isSensitiveUnlocked={isSensitiveUnlocked}
            filteredCount={filteredEmployees.length}
            totalCount={employees.length}
          />
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

      {successMessage && (
        <Alert className="border-zinc-200 bg-zinc-50">
          <AlertDescription className="text-zinc-900">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Karyawan"
          value={employeeStats.total}
          description="Semua karyawan"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Karyawan Aktif"
          value={employeeStats.active}
          description="Sedang bekerja"
          icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Tidak Aktif"
          value={employeeStats.inactive}
          description="Tidak bekerja"
          icon={<UserX className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Departemen"
          value={employeeStats.departments}
          description="Total departemen"
          icon={<Building className="h-4 w-4 text-muted-foreground" />}
        />
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
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
            <TabsList>
              <TabsTrigger value="Aktif">Karyawan Aktif</TabsTrigger>
              <TabsTrigger value="Tidak Aktif">Karyawan Nonaktif</TabsTrigger>
              <TabsTrigger value="Cuti">Cuti</TabsTrigger>
              <TabsTrigger value="all">Semua Karyawan</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
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
                  <TableHead>Lokasi</TableHead>
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
                          <div className="font-medium">
                            {isSensitiveUnlocked
                              ? employee.name
                              : maskName(employee.name)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {isSensitiveUnlocked
                              ? employee.email
                              : maskEmail(employee.email)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {isSensitiveUnlocked
                        ? employee.nip
                        : maskNIK(employee.nip)}
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{formatLokasiLabel(employee.lokasiDefault)}</TableCell>
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
                              promptDeactivateEmployee(employee);
                            }}
                            className="text-red-600"
                            disabled={employee.status === "Tidak Aktif"}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Nonaktifkan
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

      <DeactivateDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        employeeToDeactivate={employeeToDeactivate}
        isDeactivating={isDeactivating}
        onConfirm={() => {
          if (employeeToDeactivate) {
            handleDeactivateEmployee(employeeToDeactivate);
          }
        }}
        onCancel={() => {
          setEmployeeToDeactivate(null);
          setDeactivateDialogOpen(false);
        }}
      />

      <UnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        unlockPassword={unlockPassword}
        onPasswordChange={setUnlockPassword}
        unlockError={unlockError}
        isUnlocking={isUnlocking}
        onUnlock={handleUnlockSensitiveData}
        onCancel={() => {
          setUnlockDialogOpen(false);
          setUnlockPassword("");
          setUnlockError("");
        }}
        pendingUnlockAction={pendingUnlockAction}
      />
    </div>
  );
}
