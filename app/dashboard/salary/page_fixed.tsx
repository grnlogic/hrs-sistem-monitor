"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/form/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { Badge } from "@/components/ui/display/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/navigation/tabs";
import { salaryAPI } from "@/lib/api";
import { downloadSalaryPDF, printSalaryPDF, formatCurrency } from "@/lib/utils";

export default function SalaryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "staff">("all");
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusType, setBonusType] = useState<"equal" | "different">("equal");
  const [equalBonus, setEqualBonus] = useState("");
  const [differentBonuses, setDifferentBonuses] = useState<{
    [key: string]: string;
  }>({});
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusMsg, setBonusMsg] = useState("");

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let result;
      if (startDate && endDate) {
        result = await salaryAPI.getGajiByDateRange(startDate, endDate);
      } else {
        const { getAllSalaries } = await import("@/lib/api");
        result = await getAllSalaries();
      }

      // Gabungkan data per karyawan
      const grouped: { [karyawanId: string]: any } = {};
      result.forEach((item: any) => {
        const id = item.karyawan?.id;
        if (!grouped[id]) {
          grouped[id] = { ...item };
        } else {
          grouped[id].totalHariMasuk += item.totalHariMasuk || 0;
          grouped[id].totalHariSetengahHari += item.totalHariSetengahHari || 0;
          grouped[id].bonus += item.bonus || 0;
          grouped[id].totalGaji += item.totalGaji || 0;
          grouped[id].potongan += item.potongan || 0;
          grouped[id].pajakPph21 += item.pajakPph21 || 0;
          grouped[id].potonganKeterlambatan += item.potonganKeterlambatan || 0;
          grouped[id].potonganPinjaman += item.potonganPinjaman || 0;
          grouped[id].potonganSumbangan += item.potonganSumbangan || 0;
          grouped[id].potonganBpjs += item.potonganBpjs || 0;
          grouped[id].potonganUndangan += item.potonganUndangan || 0;
          grouped[id].totalGajiBersih += item.totalGajiBersih || 0;
          // Status pembayaran: prioritas Belum Dibayar > Pending > Dibayar
          const statusOrder = ["Belum Dibayar", "Pending", "Dibayar"];
          const currStatus = grouped[id].statusPembayaran || "";
          const newStatus = item.statusPembayaran || "";
          if (
            statusOrder.indexOf(newStatus) < statusOrder.indexOf(currStatus)
          ) {
            grouped[id].statusPembayaran = newStatus;
          }
        }
      });
      const merged = Object.values(grouped);
      console.log("Data gaji (filtered by date):", merged);
      setData(merged);
    } catch (error) {
      setError("Gagal memuat data gaji");
      console.error("Error loading salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [startDate, endDate]);

  const handleStatusChange = async (gajiId: string, newStatus: string) => {
    setUpdatingStatus(gajiId);
    try {
      await salaryAPI.updateStatusPembayaran({
        gajiId,
        statusPembayaran: newStatus,
      });
      // Refresh data setelah update
      await loadData();
    } catch (error) {
      console.error("Gagal mengupdate status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filtered.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filtered.map((item) => item.id));
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleExportPDF = async (action: "download" | "print") => {
    if (selectedItems.length === 0) {
      alert("Pilih minimal satu data untuk di-export");
      return;
    }

    setExporting(true);
    try {
      const selectedData = filtered.filter((item) =>
        selectedItems.includes(item.id)
      );

      if (action === "download") {
        downloadSalaryPDF(selectedData);
      } else {
        printSalaryPDF(selectedData);
      }
    } catch (error) {
      console.error("Gagal export PDF:", error);
      alert("Gagal export PDF");
    } finally {
      setExporting(false);
    }
  };

  // Fungsi untuk menangani bonus
  const handleBonusSubmit = async () => {
    if (selectedItems.length === 0) {
      setBonusMsg("Pilih minimal satu karyawan");
      return;
    }

    setBonusLoading(true);
    setBonusMsg("");

    try {
      if (bonusType === "equal") {
        // Bonus sama rata untuk karyawan yang dipilih
        for (const gajiId of selectedItems) {
          await salaryAPI.addBonus({
            gajiId,
            bonus: Number(equalBonus),
          });
        }
        setBonusMsg(
          `Bonus berhasil ditambahkan untuk ${selectedItems.length} karyawan!`
        );
      } else {
        // Bonus berbeda untuk setiap karyawan
        for (const [gajiId, bonus] of Object.entries(differentBonuses)) {
          if (selectedItems.includes(gajiId) && bonus) {
            await salaryAPI.addBonus({
              gajiId,
              bonus: Number(bonus),
            });
          }
        }
        setBonusMsg(`Bonus berhasil ditambahkan untuk karyawan yang dipilih!`);
      }

      // Refresh data
      await loadData();

      // Reset form
      setEqualBonus("");
      setDifferentBonuses({});
      setSelectedItems([]);

      setTimeout(() => {
        setShowBonusModal(false);
        setBonusMsg("");
      }, 2000);
    } catch (error) {
      console.error("Error adding bonus:", error);
      setBonusMsg("Gagal menambahkan bonus");
    } finally {
      setBonusLoading(false);
    }
  };

  const updateDifferentBonus = (gajiId: string, bonus: string) => {
    setDifferentBonuses((prev) => ({
      ...prev,
      [gajiId]: bonus,
    }));
  };

  // Filter data berdasarkan tab aktif dan status
  const getFilteredData = () => {
    let filteredData = data;

    // Filter berdasarkan departemen STAFF
    if (activeTab === "staff") {
      filteredData = data.filter((item) =>
        item.karyawan?.departemen?.toLowerCase().includes("staff")
      );
    }

    // Filter berdasarkan status
    return filteredData.filter((item) => {
      if (status !== "all") {
        return (
          (item.statusPembayaran || "").toLowerCase() === status.toLowerCase()
        );
      }
      return true;
    });
  };

  const filtered = getFilteredData();

  // Reset selected items ketika tab berubah
  useEffect(() => {
    setSelectedItems([]);
    setShowBonusModal(false);
    setEqualBonus("");
    setDifferentBonuses({});
    setBonusMsg("");
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          💰 Sistem Penggajian Karyawan
        </h1>
        <p className="text-blue-100">
          Kelola data gaji, bonus, potongan, dan laporan penggajian karyawan
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/10 rounded p-3">
            <div className="font-semibold">Total Karyawan</div>
            <div className="text-2xl font-bold">{data.length}</div>
          </div>
          <div className="bg-white/10 rounded p-3">
            <div className="font-semibold">Karyawan STAFF</div>
            <div className="text-2xl font-bold">
              {
                data.filter((item) =>
                  item.karyawan?.departemen?.toLowerCase().includes("staff")
                ).length
              }
            </div>
          </div>
          <div className="bg-white/10 rounded p-3">
            <div className="font-semibold">Data Dipilih</div>
            <div className="text-2xl font-bold">{selectedItems.length}</div>
          </div>
        </div>
      </div>

      {/* Quick Action Guide */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-800 mb-2">
          📋 Panduan Penggunaan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-700">
          <div>
            <strong>1. Filter Data:</strong> Gunakan tanggal dan status untuk
            menyaring data
          </div>
          <div>
            <strong>2. Pilih Karyawan:</strong> Centang checkbox untuk memilih
            karyawan
          </div>
          <div>
            <strong>3. Kelola Bonus:</strong> Tambah bonus individual atau
            departemen
          </div>
          <div>
            <strong>4. Export Data:</strong> Download/print laporan PDF yang
            dipilih
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Filter berdasarkan Kategori Karyawan
          </h2>
        </div>
        <div className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "all" | "staff")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                🏢 Semua Karyawan ({data.length})
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                👔 Karyawan STAFF (
                {
                  data.filter((item) =>
                    item.karyawan?.departemen?.toLowerCase().includes("staff")
                  ).length
                }
                )
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-800 font-semibold">
              ✅ Data Terpilih:
            </span>
            <span className="text-blue-600 font-bold">
              {selectedItems.length} dari {filtered.length} karyawan dipilih
            </span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Gunakan tombol aksi di bawah untuk memproses data yang dipilih
          </p>
        </div>
      )}

      {activeTab === "staff" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h4 className="font-semibold text-green-800 mb-2">
                Informasi Karyawan STAFF
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>
                  • Menampilkan data gaji khusus untuk karyawan departemen STAFF
                </li>
                <li>
                  • Perhitungan gaji STAFF menggunakan sistem yang berbeda
                </li>
                <li>
                  • Kolom "Setengah Hari" menunjukkan hari masuk dengan hitungan
                  setengah gaji
                </li>
                <li>• Status pembayaran dapat diubah langsung dari tabel</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            🔍 Filter & Aksi Data
          </h2>
        </div>

        {/* Date Filters */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium text-gray-700 mb-3">
            Filter Periode Gaji
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                📅 Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                📅 Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                💳 Status Pembayaran
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="dibayar">✅ Sudah Dibayar</option>
                <option value="pending">⏳ Pending</option>
                <option value="belum dibayar">❌ Belum Dibayar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Management Actions */}
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-700 mb-3">
            ⚙️ Aksi Manajemen Gaji
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a
                href="/dashboard/salary/process"
                className="flex items-center gap-2"
              >
                <span>🔄</span>
                Proses Gaji
              </a>
            </Button>
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <a
                href="/dashboard/salary/bonus"
                className="flex items-center gap-2"
              >
                <span>🎁</span>
                Bonus Departemen
              </a>
            </Button>
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <a
                href="/dashboard/salary/potongan"
                className="flex items-center gap-2"
              >
                <span>✂️</span>
                Kelola Potongan
              </a>
            </Button>
            <Button asChild className="bg-gray-600 hover:bg-gray-700">
              <a
                href="/dashboard/salary/update-staff"
                className="flex items-center gap-2"
              >
                <span>👔</span>
                Update STAFF
              </a>
            </Button>
          </div>
        </div>

        {/* Selection Actions */}
        <div className="p-4">
          <h3 className="font-medium text-gray-700 mb-3">
            📊 Aksi Data Terpilih
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              onClick={() => setShowBonusModal(true)}
              disabled={selectedItems.length === 0}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              <span className="mr-2">💰</span>
              Bonus Individual ({selectedItems.length})
            </Button>
            <Button
              onClick={() => handleExportPDF("download")}
              variant="outline"
              disabled={exporting || selectedItems.length === 0}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <span className="mr-2">📥</span>
              {exporting
                ? "Exporting..."
                : `Download PDF (${selectedItems.length})`}
            </Button>
            <Button
              onClick={() => handleExportPDF("print")}
              variant="outline"
              disabled={exporting || selectedItems.length === 0}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
            >
              <span className="mr-2">🖨️</span>
              {exporting
                ? "Printing..."
                : `Print PDF (${selectedItems.length})`}
            </Button>
          </div>
          {selectedItems.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              💡 Pilih minimal satu karyawan dari tabel untuk menggunakan aksi
              di atas
            </p>
          )}
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              📋 Data Gaji Karyawan
            </h2>
            <div className="text-sm text-gray-600">
              Menampilkan {filtered.length} dari {data.length} data
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Memuat data gaji karyawan...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Gagal Memuat Data
              </h3>
              <p className="text-red-500 mb-4">{error}</p>
              <Button
                onClick={loadData}
                className="bg-red-600 hover:bg-red-700"
              >
                🔄 Coba Lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Tidak Ada Data
              </h3>
              <p className="text-gray-500 mb-4">
                {data.length === 0
                  ? "Belum ada data gaji yang tersedia. Silakan proses gaji terlebih dahulu."
                  : "Tidak ada data yang sesuai dengan filter yang dipilih. Coba ubah filter tanggal atau status."}
              </p>
              {data.length === 0 && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href="/dashboard/salary/process">
                    <span className="mr-2">🔄</span>
                    Proses Gaji Sekarang
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedItems.length === filtered.length &&
                          filtered.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        title={
                          selectedItems.length === filtered.length
                            ? "Batalkan pilih semua"
                            : "Pilih semua"
                        }
                      />
                    </TableHead>
                    <TableHead className="font-semibold">
                      👤 Nama Karyawan
                    </TableHead>
                    <TableHead className="font-semibold">🆔 NIK</TableHead>
                    <TableHead className="font-semibold">
                      🏢 Departemen
                    </TableHead>
                    <TableHead className="font-semibold">📅 Periode</TableHead>
                    <TableHead className="font-semibold text-right">
                      💵 Gaji Pokok
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      🎁 Bonus
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      ✂️ Potongan
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      💰 Gaji Bersih
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      📊 Absensi
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      ⏰ Setengah Hari
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      💳 Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((gaji) => (
                    <TableRow key={gaji.id} className="hover:bg-gray-50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(gaji.id)}
                          onChange={() => handleSelectItem(gaji.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                            {gaji.karyawan?.namaLengkap
                              ?.charAt(0)
                              ?.toUpperCase() || "?"}
                          </div>
                          {gaji.karyawan?.namaLengkap || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {gaji.karyawan?.nik || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {gaji.karyawan?.departemen || "Tidak Ada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="text-gray-600">
                          {gaji.periodeAwal} - {gaji.periodeAkhir}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(gaji.gajiPokok || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-medium">
                          {formatCurrency(gaji.bonus || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600 font-medium">
                          {formatCurrency(gaji.potongan || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {formatCurrency(gaji.totalGajiBersih || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          {gaji.totalHariMasuk || 0} hari
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {gaji.totalHariSetengahHari ? (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-800"
                          >
                            {gaji.totalHariSetengahHari} hari
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <select
                          value={gaji.statusPembayaran || "Belum Dibayar"}
                          onChange={(e) =>
                            handleStatusChange(gaji.id, e.target.value)
                          }
                          disabled={updatingStatus === gaji.id}
                          className={`border rounded-md px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-blue-500 ${
                            gaji.statusPembayaran === "Dibayar"
                              ? "bg-green-50 text-green-800 border-green-300"
                              : gaji.statusPembayaran === "Pending"
                              ? "bg-yellow-50 text-yellow-800 border-yellow-300"
                              : "bg-red-50 text-red-800 border-red-300"
                          }`}
                        >
                          <option value="Belum Dibayar">
                            ❌ Belum Dibayar
                          </option>
                          <option value="Dibayar">✅ Sudah Dibayar</option>
                          <option value="Pending">⏳ Pending</option>
                        </select>
                        {updatingStatus === gaji.id && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                            Updating...
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Bonus Individual */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Input Bonus Individual</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {selectedItems.length} karyawan dipilih untuk diberi bonus
              </p>
            </div>

            {/* Pilihan Tipe Bonus */}
            <div className="mb-4">
              <label className="block mb-2 font-semibold">Tipe Bonus</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="equal"
                    checked={bonusType === "equal"}
                    onChange={(e) =>
                      setBonusType(e.target.value as "equal" | "different")
                    }
                    className="mr-2"
                  />
                  Sama Rata
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="different"
                    checked={bonusType === "different"}
                    onChange={(e) =>
                      setBonusType(e.target.value as "equal" | "different")
                    }
                    className="mr-2"
                  />
                  Berbeda per Karyawan
                </label>
              </div>
            </div>

            {/* Form Bonus Sama Rata */}
            {bonusType === "equal" && (
              <div className="mb-4">
                <label className="block mb-2 font-semibold">
                  Nominal Bonus (Sama Rata)
                </label>
                <input
                  type="number"
                  value={equalBonus}
                  onChange={(e) => setEqualBonus(e.target.value)}
                  min={1}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Masukkan nominal bonus"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Bonus ini akan diberikan kepada semua karyawan yang dipilih
                </p>
              </div>
            )}

            {/* Form Bonus Berbeda */}
            {bonusType === "different" && (
              <div className="mb-4">
                <label className="block mb-2 font-semibold">
                  Bonus per Karyawan
                </label>
                <div className="border rounded p-4 bg-gray-50 max-h-60 overflow-y-auto">
                  {filtered
                    .filter((gaji) => selectedItems.includes(gaji.id))
                    .map((gaji) => (
                      <div
                        key={gaji.id}
                        className="flex items-center gap-4 mb-3 p-2 border-b"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {gaji.karyawan?.namaLengkap}
                          </div>
                          <div className="text-sm text-gray-600">
                            NIK: {gaji.karyawan?.nik}
                          </div>
                          <div className="text-sm text-gray-600">
                            Gaji Pokok: {formatCurrency(gaji.gajiPokok || 0)}
                          </div>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={differentBonuses[gaji.id] || ""}
                            onChange={(e) =>
                              updateDifferentBonus(gaji.id, e.target.value)
                            }
                            min={0}
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="Bonus"
                          />
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Masukkan nominal bonus untuk setiap karyawan secara individual
                </p>
              </div>
            )}

            {/* Preview */}
            {bonusType === "equal" && equalBonus && (
              <div className="mb-4 border rounded p-4 bg-green-50">
                <h4 className="font-semibold mb-2">Preview Bonus Sama Rata</h4>
                <p>Nominal: {formatCurrency(Number(equalBonus))}</p>
                <p>Jumlah Karyawan: {selectedItems.length}</p>
                <p>
                  Total Bonus:{" "}
                  {formatCurrency(Number(equalBonus) * selectedItems.length)}
                </p>
              </div>
            )}

            {bonusType === "different" &&
              Object.keys(differentBonuses).length > 0 && (
                <div className="mb-4 border rounded p-4 bg-green-50">
                  <h4 className="font-semibold mb-2">
                    Preview Bonus Individual
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    {Object.entries(differentBonuses).map(([gajiId, bonus]) => {
                      const gaji = filtered.find((g) => g.id === gajiId);
                      return (
                        <div key={gajiId} className="flex justify-between py-1">
                          <span>{gaji?.karyawan?.namaLengkap}</span>
                          <span>{formatCurrency(Number(bonus))}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <strong>
                      Total Bonus:{" "}
                      {formatCurrency(
                        Object.values(differentBonuses).reduce(
                          (sum, bonus) => sum + Number(bonus),
                          0
                        )
                      )}
                    </strong>
                  </div>
                </div>
              )}

            {/* Message */}
            {bonusMsg && (
              <div
                className={`mb-4 text-center text-sm p-2 rounded ${
                  bonusMsg.includes("berhasil")
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {bonusMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBonusModal(false);
                  setBonusMsg("");
                  setEqualBonus("");
                  setDifferentBonuses({});
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleBonusSubmit}
                disabled={
                  bonusLoading ||
                  (bonusType === "equal" && !equalBonus) ||
                  (bonusType === "different" &&
                    Object.keys(differentBonuses).length === 0)
                }
              >
                {bonusLoading ? "Menyimpan..." : "Simpan Bonus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
