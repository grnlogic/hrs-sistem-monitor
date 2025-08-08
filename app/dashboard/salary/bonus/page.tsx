"use client";

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
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Badge } from "@/components/ui/display/badge";
import { salaryAPI } from "@/lib/api";

const departmentOptions = [
  { label: "STAFF PJP", value: "STAFF PJP" },
  { label: "STAFF CPD", value: "STAFF CPD" },
  { label: "BLANDING PJP", value: "BLANDING PJP" },
  { label: "PACKING PJP", value: "PACKING PJP" },
  { label: "MARKET PJP", value: "MARKET PJP" },
  { label: "MARKET CPD", value: "MARKET CPD" },
];

export default function BonusPage() {
  const router = useRouter();
  const [gajiList, setGajiList] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [bonusType, setBonusType] = useState<"equal" | "different">("equal");
  const [equalBonus, setEqualBonus] = useState("");
  const [differentBonuses, setDifferentBonuses] = useState<{
    [key: string]: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Gunakan endpoint detail untuk mendapatkan data per periode
      const { getAllSalaries } = await import("@/lib/api");
      const result = await getAllSalaries();

      console.log("Data gaji yang diambil (bonus):", result);

      if (result && result.length > 0) {
        // Group data berdasarkan karyawan ID dan status pembayaran
        const groupedData = result.reduce((acc: any, item: any) => {
          const key = `${item.karyawan?.id || "unknown"}_${
            item.statusPembayaran || "belum_dibayar"
          }`;

          if (!acc[key]) {
            // Buat entry baru dengan data dasar
            acc[key] = {
              ...item,
              // Inisialisasi periode dengan tanggal pertama
              periodeAwal: item.tanggalGaji || item.periode?.split(" - ")[0],
              periodeAkhir: item.tanggalGaji || item.periode?.split(" - ")[1],
              totalHari: 1,
              // Simpan array tanggal untuk referensi
              tanggalList: [item.tanggalGaji || item.periode],
              // Simpan ID asli untuk update status
              originalIds: [item.id],
              // Inisialisasi semua field dengan benar
              gajiPokok: Number(item.gajiPokok) || 0,
              bonus: Number(item.bonus) || 0,
              totalHariMasuk: Number(item.totalHariMasuk) || 0,
              totalHariSetengahHari: Number(item.totalHariSetengahHari) || 0,
              // Inisialisasi semua field potongan detail
              pajakPph21: Number(item.pajakPph21) || 0,
              potonganKeterlambatan: Number(item.potonganKeterlambatan) || 0,
              potonganPinjaman: Number(item.potonganPinjaman) || 0,
              potonganSumbangan: Number(item.potonganSumbangan) || 0,
              potonganBpjs: Number(item.potonganBpjs) || 0,
              potonganUndangan: Number(item.potonganUndangan) || 0,
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

            // Update total gaji (jika ada)
            existing.gajiPokok = (existing.gajiPokok || 0) + (Number(item.gajiPokok) || 0);
            existing.bonus = (existing.bonus || 0) + (Number(item.bonus) || 0);
            existing.totalHariMasuk = (existing.totalHariMasuk || 0) + (Number(item.totalHariMasuk) || 0);
            existing.totalHariSetengahHari = (existing.totalHariSetengahHari || 0) + (Number(item.totalHariSetengahHari) || 0);
            
            // Agregasi semua field potongan detail
            existing.pajakPph21 = (existing.pajakPph21 || 0) + (Number(item.pajakPph21) || 0);
            existing.potonganKeterlambatan = (existing.potonganKeterlambatan || 0) + (Number(item.potonganKeterlambatan) || 0);
            existing.potonganPinjaman = (existing.potonganPinjaman || 0) + (Number(item.potonganPinjaman) || 0);
            existing.potonganSumbangan = (existing.potonganSumbangan || 0) + (Number(item.potonganSumbangan) || 0);
            existing.potonganBpjs = (existing.potonganBpjs || 0) + (Number(item.potonganBpjs) || 0);
            existing.potonganUndangan = (existing.potonganUndangan || 0) + (Number(item.potonganUndangan) || 0);
            
            // Update total potongan dan gaji bersih
            if (item.potongan && existing.potongan) {
              existing.potongan += item.potongan;
            }
            if (item.gajiBersih && existing.gajiBersih) {
              existing.gajiBersih += item.gajiBersih;
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

        console.log("Data gaji setelah agregasi (bonus):", aggregatedData);
        
        // Debug: Log contoh data agregasi
        if (aggregatedData.length > 0) {
          console.log("=== SAMPLE BONUS AGGREGATED DATA ===");
          aggregatedData.slice(0, 3).forEach((item: any, index: number) => {
            console.log(`Bonus aggregated sample ${index + 1}:`, {
              nama: item.karyawan?.namaLengkap,
              departemen: item.karyawan?.departemen,
              gajiPokok: item.gajiPokok,
              bonus: item.bonus,
              totalHariMasuk: item.totalHariMasuk,
              originalIds: item.originalIds?.length || 0
            });
          });
          console.log("=== END BONUS SAMPLE ===");
        }
        setGajiList(aggregatedData);
      } else {
        setGajiList([]);
      }
    } catch (err) {
      console.error("Error loading salary data:", err);
      setMsg("Gagal memuat data gaji");
    }
  };

  // Filter gaji berdasarkan departemen yang dipilih
  const filteredGajiList = selectedDepartment
    ? gajiList.filter((g) => g.karyawan?.departemen === selectedDepartment)
    : [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      if (bonusType === "equal") {
        // Bonus sama rata untuk semua karyawan di departemen
        // Update semua ID asli untuk setiap data agregasi
        for (const aggregatedItem of filteredGajiList) {
          const idsToUpdate = aggregatedItem.originalIds || [aggregatedItem.id];

          for (const originalId of idsToUpdate) {
            await salaryAPI.addBonus({
              gajiId: originalId,
              bonus: Number(equalBonus),
            });
          }
        }

        setMsg(
          `Bonus berhasil ditambahkan untuk ${filteredGajiList.length} karyawan di departemen ${selectedDepartment}!`
        );
      } else {
        // Bonus berbeda untuk setiap karyawan
        for (const [aggregatedId, bonus] of Object.entries(differentBonuses)) {
          if (bonus) {
            // Cari data yang dipilih untuk mendapatkan originalIds
            const selectedItem = filteredGajiList.find(
              (item) => item.id === aggregatedId
            );
            const idsToUpdate = selectedItem?.originalIds || [aggregatedId];

            // Tambahkan bonus ke semua ID asli
            for (const originalId of idsToUpdate) {
              await salaryAPI.addBonus({
                gajiId: originalId,
                bonus: Number(bonus),
              });
            }
          }
        }

        setMsg(
          `Bonus berhasil ditambahkan untuk ${
            Object.keys(differentBonuses).length
          } karyawan!`
        );
      }

      setTimeout(() => router.push("/dashboard/salary"), 2000);
    } catch (error) {
      console.error("Error adding bonus:", error);
      setMsg("Gagal menambahkan bonus");
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    setEqualBonus("");
    setDifferentBonuses({});
  };

  const handleBonusTypeChange = (type: "equal" | "different") => {
    setBonusType(type);
    setEqualBonus("");
    setDifferentBonuses({});
  };

  const updateDifferentBonus = (gajiId: string, bonus: string) => {
    setDifferentBonuses((prev) => ({
      ...prev,
      [gajiId]: bonus,
    }));
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Input Bonus Gaji Berdasarkan Departemen
        </h1>
        <Button
          type="button"
          variant="outline"
          onClick={loadData}
          disabled={loading}
        >
          🔄 Refresh Data
        </Button>
      </div>

      {/* Info Agregasi */}
      <Alert className="border-blue-200 bg-blue-50">
        <span className="text-2xl">ℹ️</span>
        <AlertDescription>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">
              Sistem Agregasi Data
            </h4>
            <p className="text-sm text-blue-700">
              Data gaji dengan status sama akan digabungkan per karyawan untuk
              menghindari bonus berlipat. Setiap karyawan hanya akan mendapat
              bonus sekali meskipun memiliki beberapa data gaji.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {msg && (
          <Alert variant={msg.includes("berhasil") ? "default" : "destructive"}>
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pilih Departemen</CardTitle>
            <CardDescription>
              Pilih departemen untuk memberikan bonus kepada karyawan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departemen</Label>
              <Select
                value={selectedDepartment}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Pilih Departemen --" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedDepartment && (
          <>
            {/* Informasi Departemen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedDepartment}</Badge>
                  Informasi Departemen
                </CardTitle>
                <CardDescription>
                  Ringkasan data karyawan setelah agregasi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-semibold text-blue-800">Total Karyawan</h4>
                    <p className="text-2xl font-bold text-blue-900">
                      {filteredGajiList.length} orang
                    </p>
                    <p className="text-sm text-blue-700">Setelah agregasi</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-semibold text-green-800">Total Gaji Pokok</h4>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(filteredGajiList.reduce((sum, item) => sum + (item.gajiPokok || 0), 0))}
                    </p>
                    <p className="text-sm text-green-700">Akumulasi</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-purple-50">
                    <h4 className="font-semibold text-purple-800">Bonus Existing</h4>
                    <p className="text-lg font-bold text-purple-900">
                      {formatCurrency(filteredGajiList.reduce((sum, item) => sum + (item.bonus || 0), 0))}
                    </p>
                    <p className="text-sm text-purple-700">Yang sudah ada</p>
                  </div>
                </div>
                <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                  <span className="text-xl">💡</span>
                  <AlertDescription>
                    Data sudah digabungkan per karyawan untuk menghindari bonus berlipat
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Pilihan Tipe Bonus */}
            <Card>
              <CardHeader>
                <CardTitle>Tipe Bonus</CardTitle>
                <CardDescription>
                  Pilih cara pemberian bonus untuk departemen ini
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      id="equal"
                      type="radio"
                      value="equal"
                      checked={bonusType === "equal"}
                      onChange={(e) =>
                        handleBonusTypeChange(
                          e.target.value as "equal" | "different"
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="equal" className="cursor-pointer">
                      🟰 Sama Rata
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="different"
                      type="radio"
                      value="different"
                      checked={bonusType === "different"}
                      onChange={(e) =>
                        handleBonusTypeChange(
                          e.target.value as "equal" | "different"
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="different" className="cursor-pointer">
                      🎯 Berbeda per Karyawan
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Bonus Sama Rata */}
            {bonusType === "equal" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🟰 Bonus Sama Rata
                  </CardTitle>
                  <CardDescription>
                    Berikan bonus dengan nominal yang sama untuk semua karyawan di departemen {selectedDepartment}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="equalBonus">Nominal Bonus</Label>
                    <Input
                      id="equalBonus"
                      type="number"
                      value={equalBonus}
                      onChange={(e) => setEqualBonus(e.target.value)}
                      placeholder="Masukkan nominal bonus"
                      min={1}
                      className="text-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Bonus ini akan diberikan kepada semua {filteredGajiList.length} karyawan di departemen {selectedDepartment}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Bonus Berbeda */}
            {bonusType === "different" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎯 Bonus Individual
                  </CardTitle>
                  <CardDescription>
                    Tentukan bonus untuk setiap karyawan secara individual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {filteredGajiList.map((gaji) => (
                      <div
                        key={gaji.id}
                        className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold text-lg">
                            {gaji.karyawan?.namaLengkap}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">NIK: {gaji.karyawan?.nik}</Badge>
                            <Badge variant="outline">
                              Periode: {gaji.periodeDisplay || gaji.periode}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="font-medium text-green-700">
                              Gaji Pokok: {formatCurrency(gaji.gajiPokok || 0)}
                            </span>
                            <span className="font-medium text-blue-700">
                              Bonus Existing: {formatCurrency(gaji.bonus || 0)}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-purple-700">
                            Total Gaji Bersih: {formatCurrency(gaji.totalGajiBersih || 0)}
                          </div>
                        </div>
                        <div className="w-32 space-y-2">
                          <Label htmlFor={`bonus-${gaji.id}`} className="text-sm">
                            Bonus Baru
                          </Label>
                          <Input
                            id={`bonus-${gaji.id}`}
                            type="number"
                            value={differentBonuses[gaji.id] || ""}
                            onChange={(e) =>
                              updateDifferentBonus(gaji.id, e.target.value)
                            }
                            min={0}
                            placeholder="0"
                            className="text-center font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Alert className="mt-4 border-blue-200 bg-blue-50">
                    <span className="text-xl">💡</span>
                    <AlertDescription>
                      Masukkan nominal bonus untuk setiap karyawan. Data sudah diagregasi per karyawan.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Preview Data */}
            {bonusType === "equal" && equalBonus && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    📋 Preview Bonus Sama Rata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 mb-1">Departemen</p>
                      <p className="font-semibold text-green-900">{selectedDepartment}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">Nominal per Karyawan</p>
                      <p className="font-semibold text-green-900">{formatCurrency(Number(equalBonus))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">Jumlah Karyawan</p>
                      <p className="font-semibold text-green-900">{filteredGajiList.length} orang</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 mb-1">Total Bonus</p>
                      <p className="font-bold text-lg text-green-900">
                        {formatCurrency(Number(equalBonus) * filteredGajiList.length)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {bonusType === "different" &&
              Object.keys(differentBonuses).length > 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      📋 Preview Bonus Individual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {Object.entries(differentBonuses).map(([gajiId, bonus]) => {
                        if (!bonus || Number(bonus) === 0) return null;
                        const gaji = filteredGajiList.find((g) => g.id === gajiId);
                        return (
                          <div key={gajiId} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                            <span className="font-medium">{gaji?.karyawan?.namaLengkap}</span>
                            <Badge variant="secondary" className="font-mono">
                              {formatCurrency(Number(bonus))}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-800">Total Bonus:</span>
                        <span className="font-bold text-lg text-green-900">
                          {formatCurrency(
                            Object.values(differentBonuses).reduce(
                              (sum, bonus) => sum + Number(bonus || 0),
                              0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={
              loading ||
              !selectedDepartment ||
              (bonusType === "equal" && !equalBonus) ||
              (bonusType === "different" &&
                Object.keys(differentBonuses).length === 0)
            }
            className="min-w-32"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Menyimpan...
              </div>
            ) : (
              "💰 Simpan Bonus"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
