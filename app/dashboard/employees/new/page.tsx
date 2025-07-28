"use client";

import React, { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { employeeAPI } from "@/lib/api";

const statusOptions = [
  { label: "Aktif", value: "AKTIF" },
  { label: "Kontrak", value: "KONTRAK" },
  { label: "Cuti", value: "CUTI" },
  { label: "Resign", value: "RESIGN" },
  { label: "Tidak Aktif", value: "TIDAK_AKTIF" },
];

const departmentOptions = [
  { label: "STAFF PJP", value: "STAFF PJP" },
  { label: "STAFF CPD", value: "STAFF CPD" },
  { label: "BLANDING PJP", value: "BLANDING PJP" },
  { label: "PACKING PJP", value: "PACKING PJP" },
  { label: "MARKET PJP", value: "MARKET PJP" },
  { label: "PACKING CPD", value: "PACKING CPD" },
  { label: "MARKET CPD", value: "MARKET CPD" },
  { label: "STAFF CMS", value: "STAFF CMS" },
  { label: "PACKING CMS", value: "PACKING CMS" },
  { label: "MARKET CMS", value: "MARKET CMS" },
];

export default function NewEmployeePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const employeeData = {
      nik: formData.get("nik") as string,
      namaLengkap: formData.get("namaLengkap") as string,
      email: formData.get("email") as string,
      noHp: formData.get("noHp") as string,
      jabatan: formData.get("jabatan") as string,
      departemen: formData.get("departemen") as string,
      tanggalMasuk: formData.get("tanggalMasuk") as string,
      gajiPerHari: Number(formData.get("gajiPerHari")),
      statusKaryawan: formData.get("statusKaryawan") as string,
      // Field opsional
      tempatLahir: formData.get("tempatLahir") || null,
      tanggalLahir: formData.get("tanggalLahir") || null,
      jenisKelamin: formData.get("jenisKelamin") || null,
      alamat: formData.get("alamat") || null,
      noKtp: formData.get("noKtp") || null,
      npwp: formData.get("npwp") || null,
      bpjsKesehatan: formData.get("bpjsKesehatan") || null,
      bpjsKetenagakerjaan: formData.get("bpjsKetenagakerjaan") || null,
      statusPernikahan: formData.get("statusPernikahan") || null,
      jumlahTanggungan: formData.get("jumlahTanggungan") || null,
      tanggalKontrak: formData.get("tanggalKontrak") || null,
      batasKontrak: formData.get("batasKontrak") || null,
      fotoProfil: formData.get("fotoProfil") || null,
      pendidikanTerakhir: formData.get("pendidikanTerakhir") || null,
      atasanLangsung: formData.get("atasanLangsung") || null,
      lokasiKerja: formData.get("lokasiKerja") || null,
      tanggalKeluar: formData.get("tanggalKeluar") || null,
    };

    try {
      await employeeAPI.create(employeeData);
      setSuccess("Karyawan berhasil ditambahkan!");
      setTimeout(() => {
        router.push("/dashboard/employees");
      }, 2000);
    } catch (err) {
      setError("Gagal menambahkan karyawan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        Tambah Karyawan Baru
      </h1>
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
        <Card>
          <CardHeader>
            <CardTitle>Data Karyawan</CardTitle>
            <CardDescription>
              Isi data sesuai dengan identitas karyawan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bagian Wajib */}
            <div className="mb-2">
              <h2 className="text-lg font-semibold mb-2 text-red-700">
                Data Wajib
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK *</Label>
                <Input id="nik" name="nik" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                <Input id="namaLengkap" name="namaLengkap" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departemen">Departemen *</Label>
                <Select name="departemen" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalMasuk">Tanggal Masuk *</Label>
                <Input
                  id="tanggalMasuk"
                  name="tanggalMasuk"
                  type="date"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gajiPerHari">Gaji Per Hari *</Label>
                <Input
                  id="gajiPerHari"
                  name="gajiPerHari"
                  type="number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusKaryawan">Status Karyawan *</Label>
                <Select name="statusKaryawan" required defaultValue="AKTIF">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Bagian Opsional */}
            <div className="mt-6 mb-2">
              <h2 className="text-lg font-semibold mb-2 text-blue-700">
                Data Opsional
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="noHp">Nomor HP</Label>
                <Input id="noHp" name="noHp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempatLahir">Tempat Lahir</Label>
                <Input id="tempatLahir" name="tempatLahir" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalLahir">Tanggal Lahir</Label>
                <Input id="tanggalLahir" name="tanggalLahir" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenisKelamin">Jenis Kelamin</Label>
                <Input id="jenisKelamin" name="jenisKelamin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input id="alamat" name="alamat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noKtp">No KTP</Label>
                <Input id="noKtp" name="noKtp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input id="npwp" name="npwp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpjsKesehatan">BPJS Kesehatan</Label>
                <Input id="bpjsKesehatan" name="bpjsKesehatan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpjsKetenagakerjaan">
                  BPJS Ketenagakerjaan
                </Label>
                <Input id="bpjsKetenagakerjaan" name="bpjsKetenagakerjaan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusPernikahan">Status Pernikahan</Label>
                <Input id="statusPernikahan" name="statusPernikahan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jumlahTanggungan">Jumlah Tanggungan</Label>
                <Input
                  id="jumlahTanggungan"
                  name="jumlahTanggungan"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalKontrak">Tanggal Kontrak</Label>
                <Input id="tanggalKontrak" name="tanggalKontrak" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batasKontrak">Batas Kontrak</Label>
                <Input id="batasKontrak" name="batasKontrak" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fotoProfil">Foto Profil (URL)</Label>
                <Input id="fotoProfil" name="fotoProfil" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input id="jabatan" name="jabatan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pendidikanTerakhir">Pendidikan Terakhir</Label>
                <Input id="pendidikanTerakhir" name="pendidikanTerakhir" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="atasanLangsung">Atasan Langsung</Label>
                <Input id="atasanLangsung" name="atasanLangsung" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lokasiKerja">Lokasi Kerja</Label>
                <Input id="lokasiKerja" name="lokasiKerja" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalKeluar">Tanggal Keluar</Label>
                <Input id="tanggalKeluar" name="tanggalKeluar" type="date" />
              </div>
            </div>
          </CardContent>
        </Card>
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
              <>Tambah Karyawan</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
