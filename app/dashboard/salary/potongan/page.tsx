"use client";

import React, { useState, useEffect } from "react";
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
import { salaryAPI, getAllSalaries } from "@/lib/api";

export default function PotonganPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [gajiList, setGajiList] = useState<any[]>([]);
  const [selectedGajiId, setSelectedGajiId] = useState("");
  const [potonganType, setPotonganType] = useState("");
  const [potonganAmount, setPotonganAmount] = useState("");

  useEffect(() => {
    fetchGajiList();
  }, []);

  const fetchGajiList = async () => {
    try {
      const data = await getAllSalaries();
      setGajiList(data);
    } catch (err) {
      setError("Gagal memuat data gaji");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!selectedGajiId || !potonganType || !potonganAmount) {
      setError("Semua field harus diisi");
      setIsLoading(false);
      return;
    }

    const amount = parseFloat(potonganAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Jumlah potongan harus berupa angka positif");
      setIsLoading(false);
      return;
    }

    try {
      let response;
      switch (potonganType) {
        case "pph21":
          response = await salaryAPI.addPajakPph21({
            gajiId: selectedGajiId,
            pajakPph21: amount,
          });
          break;
        case "keterlambatan":
          response = await salaryAPI.addPotonganKeterlambatan({
            gajiId: selectedGajiId,
            potonganKeterlambatan: amount,
          });
          break;
        case "pinjaman":
          response = await salaryAPI.addPotonganPinjaman({
            gajiId: selectedGajiId,
            potonganPinjaman: amount,
          });
          break;
        case "sumbangan":
          response = await salaryAPI.addPotonganSumbangan({
            gajiId: selectedGajiId,
            potonganSumbangan: amount,
          });
          break;
        case "bpjs":
          response = await salaryAPI.addPotonganBpjs({
            gajiId: selectedGajiId,
            potonganBpjs: amount,
          });
          break;
        case "undangan":
          response = await salaryAPI.addPotonganUndangan({
            gajiId: selectedGajiId,
            potonganUndangan: amount,
          });
          break;
        default:
          throw new Error("Jenis potongan tidak valid");
      }

      setSuccess("Potongan berhasil ditambahkan!");
      setSelectedGajiId("");
      setPotonganType("");
      setPotonganAmount("");

      // Refresh data
      await fetchGajiList();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Gagal menambahkan potongan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPotonganTypeLabel = (type: string) => {
    switch (type) {
      case "pph21":
        return "Pajak PPH21";
      case "keterlambatan":
        return "Potongan Keterlambatan";
      case "pinjaman":
        return "Potongan Pinjaman";
      case "sumbangan":
        return "Potongan Sumbangan";
      case "bpjs":
        return "Potongan BPJS";
      case "undangan":
        return "Potongan Undangan";
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        Kelola Potongan Gaji
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
            <CardTitle>Tambah Potongan Gaji</CardTitle>
            <CardDescription>
              Pilih karyawan dan jenis potongan yang akan ditambahkan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gajiId">Pilih Gaji Karyawan *</Label>
                <Select
                  value={selectedGajiId}
                  onValueChange={setSelectedGajiId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gaji karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {gajiList.map((gaji) => (
                      <SelectItem key={gaji.id} value={gaji.id}>
                        {gaji.karyawan?.namaLengkap} - {gaji.karyawan?.nik} (
                        {gaji.periodeAwal} - {gaji.periodeAkhir})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="potonganType">Jenis Potongan *</Label>
                <Select
                  value={potonganType}
                  onValueChange={setPotonganType}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis potongan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pph21">Pajak PPH21</SelectItem>
                    <SelectItem value="keterlambatan">
                      Potongan Keterlambatan
                    </SelectItem>
                    <SelectItem value="pinjaman">Potongan Pinjaman</SelectItem>
                    <SelectItem value="sumbangan">
                      Potongan Sumbangan
                    </SelectItem>
                    <SelectItem value="bpjs">Potongan BPJS</SelectItem>
                    <SelectItem value="undangan">Potongan Undangan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="potonganAmount">Jumlah Potongan (Rp) *</Label>
                <Input
                  id="potonganAmount"
                  type="number"
                  value={potonganAmount}
                  onChange={(e) => setPotonganAmount(e.target.value)}
                  placeholder="Masukkan jumlah potongan"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Kembali
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Menyimpan...
              </>
            ) : (
              <>Tambah Potongan</>
            )}
          </Button>
        </div>
      </form>

      {/* Tabel Rekap Potongan */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Rekap Potongan Gaji</CardTitle>
          <CardDescription>
            Daftar semua potongan gaji yang telah ditambahkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Nama
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    NIK
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Periode
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Pajak PPH21
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Keterlambatan
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Pinjaman
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Sumbangan
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    BPJS
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Undangan
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Total Potongan
                  </th>
                </tr>
              </thead>
              <tbody>
                {gajiList.map((gaji) => (
                  <tr key={gaji.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      {gaji.karyawan?.namaLengkap}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {gaji.karyawan?.nik}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {gaji.periodeAwal} - {gaji.periodeAkhir}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {gaji.pajakPph21?.toLocaleString("id-ID") || "0"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp{" "}
                      {gaji.potonganKeterlambatan?.toLocaleString("id-ID") ||
                        "0"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {gaji.potonganPinjaman?.toLocaleString("id-ID") || "0"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp{" "}
                      {gaji.potonganSumbangan?.toLocaleString("id-ID") || "0"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {gaji.potonganBpjs?.toLocaleString("id-ID") || "0"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {gaji.potonganUndangan?.toLocaleString("id-ID") || "0"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      Rp {gaji.potongan?.toLocaleString("id-ID") || "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
