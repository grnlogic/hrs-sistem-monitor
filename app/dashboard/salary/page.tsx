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
  const [activeTab, setActiveTab] = useState<"all" | "staff" | "paid">("all");
  const [dataTab, setDataTab] = useState<"unpaid" | "paid">("unpaid");
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusType, setBonusType] = useState<"equal" | "different">("equal");
  const [equalBonus, setEqualBonus] = useState("");
  const [differentBonuses, setDifferentBonuses] = useState<{
    [key: string]: string;
  }>({});
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusMsg, setBonusMsg] = useState("");
  const [batchUpdateLoading, setBatchUpdateLoading] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
        // Gunakan endpoint detail yang baru untuk mendapatkan data per periode
        const { getGajiByDateRangeDetailed } = await import("@/lib/api");
        result = await getGajiByDateRangeDetailed(startDate, endDate);
      } else {
        // Gunakan endpoint detail untuk semua data (tidak agregasi)
        const { getAllSalaries } = await import("@/lib/api");
        result = await getAllSalaries();
      }

      // Agregasi data berdasarkan karyawan dan status pembayaran
      console.log("Data gaji dari API (sebelum agregasi):", result);

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

            // Update agregat: totalGaji dijumlahkan, gajiPokok TIDAK dijumlahkan (tetap sebagai dasar per hari/bulan)
            // Pertahankan gajiPokok dari entry pertama agar tampil sesuai "dasar tarif"
            existing.totalGaji =
              (existing.totalGaji || 0) + (item.totalGaji || 0);
            if (item.bonus) {
              existing.bonus = (existing.bonus || 0) + item.bonus;
            }
            // totalGajiBersih akan dihitung ulang, jadi tidak perlu diagregasi

            // PERBAIKAN: Agregasi semua field potongan detail
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
          }

          return acc;
        }, {});

        // Convert back to array dan format periode display
        const aggregatedData = Object.values(groupedData).map((item: any) => {
          // Hitung ulang total potongan berdasarkan detail potongan yang sudah diagregasi
          const totalPotonganDetail =
            (item.pajakPph21 || 0) +
            (item.potonganKeterlambatan || 0) +
            (item.potonganPinjaman || 0) +
            (item.potonganSumbangan || 0) +
            (item.potonganBpjs || 0) +
            (item.potonganUndangan || 0);

          // Hitung ulang gaji bersih berdasarkan data yang sudah diagregasi
          // totalGaji sudah mencerminkan gaji pokok (termasuk penyesuaian hari/setengah hari) + bonus
          const totalPendapatan = item.totalGaji || 0;
          const gajiBersihCorrect = totalPendapatan - totalPotonganDetail;

          return {
            ...item,
            // Update total potongan dengan nilai yang benar
            potongan: totalPotonganDetail,
            // Update gaji bersih dengan nilai yang benar
            gajiBersih: gajiBersihCorrect,
            totalGajiBersih: gajiBersihCorrect,
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
          };
        });

        console.log("Data gaji setelah agregasi:", aggregatedData);

        // Debug: Log beberapa contoh data agregasi dengan detail potongan
        if (aggregatedData.length > 0) {
          console.log("=== SAMPLE AGGREGATED DATA ===");
          aggregatedData.slice(0, 3).forEach((item: any, index: number) => {
            console.log(`Aggregated sample ${index + 1}:`, {
              nama: item.karyawan?.namaLengkap,
              pajakPph21: item.pajakPph21,
              potonganKeterlambatan: item.potonganKeterlambatan,
              potonganPinjaman: item.potonganPinjaman,
              potonganSumbangan: item.potonganSumbangan,
              potonganBpjs: item.potonganBpjs,
              potonganUndangan: item.potonganUndangan,
              totalCalculated:
                (item.pajakPph21 || 0) +
                (item.potonganKeterlambatan || 0) +
                (item.potonganPinjaman || 0) +
                (item.potonganSumbangan || 0) +
                (item.potonganBpjs || 0) +
                (item.potonganUndangan || 0),
            });
          });
          console.log("=== END SAMPLE ===");
        }
        setData(aggregatedData);
      } else {
        setData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data gaji");
      console.error("Error loading salary data:", err);
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
      // Cari data yang dipilih untuk mendapatkan originalIds jika ada
      const selectedItem = dataTabFiltered.find((item) => item.id === gajiId);
      const idsToUpdate = selectedItem?.originalIds || [gajiId];

      console.log(`Single update for ${gajiId}, updating IDs:`, idsToUpdate);

      // Update semua ID asli yang terkait
      for (const originalId of idsToUpdate) {
        await salaryAPI.updateStatusPembayaranWithPeriod({
          gajiId: originalId,
          statusPembayaran: newStatus,
          periodeAwal: startDate,
          periodeAkhir: endDate,
        });
      }

      // Refresh data setelah update
      await loadData();
    } catch (error) {
      console.error("Gagal mengupdate status:", error);
      setError("Gagal mengupdate status pembayaran");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Fungsi untuk batch update status pembayaran
  const handleBatchStatusUpdate = async (newStatus: string) => {
    // Debouncing - prevent multiple rapid clicks
    const now = Date.now();
    if (now - lastClickTime < 2000) {
      // 2 second debounce
      console.log("Debouncing: Click ignored");
      return;
    }
    setLastClickTime(now);

    if (selectedItems.length === 0) {
      alert("Pilih minimal satu data untuk diupdate");
      return;
    }

    if (batchUpdateLoading) {
      console.log("Already processing, ignoring click");
      return;
    }

    const confirmed = confirm(
      `Apakah Anda yakin ingin mengubah status ${selectedItems.length} data menjadi "${newStatus}"?`
    );

    if (!confirmed) return;

    setBatchUpdateLoading(true);
    try {
      console.log("Starting batch update:", { selectedItems, newStatus });

      // Update status untuk semua item yang dipilih dengan error handling per item
      const updatePromises = selectedItems.map(async (aggregatedId) => {
        try {
          // Cari data yang dipilih untuk mendapatkan originalIds
          const selectedItem = dataTabFiltered.find(
            (item) => item.id === aggregatedId
          );
          const idsToUpdate = selectedItem?.originalIds || [aggregatedId];

          console.log(`Updating IDs for ${aggregatedId}:`, idsToUpdate);

          // Update semua ID asli yang terkait dengan data agregasi ini
          const updateResults = await Promise.all(
            idsToUpdate.map(async (originalId: string) => {
              // Add timeout to prevent hanging
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Timeout updating ${originalId}`)),
                  10000
                )
              );

              // Gunakan endpoint yang lebih sederhana tanpa validasi periode
              const updatePromise = salaryAPI.updateStatusPembayaran({
                gajiId: originalId,
                statusPembayaran: newStatus,
              });

              await Promise.race([updatePromise, timeoutPromise]);
              return originalId;
            })
          );

          return {
            gajiId: aggregatedId,
            originalIds: updateResults,
            success: true,
          };
        } catch (error) {
          console.error(`Failed to update ${aggregatedId}:`, error);
          return { gajiId: aggregatedId, success: false, error };
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      ).length;

      console.log("Batch update results:", results);

      // Refresh data dengan retry mechanism
      try {
        await loadData();
      } catch (loadError) {
        console.error("Error refreshing data:", loadError);
        // Don't fail the whole operation, just warn user
        alert(
          "Status berhasil diupdate, tetapi gagal refresh data. Silakan refresh halaman manual."
        );
      }

      // Jika status diubah menjadi "Dibayar", handle PDF dan redirect
      if (newStatus === "Dibayar" && successCount > 0) {
        const successfulItems = results
          .filter(
            (result) => result.status === "fulfilled" && result.value.success
          )
          .map(
            (result) =>
              (
                result as PromiseFulfilledResult<{
                  gajiId: string;
                  success: boolean;
                }>
              ).value.gajiId
          );

        const selectedData = dataTabFiltered.filter((item) =>
          successfulItems.includes(item.id)
        );

        // Auto print PDF dengan error handling
        if (selectedData.length > 0) {
          try {
            console.log("=== CONSOLIDATING DATA FOR PDF ===");
            console.log(
              "Selected data before consolidation:",
              selectedData.map((item) => ({
                nama: item.karyawan?.namaLengkap,
                pajakPph21: item.pajakPph21,
                potonganKeterlambatan: item.potonganKeterlambatan,
                potonganPinjaman: item.potonganPinjaman,
                potonganSumbangan: item.potonganSumbangan,
                potonganBpjs: item.potonganBpjs,
                potonganUndangan: item.potonganUndangan,
              }))
            );

            // Gabungkan data berdasarkan karyawan yang sama (nama dan NIK)
            const groupedDataForPDF = selectedData.reduce((acc, item) => {
              const key = `${item.karyawan?.namaLengkap}_${item.karyawan?.nik}`;

              console.log(`Processing item for key: ${key}`, {
                pajakPph21: item.pajakPph21,
                potonganKeterlambatan: item.potonganKeterlambatan,
                potonganPinjaman: item.potonganPinjaman,
                potonganSumbangan: item.potonganSumbangan,
                potonganBpjs: item.potonganBpjs,
                potonganUndangan: item.potonganUndangan,
              });

              if (!acc[key]) {
                // Buat entry baru untuk karyawan ini
                acc[key] = {
                  ...item,
                  // Gabungkan periode
                  periodeAwal: item.periodeAwal,
                  periodeAkhir: item.periodeAkhir,
                  // Total akumulasi untuk karyawan ini
                  gajiPokok: item.gajiPokok || 0,
                  bonus: item.bonus || 0,
                  totalHariMasuk: item.totalHariMasuk || 0,
                  totalHariSetengahHari: item.totalHariSetengahHari || 0,
                  // Gabungkan semua potongan detail dengan benar
                  pajakPph21: Number(item.pajakPph21) || 0,
                  potonganKeterlambatan:
                    Number(item.potonganKeterlambatan) || 0,
                  potonganPinjaman: Number(item.potonganPinjaman) || 0,
                  potonganSumbangan: Number(item.potonganSumbangan) || 0,
                  potonganBpjs: Number(item.potonganBpjs) || 0,
                  potonganUndangan: Number(item.potonganUndangan) || 0,
                };
                console.log(`Created new entry for ${key}:`, acc[key]);
              } else {
                // Gabungkan dengan entry yang sudah ada
                const existing = acc[key];
                console.log(`Merging data for existing ${key}:`, {
                  existingBefore: {
                    pajakPph21: existing.pajakPph21,
                    potonganKeterlambatan: existing.potonganKeterlambatan,
                    potonganPinjaman: existing.potonganPinjaman,
                    potonganSumbangan: existing.potonganSumbangan,
                    potonganBpjs: existing.potonganBpjs,
                    potonganUndangan: existing.potonganUndangan,
                  },
                  newItem: {
                    pajakPph21: item.pajakPph21,
                    potonganKeterlambatan: item.potonganKeterlambatan,
                    potonganPinjaman: item.potonganPinjaman,
                    potonganSumbangan: item.potonganSumbangan,
                    potonganBpjs: item.potonganBpjs,
                    potonganUndangan: item.potonganUndangan,
                  },
                });

                existing.gajiPokok =
                  (existing.gajiPokok || 0) + (item.gajiPokok || 0);
                existing.bonus = (existing.bonus || 0) + (item.bonus || 0);
                existing.totalHariMasuk =
                  (existing.totalHariMasuk || 0) + (item.totalHariMasuk || 0);
                existing.totalHariSetengahHari =
                  (existing.totalHariSetengahHari || 0) +
                  (item.totalHariSetengahHari || 0);

                // Gabungkan potongan detail dengan benar
                const oldPajakPph21 = existing.pajakPph21 || 0;
                const oldPotonganKeterlambatan =
                  existing.potonganKeterlambatan || 0;
                const oldPotonganPinjaman = existing.potonganPinjaman || 0;
                const oldPotonganSumbangan = existing.potonganSumbangan || 0;
                const oldPotonganBpjs = existing.potonganBpjs || 0;
                const oldPotonganUndangan = existing.potonganUndangan || 0;

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
                  (existing.potonganBpjs || 0) +
                  (Number(item.potonganBpjs) || 0);
                existing.potonganUndangan =
                  (existing.potonganUndangan || 0) +
                  (Number(item.potonganUndangan) || 0);

                console.log(`After merging for ${key}:`, {
                  pajakPph21: `${oldPajakPph21} + ${
                    Number(item.pajakPph21) || 0
                  } = ${existing.pajakPph21}`,
                  potonganKeterlambatan: `${oldPotonganKeterlambatan} + ${
                    Number(item.potonganKeterlambatan) || 0
                  } = ${existing.potonganKeterlambatan}`,
                  potonganPinjaman: `${oldPotonganPinjaman} + ${
                    Number(item.potonganPinjaman) || 0
                  } = ${existing.potonganPinjaman}`,
                  potonganSumbangan: `${oldPotonganSumbangan} + ${
                    Number(item.potonganSumbangan) || 0
                  } = ${existing.potonganSumbangan}`,
                  potonganBpjs: `${oldPotonganBpjs} + ${
                    Number(item.potonganBpjs) || 0
                  } = ${existing.potonganBpjs}`,
                  potonganUndangan: `${oldPotonganUndangan} + ${
                    Number(item.potonganUndangan) || 0
                  } = ${existing.potonganUndangan}`,
                });

                // Update periode untuk mencakup range yang lebih luas
                if (
                  item.periodeAwal &&
                  (!existing.periodeAwal ||
                    item.periodeAwal < existing.periodeAwal)
                ) {
                  existing.periodeAwal = item.periodeAwal;
                }
                if (
                  item.periodeAkhir &&
                  (!existing.periodeAkhir ||
                    item.periodeAkhir > existing.periodeAkhir)
                ) {
                  existing.periodeAkhir = item.periodeAkhir;
                }
              }

              return acc;
            }, {} as Record<string, any>);

            const consolidatedDataForPDF = Object.values(groupedDataForPDF).map(
              (item: any) => {
                // Jika tidak ada totalHari, hitung berdasarkan range tanggal
                if (!item.totalHari && item.periodeAwal && item.periodeAkhir) {
                  if (item.periodeAwal === item.periodeAkhir) {
                    item.totalHari = 1;
                  } else {
                    const startDate = new Date(item.periodeAwal);
                    const endDate = new Date(item.periodeAkhir);
                    item.totalHari =
                      Math.ceil(
                        (endDate.getTime() - startDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1;
                  }
                }

                // Jika masih tidak ada totalHari, gunakan total hari masuk + hari setengah
                if (!item.totalHari) {
                  item.totalHari =
                    (item.totalHariMasuk || 0) +
                    (item.totalHariSetengahHari || 0);
                }

                // TAMBAHAN: Generate periodeDisplay untuk PDF (sama dengan format di halaman utama)
                item.periodeDisplay =
                  item.totalHari === 1
                    ? `${item.periodeAwal} (1 hari)`
                    : `${item.periodeAwal} - ${item.periodeAkhir} (${item.totalHari} hari)`;

                return item;
              }
            );

            console.log("=== FINAL CONSOLIDATED DATA FOR PDF ===");
            consolidatedDataForPDF.forEach((item: any, index: number) => {
              console.log(`Final consolidated item ${index + 1}:`, {
                nama: item.karyawan?.namaLengkap,
                pajakPph21: item.pajakPph21,
                potonganKeterlambatan: item.potonganKeterlambatan,
                potonganPinjaman: item.potonganPinjaman,
                potonganSumbangan: item.potonganSumbangan,
                potonganBpjs: item.potonganBpjs,
                potonganUndangan: item.potonganUndangan,
                totalCalculated:
                  (item.pajakPph21 || 0) +
                  (item.potonganKeterlambatan || 0) +
                  (item.potonganPinjaman || 0) +
                  (item.potonganSumbangan || 0) +
                  (item.potonganBpjs || 0) +
                  (item.potonganUndangan || 0),
              });
            });
            console.log("=== END FINAL CONSOLIDATED DATA ===");

            console.log("Data structure check:", {
              count: consolidatedDataForPDF.length,
              firstItem: consolidatedDataForPDF[0],
              hasKaryawan: consolidatedDataForPDF.every(
                (item: any) => item.karyawan
              ),
            });

            await printSalaryPDF(consolidatedDataForPDF);
          } catch (pdfError) {
            console.error("Error printing PDF:", pdfError);
            alert(
              `Warning: Status berhasil diupdate, tetapi gagal mencetak PDF: ${
                pdfError instanceof Error ? pdfError.message : "Unknown error"
              }`
            );
          }
        }

        // Pindah ke tab "Data Sudah Dibayar"
        setDataTab("paid");
      }

      // Reset selection
      setSelectedItems([]);

      // Show success message with details
      let successMsg = `Berhasil mengupdate ${successCount} dari ${selectedItems.length} data`;
      if (newStatus === "Dibayar") {
        successMsg += ` menjadi "Dibayar"${
          successCount > 0 ? " dan mencetak slip gaji!" : "!"
        }`;
        if (successCount > 0) {
          successMsg += ` Data tersimpan di tab "Sudah Dibayar".`;
        }
      } else {
        successMsg += ` menjadi "${newStatus}"!`;
      }

      if (successCount < selectedItems.length) {
        successMsg += ` (${
          selectedItems.length - successCount
        } item gagal diupdate)`;
      }

      setSuccessMessage(successMsg);
      setShowSuccessMessage(true);

      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error("Gagal mengupdate status batch:", error);
      alert(
        `Gagal mengupdate status batch: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setBatchUpdateLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === dataTabFiltered.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(dataTabFiltered.map((item) => item.id));
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
      const selectedData = dataTabFiltered.filter((item) =>
        selectedItems.includes(item.id)
      );

      // Validasi data sebelum export
      if (selectedData.length === 0) {
        throw new Error("Data yang dipilih tidak valid");
      }

      console.log("Exporting aggregated data:", selectedData);

      // Gabungkan data berdasarkan karyawan yang sama (nama dan NIK)
      const groupedDataForPDF = selectedData.reduce((acc, item) => {
        const key = `${item.karyawan?.namaLengkap}_${item.karyawan?.nik}`;

        if (!acc[key]) {
          // Buat entry baru untuk karyawan ini
          acc[key] = {
            ...item,
            // Gabungkan periode
            periodeAwal: item.periodeAwal,
            periodeAkhir: item.periodeAkhir,
            // Total akumulasi untuk karyawan ini
            gajiPokok: item.gajiPokok || 0,
            bonus: item.bonus || 0,
            totalHariMasuk: item.totalHariMasuk || 0,
            totalHariSetengahHari: item.totalHariSetengahHari || 0,
            totalHari: item.totalHari || 0, // Tambahkan totalHari
            // Gabungkan semua potongan detail dengan benar
            pajakPph21: Number(item.pajakPph21) || 0,
            potonganKeterlambatan: Number(item.potonganKeterlambatan) || 0,
            potonganPinjaman: Number(item.potonganPinjaman) || 0,
            potonganSumbangan: Number(item.potonganSumbangan) || 0,
            potonganBpjs: Number(item.potonganBpjs) || 0,
            potonganUndangan: Number(item.potonganUndangan) || 0,
          };
        } else {
          // Gabungkan dengan entry yang sudah ada
          const existing = acc[key];
          existing.gajiPokok =
            (existing.gajiPokok || 0) + (item.gajiPokok || 0);
          existing.bonus = (existing.bonus || 0) + (item.bonus || 0);
          existing.totalHariMasuk =
            (existing.totalHariMasuk || 0) + (item.totalHariMasuk || 0);
          existing.totalHariSetengahHari =
            (existing.totalHariSetengahHari || 0) +
            (item.totalHariSetengahHari || 0);

          // Gabungkan potongan detail dengan benar
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

          // Update periode untuk mencakup range yang lebih luas
          if (
            item.periodeAwal &&
            (!existing.periodeAwal || item.periodeAwal < existing.periodeAwal)
          ) {
            existing.periodeAwal = item.periodeAwal;
          }
          if (
            item.periodeAkhir &&
            (!existing.periodeAkhir ||
              item.periodeAkhir > existing.periodeAkhir)
          ) {
            existing.periodeAkhir = item.periodeAkhir;
          }

          // Update total hari jika ada
          if (item.totalHari) {
            existing.totalHari =
              (existing.totalHari || 0) + (item.totalHari || 0);
          }
        }

        return acc;
      }, {} as Record<string, any>);

      // Hitung ulang totalHari untuk setiap item yang diagregasi
      const consolidatedDataForPDF = Object.values(groupedDataForPDF).map(
        (item: any) => {
          // Jika tidak ada totalHari, hitung berdasarkan range tanggal
          if (!item.totalHari && item.periodeAwal && item.periodeAkhir) {
            if (item.periodeAwal === item.periodeAkhir) {
              item.totalHari = 1;
            } else {
              const startDate = new Date(item.periodeAwal);
              const endDate = new Date(item.periodeAkhir);
              item.totalHari =
                Math.ceil(
                  (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;
            }
          }

          // Jika masih tidak ada totalHari, gunakan total hari masuk + hari setengah
          if (!item.totalHari) {
            item.totalHari =
              (item.totalHariMasuk || 0) + (item.totalHariSetengahHari || 0);
          }

          // TAMBAHAN: Generate periodeDisplay untuk PDF (sama dengan format di halaman utama)
          item.periodeDisplay =
            item.totalHari === 1
              ? `${item.periodeAwal} (1 hari)`
              : `${item.periodeAwal} - ${item.periodeAkhir} (${item.totalHari} hari)`;

          return item;
        }
      );

      if (action === "download") {
        await downloadSalaryPDF(consolidatedDataForPDF);
      } else {
        await printSalaryPDF(consolidatedDataForPDF);
      }

      // Show success message
      alert(`${action === "download" ? "Download" : "Print"} PDF berhasil!`);
    } catch (error) {
      console.error("Gagal export PDF:", error);
      alert(
        `Gagal ${action === "download" ? "download" : "print"} PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
        for (const aggregatedId of selectedItems) {
          // Cari data yang dipilih untuk mendapatkan originalIds
          const selectedItem = dataTabFiltered.find(
            (item) => item.id === aggregatedId
          );
          const idsToUpdate = selectedItem?.originalIds || [aggregatedId];

          // Tambahkan bonus ke semua ID asli
          for (const originalId of idsToUpdate) {
            await salaryAPI.addBonus({
              gajiId: originalId,
              bonus: Number(equalBonus),
            });
          }
        }
        setBonusMsg(
          `Bonus berhasil ditambahkan untuk ${selectedItems.length} karyawan!`
        );
      } else {
        // Bonus berbeda untuk setiap karyawan
        for (const [aggregatedId, bonus] of Object.entries(differentBonuses)) {
          if (selectedItems.includes(aggregatedId) && bonus) {
            // Cari data yang dipilih untuk mendapatkan originalIds
            const selectedItem = dataTabFiltered.find(
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

    // Filter berdasarkan data yang sudah dibayar
    if (activeTab === "paid") {
      filteredData = data.filter(
        (item) => (item.statusPembayaran || "").toLowerCase() === "dibayar"
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

  // Filter data berdasarkan data tab (untuk tabel data gaji)
  const getDataTabFiltered = () => {
    const baseFiltered = getFilteredData();

    if (dataTab === "unpaid") {
      return baseFiltered.filter(
        (item) => (item.statusPembayaran || "").toLowerCase() !== "dibayar"
      );
    } else {
      return baseFiltered.filter(
        (item) => (item.statusPembayaran || "").toLowerCase() === "dibayar"
      );
    }
  };

  const filtered = getFilteredData();
  const dataTabFiltered = getDataTabFiltered();

  // Reset selected items ketika tab berubah
  useEffect(() => {
    setSelectedItems([]);
    setShowBonusModal(false);
    setEqualBonus("");
    setDifferentBonuses({});
    setBonusMsg("");
  }, [activeTab, dataTab]);

  return (
    <div className="p-6 space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg max-w-md">
          <div className="flex items-start gap-2">
            <span className="text-xl">✅</span>
            <div>
              <div className="font-semibold">Berhasil!</div>
              <div className="text-sm">{successMessage}</div>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-auto text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {batchUpdateLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <div className="font-semibold">Memproses Pembayaran...</div>
              <div className="text-sm text-gray-600">
                Mohon tunggu, jangan tutup halaman ini
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          💰 Sistem Penggajian Karyawan
        </h1>
        <p className="text-blue-100">
          Kelola data gaji, bonus, potongan, dan laporan penggajian karyawan
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
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
            <div className="font-semibold">Sudah Dibayar</div>
            <div className="text-2xl font-bold">
              {
                data.filter(
                  (item) =>
                    (item.statusPembayaran || "").toLowerCase() === "dibayar"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-amber-700">
          <div>
            <strong>1. Filter Data:</strong> Gunakan tanggal dan status untuk
            menyaring data
          </div>
          <div>
            <strong>2. Pilih Karyawan:</strong> Centang checkbox untuk memilih
            karyawan
          </div>
          <div>
            <strong>3. Bayar & Print:</strong> Ubah status jadi "Dibayar" dan
            auto-print slip
          </div>
          <div>
            <strong>4. Batalkan Pembayaran:</strong> Kembalikan status ke "Belum
            Dibayar"
          </div>
          <div>
            <strong>5. Tab "Sudah Dibayar":</strong> Lihat histori gaji (status
            tetap bisa diubah)
          </div>
          <div>
            <strong>6. Export/Bonus:</strong> Kelola bonus dan export PDF
          </div>
        </div>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="text-lg">ℹ️</span>
            <strong>Info Agregasi Data:</strong>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Data gaji dengan status sama akan digabungkan per periode untuk
            mempermudah manajemen. Periode ditampilkan sebagai range tanggal
            dengan total hari kerja.
          </p>
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 text-yellow-800">
              <span className="text-sm">💡</span>
              <strong>Perhitungan Gaji:</strong>
            </div>
            <ul className="text-xs text-yellow-700 mt-1 space-y-1">
              <li>
                • <strong>STAFF:</strong> Gaji pokok = gaji per bulan, Total
                gaji = gaji pokok - potongan setengah hari
              </li>
              <li>
                • <strong>Non-STAFF:</strong> Gaji pokok = gaji per hari, Total
                gaji = gaji harian (hari penuh + setengah hari)
              </li>
              <li>
                • <strong>Gaji Bersih:</strong> Total gaji + bonus - potongan
                (ditampilkan di bawah Total Gaji)
              </li>
            </ul>
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
            onValueChange={(value) =>
              setActiveTab(value as "all" | "staff" | "paid")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
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
              <TabsTrigger
                value="paid"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                ✅ Sudah Dibayar (
                {
                  data.filter(
                    (item) =>
                      (item.statusPembayaran || "").toLowerCase() === "dibayar"
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
              {selectedItems.length} dari {dataTabFiltered.length} karyawan
              dipilih
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

      {activeTab === "paid" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h4 className="font-semibold text-emerald-800 mb-2">
                Data Gaji yang Sudah Dibayar
              </h4>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>
                  • Menampilkan data gaji karyawan yang statusnya sudah
                  "Dibayar"
                </li>
                <li>
                  • Data ini merupakan histori pembayaran gaji yang telah
                  selesai
                </li>
                <li>
                  • Cocok untuk laporan pembayaran per minggu atau periode
                  tertentu
                </li>
                <li>
                  • PDF slip gaji sudah digenerate saat status diubah ke
                  "Dibayar"
                </li>
                <li>
                  • <strong>Status masih bisa diubah kembali</strong> jika
                  diperlukan (mis: batalkan pembayaran)
                </li>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
              onClick={() => handleBatchStatusUpdate("Dibayar")}
              disabled={batchUpdateLoading || selectedItems.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchUpdateLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  Bayar & Print ({selectedItems.length})
                </>
              )}
            </Button>
            <Button
              onClick={() => handleBatchStatusUpdate("Pending")}
              disabled={batchUpdateLoading || selectedItems.length === 0}
              variant="outline"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchUpdateLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span className="mr-2">⏳</span>
                  Set Pending ({selectedItems.length})
                </>
              )}
            </Button>
            <Button
              onClick={() => handleBatchStatusUpdate("Belum Dibayar")}
              disabled={batchUpdateLoading || selectedItems.length === 0}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchUpdateLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span className="mr-2">❌</span>
                  Batalkan Bayar ({selectedItems.length})
                </>
              )}
            </Button>
            <Button
              onClick={() => handleExportPDF("download")}
              variant="outline"
              disabled={exporting || selectedItems.length === 0}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <span className="mr-2">📥</span>
                  Download PDF ({selectedItems.length})
                </>
              )}
            </Button>
            <Button
              onClick={() => handleExportPDF("print")}
              variant="outline"
              disabled={exporting || selectedItems.length === 0}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                  Printing...
                </>
              ) : (
                <>
                  <span className="mr-2">🖨️</span>
                  Print PDF ({selectedItems.length})
                </>
              )}
            </Button>
          </div>
          {selectedItems.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              💡 Pilih minimal satu karyawan dari tabel untuk menggunakan aksi
              di atas
            </p>
          )}
          {selectedItems.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                <strong>💡 Tips:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>
                  • <strong>"Bayar & Print"</strong> - Ubah status ke "Dibayar"
                  + auto print PDF
                </li>
                <li>
                  • <strong>"Batalkan Bayar"</strong> - Kembalikan status dari
                  "Dibayar" ke "Belum Dibayar"
                </li>
                <li>
                  • <strong>"Set Pending"</strong> - Ubah status ke "Pending"
                  (untuk review)
                </li>
                <li>
                  • Status bisa diubah kapan saja melalui dropdown di tabel
                </li>
              </ul>
            </div>
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
              Menampilkan {dataTabFiltered.length} dari {data.length} data
            </div>
          </div>
        </div>

        {/* Tab untuk Data Gaji */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">
              Filter Status Pembayaran:
            </span>
          </div>
          <Tabs
            value={dataTab}
            onValueChange={(value) => setDataTab(value as "unpaid" | "paid")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 max-w-md">
              <TabsTrigger
                value="unpaid"
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white text-sm"
              >
                ❌ Belum Dibayar (
                {
                  getFilteredData().filter(
                    (item) =>
                      (item.statusPembayaran || "").toLowerCase() !== "dibayar"
                  ).length
                }
                )
              </TabsTrigger>
              <TabsTrigger
                value="paid"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white text-sm"
              >
                ✅ Sudah Dibayar (
                {
                  getFilteredData().filter(
                    (item) =>
                      (item.statusPembayaran || "").toLowerCase() === "dibayar"
                  ).length
                }
                )
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Info Tab */}
          {dataTab === "unpaid" && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">
                <strong>📋 Tab Belum Dibayar:</strong> Data gaji yang belum
                dibayar atau masih pending. Anda dapat memproses pembayaran dari
                tab ini.
              </p>
            </div>
          )}

          {dataTab === "paid" && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                <strong>✅ Tab Sudah Dibayar:</strong> Histori gaji yang sudah
                dibayar. Status masih bisa diubah kembali jika diperlukan
                (misalnya untuk pembatalan).
              </p>
            </div>
          )}
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
          ) : dataTabFiltered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Tidak Ada Data
              </h3>
              <p className="text-gray-500 mb-4">
                {dataTab === "unpaid"
                  ? "Tidak ada data gaji yang belum dibayar sesuai filter yang dipilih."
                  : "Belum ada data gaji yang sudah dibayar sesuai filter yang dipilih."}
              </p>
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
                          selectedItems.length === dataTabFiltered.length &&
                          dataTabFiltered.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        title={
                          selectedItems.length === dataTabFiltered.length
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
                    <TableHead className="font-semibold">
                      📅 Periode Kerja
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        Range tanggal & total hari
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      💵 Gaji Pokok
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        Dasar per hari/bulan
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      🎁 Bonus
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      ✂️ Potongan
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      💰 Gaji Bersih
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        Final + Bonus - Potongan
                      </div>
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
                  {dataTabFiltered.map((gaji) => (
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
                          {gaji.periodeDisplay ||
                            `${gaji.periodeAwal} - ${gaji.periodeAkhir}`}
                        </div>
                        {gaji.totalHari && gaji.totalHari > 1 && (
                          <div className="text-xs text-blue-600 font-medium mt-1">
                            📅 {gaji.totalHari} hari kerja
                          </div>
                        )}
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
                        {activeTab === "paid" && (
                          <div className="text-xs text-blue-600 mt-1">
                            💡 Bisa diubah kembali
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
                  {dataTabFiltered
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
                            Gaji Bersih:{" "}
                            {formatCurrency(gaji.totalGajiBersih || 0)}
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
                      const gaji = dataTabFiltered.find((g) => g.id === gajiId);
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
