"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { generateSalaryAPI } from "@/lib/api";

export default function UpdateStaffSalaryPage() {
  const [karyawanId, setKaryawanId] = useState("");
  const [gajiPerBulan, setGajiPerBulan] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpdateSalary = async () => {
    if (!karyawanId || !gajiPerBulan) {
      setMessage({
        type: "error",
        text: "Mohon isi semua field yang diperlukan",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await generateSalaryAPI.updateStaffSalary(
        parseInt(karyawanId),
        parseFloat(gajiPerBulan)
      );
      setMessage({ type: "success", text: result });
      setKaryawanId("");
      setGajiPerBulan("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Gagal update gaji STAFF",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Update Gaji STAFF
          </h1>
          <p className="text-gray-600 mt-2">
            Update gaji per bulan untuk karyawan STAFF
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Gaji Per Bulan STAFF</CardTitle>
          <CardDescription>
            Masukkan ID karyawan STAFF dan gaji per bulan yang baru
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="karyawanId">ID Karyawan</Label>
              <Input
                id="karyawanId"
                type="number"
                placeholder="Contoh: 1"
                value={karyawanId}
                onChange={(e) => setKaryawanId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gajiPerBulan">Gaji Per Bulan</Label>
              <Input
                id="gajiPerBulan"
                type="number"
                placeholder="Contoh: 5000000"
                value={gajiPerBulan}
                onChange={(e) => setGajiPerBulan(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleUpdateSalary}
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? "Updating..." : "Update Gaji STAFF"}
          </Button>

          {message && (
            <Alert
              className={
                message.type === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }
            >
              <AlertDescription
                className={
                  message.type === "error" ? "text-red-800" : "text-green-800"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Penting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Cara Penggunaan:
            </h3>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Masukkan ID karyawan STAFF yang akan diupdate</li>
              <li>• Masukkan gaji per bulan yang baru (dalam rupiah)</li>
              <li>• Klik tombol "Update Gaji STAFF"</li>
              <li>• Sistem akan memvalidasi bahwa karyawan adalah STAFF</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Catatan:</h3>
            <ul className="text-yellow-800 space-y-1 text-sm">
              <li>
                • Hanya karyawan dengan departemen yang mengandung kata "STAFF"
                yang bisa diupdate
              </li>
              <li>
                • Gaji per bulan akan digunakan untuk perhitungan gaji STAFF
              </li>
              <li>
                • Setelah update, generate gaji STAFF akan menggunakan nilai
                baru
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
