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
      console.log("Raw data from API:", data);

      if (data && data.length > 0) {
        // Group data berdasarkan karyawan ID dan status pembayaran
        const groupedData = data.reduce((acc: any, item: any) => {
          const key = `${item.karyawan?.id || "unknown"}_${
            item.statusPembayaran || "belum_dibayar"
          }`;

          if (!acc[key]) {
            // Buat entry baru dengan data dasar
            acc[key] = {
              ...item,
              // Inisialisasi periode dengan tanggal pertama
              periodeAwal:
                item.periodeAwal ||
                item.tanggalGaji ||
                item.periode?.split(" - ")[0],
              periodeAkhir:
                item.periodeAkhir ||
                item.tanggalGaji ||
                item.periode?.split(" - ")[1],
              totalHari: 1,
              // Simpan array tanggal untuk referensi
              tanggalList: [item.tanggalGaji || item.periode],
              // Simpan ID asli untuk update status
              originalIds: [item.id],
              // Inisialisasi semua jenis potongan - GUNAKAN NILAI ACTUAL DARI DATABASE
              pajakPph21: Number(item.pajakPph21) || 0,
              potonganKeterlambatan: Number(item.potonganKeterlambatan) || 0,
              potonganPinjaman: Number(item.potonganPinjaman) || 0,
              potonganSumbangan: Number(item.potonganSumbangan) || 0,
              potonganBpjs: Number(item.potonganBpjs) || 0,
              potonganUndangan: Number(item.potonganUndangan) || 0,
              // Hitung total potongan berdasarkan detail
              potongan:
                (Number(item.pajakPph21) || 0) +
                (Number(item.potonganKeterlambatan) || 0) +
                (Number(item.potonganPinjaman) || 0) +
                (Number(item.potonganSumbangan) || 0) +
                (Number(item.potonganBpjs) || 0) +
                (Number(item.potonganUndangan) || 0),
            };
          } else {
            // Gabungkan dengan data yang sudah ada
            const existing = acc[key];

            // Update periode (ambil tanggal terkecil dan terbesar)
            const currentDate =
              item.tanggalGaji || item.periode?.split(" - ")[0];
            const existingStart = existing.periodeAwal;
            const existingEnd = existing.periodeAkhir;

            if (currentDate < existingStart) {
              existing.periodeAwal = currentDate;
            }
            if (currentDate > existingEnd) {
              existing.periodeAkhir = currentDate;
            }

            // Tambah total hari
            existing.totalHari += 1;

            // Tambah ke array tanggal
            existing.tanggalList.push(item.tanggalGaji || item.periode);

            // Tambah ID asli
            existing.originalIds.push(item.id);

            // PERBAIKAN: Akumulasi semua jenis potongan dengan benar
            existing.pajakPph21 =
              (existing.pajakPph21 || 0) + (Number(item.pajakPph21) || 0);
            existing.potonganKeterlambatan =
              (existing.potonganKeterlambatan || 0) +
              (Number(item.potonganKeterlambatan) || 0);
            existing.potonganPinjaman =
              (existing.potonganPinjaman || 0) +
              (Number(item.potonganPinjaman) || 0);
            existing.potonganSumbangan =
              (existing.potonganSumbangan || 0) +
              (Number(item.potonganSumbangan) || 0);
            existing.potonganBpjs =
              (existing.potonganBpjs || 0) + (Number(item.potonganBpjs) || 0);
            existing.potonganUndangan =
              (existing.potonganUndangan || 0) +
              (Number(item.potonganUndangan) || 0);

            // Hitung ulang total potongan berdasarkan detail
            existing.potongan =
              existing.pajakPph21 +
              existing.potonganKeterlambatan +
              existing.potonganPinjaman +
              existing.potonganSumbangan +
              existing.potonganBpjs +
              existing.potonganUndangan;

            // Update total gaji (jika ada)
            if (item.gajiPokok && existing.gajiPokok) {
              existing.gajiPokok += Number(item.gajiPokok);
            }
            if (item.bonus && existing.bonus) {
              existing.bonus += Number(item.bonus);
            }
            if (item.totalGajiBersih && existing.totalGajiBersih) {
              existing.totalGajiBersih += Number(item.totalGajiBersih);
            }
          }

          return acc;
        }, {});

        // Convert back to array dan format periode display
        const aggregatedData = Object.values(groupedData).map((item: any) => ({
          ...item,
          // Format periode display
          periode:
            item.periodeAwal === item.periodeAkhir
              ? item.periodeAwal
              : `${item.periodeAwal} - ${item.periodeAkhir}`,
          // Tambah info total hari di display
          periodeDisplay:
            item.totalHari === 1
              ? `${item.periodeAwal} (1 hari)`
              : `${item.periodeAwal} - ${item.periodeAkhir} (${item.totalHari} hari)`,
        }));

        console.log("Data gaji setelah agregasi (potongan):", aggregatedData);
        console.log("Contoh data pertama:", aggregatedData[0]);
        setGajiList(aggregatedData);
      } else {
        setGajiList([]);
      }
    } catch (err) {
      console.error("Error fetching gaji list:", err);
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
      // Cari data yang dipilih untuk mendapatkan originalIds
      const selectedItem = gajiList.find((item) => item.id === selectedGajiId);

      if (!selectedItem) {
        setError("Data gaji yang dipilih tidak ditemukan");
        setIsLoading(false);
        return;
      }

      const idsToUpdate = selectedItem?.originalIds || [selectedGajiId];

      console.log("Menambahkan potongan:", {
        selectedGajiId,
        potonganType,
        amount,
        idsToUpdate,
        selectedItem: {
          nama: selectedItem.karyawan?.namaLengkap,
          periode: selectedItem.periodeDisplay || selectedItem.periode,
        },
      });

      if (!idsToUpdate || idsToUpdate.length === 0) {
        setError("ID gaji tidak valid untuk diupdate");
        setIsLoading(false);
        return;
      }

      // Update semua ID asli yang terkait dengan data agregasi ini
      for (const originalId of idsToUpdate) {
        let response;
        try {
          switch (potonganType) {
            case "pph21":
              response = await salaryAPI.addPajakPph21({
                gajiId: originalId,
                pajakPph21: amount,
              });
              break;
            case "keterlambatan":
              response = await salaryAPI.addPotonganKeterlambatan({
                gajiId: originalId,
                potonganKeterlambatan: amount,
              });
              break;
            case "pinjaman":
              response = await salaryAPI.addPotonganPinjaman({
                gajiId: originalId,
                potonganPinjaman: amount,
              });
              break;
            case "sumbangan":
              response = await salaryAPI.addPotonganSumbangan({
                gajiId: originalId,
                potonganSumbangan: amount,
              });
              break;
            case "bpjs":
              response = await salaryAPI.addPotonganBpjs({
                gajiId: originalId,
                potonganBpjs: amount,
              });
              break;
            case "undangan":
              response = await salaryAPI.addPotonganUndangan({
                gajiId: originalId,
                potonganUndangan: amount,
              });
              break;
            default:
              throw new Error("Jenis potongan tidak valid");
          }
          console.log(
            `Berhasil menambahkan potongan ${potonganType} untuk gaji ID ${originalId}:`,
            response
          );
        } catch (apiError: any) {
          console.error(
            `Gagal menambahkan potongan untuk gaji ID ${originalId}:`,
            apiError
          );
          throw new Error(
            `Gagal menambahkan potongan untuk gaji ID ${originalId}: ${
              apiError?.message || apiError
            }`
          );
        }
      }

      setSuccess(
        `Potongan ${getPotonganTypeLabel(
          potonganType
        )} sebesar Rp ${amount.toLocaleString("id-ID")} berhasil ditambahkan!`
      );
      setSelectedGajiId("");
      setPotonganType("");
      setPotonganAmount("");

      // Refresh data
      await fetchGajiList();

      setTimeout(() => {
        setSuccess("");
      }, 5000);
    } catch (err: any) {
      console.error("Error menambahkan potongan:", err);
      setError(
        err?.message || "Gagal menambahkan potongan. Silakan coba lagi."
      );
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Kelola Potongan Gaji
        </h1>
        <Button
          type="button"
          variant="outline"
          onClick={fetchGajiList}
          disabled={isLoading}
        >
          🔄 Refresh Data
        </Button>
      </div>

      {/* Info Agregasi */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">
              Sistem Agregasi Data
            </h4>
            <p className="text-sm text-blue-700">
              Data gaji dengan status sama akan digabungkan per karyawan untuk
              menghindari potongan berlipat. Setiap karyawan hanya akan mendapat
              potongan sekali meskipun memiliki beberapa data gaji.
            </p>
          </div>
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
        <Card>
          <CardHeader>
            <CardTitle>Tambah Potongan Gaji</CardTitle>
            <CardDescription>
              Pilih karyawan dan jenis potongan yang akan ditambahkan (data
              sudah digabungkan per karyawan)
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
                        {gaji.periodeDisplay || gaji.periode})
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
            Daftar semua potongan gaji yang telah ditambahkan (data sudah
            digabungkan per karyawan)
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
                      {gaji.periodeDisplay || gaji.periode}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {(gaji.pajakPph21 || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp{" "}
                      {(gaji.potonganKeterlambatan || 0).toLocaleString(
                        "id-ID"
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {(gaji.potonganPinjaman || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {(gaji.potonganSumbangan || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {(gaji.potonganBpjs || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      Rp {(gaji.potonganUndangan || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      Rp {(gaji.potongan || 0).toLocaleString("id-ID")}
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
