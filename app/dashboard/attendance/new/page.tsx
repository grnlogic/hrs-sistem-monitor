"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Textarea } from "@/components/ui/form/textarea";
import { Checkbox } from "@/components/ui/form/checkbox";
import { ArrowLeft, Save, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { attendanceAPI, employeeAPI } from "@/lib/api";
// Tipe lokal agar nik dan namaLengkap tidak error
type EmployeeOption = {
  id: string;
  nik: string;
  namaLengkap: string;
};

export default function NewAttendancePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const data = await employeeAPI.getAll();
      // Mapping agar field namaLengkap dan nik selalu ada
      const mappedEmployees = data.map((emp: any) => ({
        ...emp,
        namaLengkap: emp.namaLengkap || emp.name || "(Tanpa Nama)",
        nik: emp.nik || emp.nip || "(Tanpa NIK)",
      }));
      console.log("Mapped Employees:", mappedEmployees); // Debug
      setEmployees(mappedEmployees);
    } catch (err) {
      setError("Gagal memuat data karyawan");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const attendanceData = {
      karyawanId: formData.get("karyawanId") as string,
      tanggal: formData.get("tanggal") as string, // gunakan 'tanggal', bukan 'date'
      status: (formData.get("status") as string) || "Hadir",
    };

    try {
      await attendanceAPI.create(attendanceData);
      setSuccess("Absensi berhasil dicatat!");
      setTimeout(() => {
        router.push("/dashboard/attendance");
      }, 2000);
    } catch (err) {
      setError("Gagal mencatat absensi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingEmployees) {
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Input Absensi</h1>
          <p className="text-muted-foreground">Catat kehadiran karyawan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Attendance Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Informasi Absensi
            </CardTitle>
            <CardDescription>Data kehadiran karyawan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="karyawanId">Karyawan *</Label>
                <Select name="karyawanId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {(employee.nik || "(Tanpa NIK)") +
                          " - " +
                          (employee.namaLengkap || "(Tanpa Nama)")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal *</Label>
                <Input
                  id="tanggal"
                  name="tanggal"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status Kehadiran *</Label>
                <Select name="status" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hadir">Hadir</SelectItem>
                    <SelectItem value="Terlambat">Terlambat</SelectItem>
                    <SelectItem value="Alpha">Alpha</SelectItem>
                    <SelectItem value="Izin">Izin</SelectItem>
                    <SelectItem value="Sakit">Sakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Absensi
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
