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

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
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
          grouped[id].totalHariSetengahHari +=
            item.totalHariSetengahHari || 0;
          grouped[id].bonus += item.bonus || 0;
          grouped[id].totalGaji += item.totalGaji || 0;
          grouped[id].potongan += item.potongan || 0;
          grouped[id].pajakPph21 += item.pajakPph21 || 0;
          grouped[id].potonganKeterlambatan +=
            item.potonganKeterlambatan || 0;
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
        return (item.statusPembayaran || "").toLowerCase() === status.toLowerCase();
      }
      return true;
    });
  };

  const filtered = getFilteredData();

  // Reset selected items ketika tab berubah
  useEffect(() => {
    setSelectedItems([]);
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
          <a href="/dashboard/salary/bonus">Tambah Bonus</a>
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
                    <TableCell>
                      {formatCurrency(gaji.gajiPokok || 0)}
                    </TableCell>
                    <TableCell>{formatCurrency(gaji.bonus || 0)}</TableCell>
                    <TableCell>
                      {formatCurrency(gaji.potongan || 0)}
                    </TableCell>
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
    </div>
  );
}
