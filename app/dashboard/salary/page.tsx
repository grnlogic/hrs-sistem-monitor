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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/navigation/tabs";
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Rekap Gaji Karyawan</h1>

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "all" | "staff")}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">
            Karyawan Belakang ({data.length})
          </TabsTrigger>
          <TabsTrigger value="staff">
            STAFF (
            {
              data.filter((item) =>
                item.karyawan?.departemen?.toLowerCase().includes("staff")
              ).length
            }
            )
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {selectedItems.length > 0 && (
        <div className="mb-2 text-sm text-blue-600">
          {selectedItems.length} dari {filtered.length} data dipilih
        </div>
      )}

      {activeTab === "staff" && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Tab STAFF menampilkan data gaji khusus untuk
            karyawan dengan departemen yang mengandung kata "STAFF". Perhitungan
            gaji untuk STAFF mungkin berbeda dengan karyawan lainnya. Kolom
            "Setengah Hari" menampilkan jumlah hari karyawan masuk setengah hari
            (hanya dihitung setengah gaji).
          </p>
        </div>
      )}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Tanggal Mulai:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Tanggal Akhir:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">Semua Status</option>
          <option value="dibayar">Dibayar</option>
          <option value="pending">Pending</option>
        </select>
        <Button asChild>
          <a href="/dashboard/salary/process">Proses Gaji</a>
        </Button>
        <Button asChild>
          <a href="/dashboard/salary/bonus">Tambah Bonus (Departemen)</a>
        </Button>
        <Button
          onClick={() => setShowBonusModal(true)}
          disabled={selectedItems.length === 0}
          variant="outline"
        >
          Bonus Individual ({selectedItems.length})
        </Button>
        <Button asChild>
          <a href="/dashboard/salary/potongan">Kelola Potongan</a>
        </Button>
        <Button
          onClick={() => handleExportPDF("download")}
          variant="outline"
          disabled={exporting || selectedItems.length === 0}
        >
          {exporting
            ? "Exporting..."
            : `Download PDF (${selectedItems.length})`}
        </Button>
        <Button
          onClick={() => handleExportPDF("print")}
          variant="outline"
          disabled={exporting || selectedItems.length === 0}
        >
          {exporting ? "Printing..." : `Print PDF (${selectedItems.length})`}
        </Button>
      </div>
      {loading ? (
        <div>Memuat data...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4"
                  />
                </TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Total Potongan</TableHead>
                <TableHead>Total Gaji Bersih</TableHead>
                <TableHead>Total Absensi</TableHead>
                <TableHead>Setengah Hari</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((gaji) => (
                  <TableRow key={gaji.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(gaji.id)}
                        onChange={() => handleSelectItem(gaji.id)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell>{gaji.karyawan?.namaLengkap}</TableCell>
                    <TableCell>{gaji.karyawan?.nik}</TableCell>
                    <TableCell>{gaji.karyawan?.departemen || "-"}</TableCell>
                    <TableCell>
                      {gaji.periodeAwal} - {gaji.periodeAkhir}
                    </TableCell>
                    <TableCell>{formatCurrency(gaji.gajiPokok || 0)}</TableCell>
                    <TableCell>{formatCurrency(gaji.bonus || 0)}</TableCell>
                    <TableCell>{formatCurrency(gaji.potongan || 0)}</TableCell>
                    <TableCell>
                      {formatCurrency(gaji.totalGajiBersih || 0)}
                    </TableCell>
                    <TableCell>{gaji.totalHariMasuk || 0}</TableCell>
                    <TableCell>
                      {gaji.totalHariSetengahHari ? (
                        <Badge variant="secondary" className="text-xs">
                          {gaji.totalHariSetengahHari} hari
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        value={gaji.statusPembayaran || "Belum Dibayar"}
                        onChange={(e) =>
                          handleStatusChange(gaji.id, e.target.value)
                        }
                        disabled={updatingStatus === gaji.id}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="Belum Dibayar">Belum Dibayar</option>
                        <option value="Dibayar">Dibayar</option>
                        <option value="Pending">Pending</option>
                      </select>
                      {updatingStatus === gaji.id && (
                        <span className="text-xs text-gray-500 ml-1">
                          Updating...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
