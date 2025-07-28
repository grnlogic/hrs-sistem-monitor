"use client";

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/navigation/tabs";
import { generateSalaryAPI } from "@/lib/api";

export default function ProcessSalaryPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form data untuk STAFF
  const [staffPeriod, setStaffPeriod] = useState("");

  // Form data untuk non-STAFF
  const [nonStaffStartDate, setNonStaffStartDate] = useState("");
  const [nonStaffEndDate, setNonStaffEndDate] = useState("");

  const generateStaffSalary = async () => {
    if (!staffPeriod) {
      setMessage({
        type: "error",
        text: "Periode harus diisi (format: YYYY-MM)",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await generateSalaryAPI.generateStaffBulanan(staffPeriod);
      setMessage({ type: "success", text: result });
      setStaffPeriod("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Gagal generate gaji STAFF",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNonStaffSalary = async () => {
    if (!nonStaffStartDate || !nonStaffEndDate) {
      setMessage({ type: "error", text: "Tanggal awal dan akhir harus diisi" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await generateSalaryAPI.generateNonStaffMingguan(
        nonStaffStartDate,
        nonStaffEndDate
      );
      setMessage({ type: "success", text: result });
      setNonStaffStartDate("");
      setNonStaffEndDate("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Gagal generate gaji non-STAFF",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Proses Generate Gaji</h1>

      {message && (
        <Alert
          className={`mb-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <AlertDescription
            className={
              message.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff">
            Generate Gaji STAFF (Per Bulan)
          </TabsTrigger>
          <TabsTrigger value="nonstaff">
            Generate Gaji Non-STAFF (Per Minggu)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Generate Gaji STAFF Per Bulan</CardTitle>
              <CardDescription>
                Generate gaji untuk karyawan STAFF berdasarkan gaji per bulan
                tetap. Sistem akan menghitung gaji berdasarkan periode yang
                ditentukan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="staff-period">Periode (YYYY-MM)</Label>
                <Input
                  id="staff-period"
                  type="month"
                  value={staffPeriod}
                  onChange={(e) => setStaffPeriod(e.target.value)}
                  placeholder="2024-01"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Contoh: 2024-01 untuk bulan Januari 2024
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">
                  Informasi Gaji STAFF:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Gaji dihitung per bulan (gaji tetap)</li>
                  <li>• Absensi dihitung Senin-Jumat</li>
                  <li>• Generate otomatis setiap tanggal 1 bulan berikutnya</li>
                  <li>• Dapat di-generate manual untuk periode tertentu</li>
                </ul>
              </div>

              <Button
                onClick={generateStaffSalary}
                disabled={loading || !staffPeriod}
                className="w-full"
              >
                {loading ? "Generating..." : "Generate Gaji STAFF"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nonstaff">
          <Card>
            <CardHeader>
              <CardTitle>Generate Gaji Non-STAFF Per Minggu</CardTitle>
              <CardDescription>
                Generate gaji untuk karyawan non-STAFF berdasarkan gaji per
                hari. Sistem akan menghitung gaji berdasarkan absensi harian.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nonstaff-start">Tanggal Awal</Label>
                  <Input
                    id="nonstaff-start"
                    type="date"
                    value={nonStaffStartDate}
                    onChange={(e) => setNonStaffStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nonstaff-end">Tanggal Akhir</Label>
                  <Input
                    id="nonstaff-end"
                    type="date"
                    value={nonStaffEndDate}
                    onChange={(e) => setNonStaffEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-md">
                <h4 className="font-medium text-green-900 mb-2">
                  Informasi Gaji Non-STAFF:
                </h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Gaji dihitung per hari berdasarkan absensi</li>
                  <li>• Absensi dihitung Senin-Sabtu</li>
                  <li>• Generate otomatis setiap Sabtu</li>
                  <li>• Dapat di-generate manual untuk periode tertentu</li>
                </ul>
              </div>

              <Button
                onClick={generateNonStaffSalary}
                disabled={loading || !nonStaffStartDate || !nonStaffEndDate}
                className="w-full"
              >
                {loading ? "Generating..." : "Generate Gaji Non-STAFF"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium text-gray-900 mb-2">
          Perbedaan Sistem Gaji:
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-600">Karyawan STAFF:</h4>
            <ul className="text-gray-700 space-y-1 mt-1">
              <li>• Gaji per bulan (tetap)</li>
              <li>• Absensi Senin-Jumat</li>
              <li>• Generate otomatis tiap tanggal 1</li>
              <li>• Departemen mengandung kata "STAFF"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-600">Karyawan Non-STAFF:</h4>
            <ul className="text-gray-700 space-y-1 mt-1">
              <li>• Gaji per hari (berdasarkan absensi)</li>
              <li>• Absensi Senin-Sabtu</li>
              <li>• Generate otomatis tiap Sabtu</li>
              <li>• Departemen selain "STAFF"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
