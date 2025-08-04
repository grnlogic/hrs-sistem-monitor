import React, { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicKaryawanAPI, publicAbsensiAPI } from "@/lib/api";

const statusOptions = ["HADIR", "SAKIT", "IZIN", "ALPA", "OFF"];

interface Karyawan {
  id: number;
  namaLengkap: string;
  departemen: string;
}

interface AbsensiState {
  [id: number]: {
    hadir: boolean;
    status: string;
    setengahHari: boolean;
  };
}

export default function PublicAbsensiForm() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  ); // Default hari ini
  const [absensi, setAbsensi] = useState<AbsensiState>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(true); // Langsung tampilkan list
  const [confirmationStep, setConfirmationStep] = useState(false);

  // Format tanggal untuk tampilan
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch karyawan
  useEffect(() => {
    async function fetchKaryawan() {
      try {
        const data = await publicKaryawanAPI.getAll();
        setKaryawan(data);
      } catch (err) {
        setError("Gagal mengambil data karyawan.");
      }
    }
    fetchKaryawan();
  }, []);

  // Ambil list departemen unik
  const departemenList = Array.from(
    new Set(karyawan.map((k) => k.departemen))
  ).filter(Boolean);

  // Handle pilih departemen
  const handleSelectDept = (dept: string) => {
    setSelectedDept(dept);
    setConfirmationStep(false); // Reset confirmation
    // Set semua karyawan di departemen ini ke HADIR
    const updated: AbsensiState = { ...absensi };
    karyawan
      .filter((k) => k.departemen === dept)
      .forEach((k) => {
        updated[k.id] = {
          hadir: true,
          status: "HADIR",
          setengahHari: false,
        };
      });
    setAbsensi(updated);
    setShowList(true); // Langsung tampilkan list karyawan
  };

  // Handle ubah status/ceklis per karyawan
  const handleChangeStatus = (
    id: number,
    field: "hadir" | "status" | "setengahHari",
    value: any
  ) => {
    setAbsensi((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        // Jika tidak hadir atau status OFF, setengah hari harus false
        ...(field === "hadir" && !value && { setengahHari: false }),
        ...(field === "status" &&
          value === "OFF" && { setengahHari: false, hadir: false }),
        // Jika setengah hari true, hadir harus true dan status bukan OFF
        ...(field === "setengahHari" &&
          value && {
            hadir: true,
            status: prev[id]?.status === "OFF" ? "HADIR" : prev[id]?.status,
          }),
      },
    }));
  };

  // Submit absensi massal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi: user harus konfirmasi dulu
    if (!confirmationStep) {
      setConfirmationStep(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    
    // ✅ Debug: Log tanggal yang dipilih
    console.log("📅 [ABSENSI FORM] Memproses absensi untuk tanggal:", {
      selectedDate,
      formattedDate: formatDate(selectedDate),
      selectedDept,
      totalKaryawan: karyawan.filter((k) => k.departemen === selectedDept).length
    });
    
    const deptKaryawan = karyawan.filter((k) => k.departemen === selectedDept);
    if (!selectedDept || deptKaryawan.length === 0) {
      setError("Pilih departemen terlebih dahulu.");
      setLoading(false);
      return;
    }
    let successCount = 0;
    let failCount = 0;
    for (const k of deptKaryawan) {
      const absen = absensi[k.id];
      if (!absen) continue;
      
      // ✅ Debug: Log setiap request absensi
      console.log(`👤 [ABSENSI] Memproses ${k.namaLengkap} (ID: ${k.id}):`, {
        tanggal: selectedDate,
        hadir: absen.hadir,
        status: absen.status,
        setengahHari: absen.setengahHari
      });
      
      try {
        const res = await publicAbsensiAPI.updateStatus(
          k.id,
          absen.hadir,
          absen.status,
          absen.setengahHari,
          selectedDate
        );
        if (res.success) successCount++;
        else failCount++;
      } catch (err) {
        console.error(`❌ [ABSENSI] Error untuk ${k.namaLengkap}:`, err);
        failCount++;
      }
    }
    setResult(
      `Absensi selesai untuk tanggal ${formatDate(
        selectedDate
      )}. Berhasil: ${successCount}, Gagal: ${failCount}.`
    );
    setConfirmationStep(false);
    setLoading(false);
  };

  // Tampilkan karyawan di departemen terpilih
  const filteredKaryawan = karyawan.filter(
    (k) => k.departemen === selectedDept
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      {/* Header dengan tanggal yang dipilih */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          📋 Form Absensi Harian
        </h1>

        {/* Date Picker */}
        <div className="mb-4">
          <Label
            htmlFor="date-picker"
            className="text-lg font-semibold text-gray-700 block mb-2"
          >
            📅 Pilih Tanggal Absensi
          </Label>
          <Input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-64 mx-auto text-center text-lg font-semibold"
            max={new Date().toISOString().split("T")[0]} // Tidak bisa pilih tanggal masa depan
          />
        </div>

        <div className="text-lg font-semibold text-blue-600 bg-blue-50 py-2 px-4 rounded-lg">
          {formatDate(selectedDate)}
        </div>
        
        {/* ⚠️ PERINGATAN: Tanggal mundur */}
        {selectedDate !== new Date().toISOString().split("T")[0] && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 text-sm font-semibold">
              ⚠️ PERHATIAN: Anda memilih tanggal {formatDate(selectedDate)}
            </p>
            <p className="text-orange-700 text-xs mt-1">
              Jika backend belum mendukung tanggal mundur, data mungkin tetap tersimpan untuk hari ini.
              Silakan cek hasil setelah menyimpan.
            </p>
          </div>
        )}
        
        <p className="text-sm text-gray-600 mt-2">
          ⚠️ Pastikan data sudah benar sebelum menyimpan!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <Label className="text-lg font-semibold text-gray-700">
            🏢 Pilih Departemen
          </Label>
          <Select value={selectedDept} onValueChange={handleSelectDept}>
            <SelectTrigger className="mt-2 h-12 text-lg">
              <SelectValue placeholder="Pilih departemen..." />
            </SelectTrigger>
            <SelectContent>
              {departemenList.map((dept) => (
                <SelectItem key={dept} value={dept} className="text-lg py-3">
                  🏢 {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedDept && (
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
            {/* Header departemen */}
            <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
              <h2 className="text-xl font-bold">
                🏢 Departemen: {selectedDept}
              </h2>
              <p className="text-blue-100">
                Total karyawan: {filteredKaryawan.length} orang
              </p>
            </div>

            {/* Always show employee list */}
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm font-semibold">
                  ⚠️ PERHATIAN: Silakan cek dan ubah status absensi sesuai
                  keadaan sebenarnya!
                </p>
              </div>

              <Label className="text-lg font-semibold text-gray-700 mb-3 block">
                👥 Daftar Karyawan - {selectedDept}
              </Label>

              <div className="space-y-3">
                {filteredKaryawan.map((k, index) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={absensi[k.id]?.hadir ?? true}
                        onChange={(e) =>
                          handleChangeStatus(k.id, "hadir", e.target.checked)
                        }
                        id={`hadir-${k.id}`}
                        disabled={absensi[k.id]?.status === "OFF"}
                        className="w-5 h-5"
                      />
                      <label
                        htmlFor={`hadir-${k.id}`}
                        className="text-sm text-gray-600"
                      >
                        Hadir
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {k.namaLengkap}
                      </p>
                    </div>

                    <Select
                      value={absensi[k.id]?.status || "HADIR"}
                      onValueChange={(val) =>
                        handleChangeStatus(k.id, "status", val)
                      }
                      disabled={
                        !(absensi[k.id]?.hadir ?? true) &&
                        absensi[k.id]?.status !== "OFF"
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt === "HADIR" && "✅ HADIR"}
                            {opt === "SAKIT" && "🤒 SAKIT"}
                            {opt === "IZIN" && "📝 IZIN"}
                            {opt === "ALPA" && "❌ ALPA"}
                            {opt === "OFF" && "🚫 OFF"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={absensi[k.id]?.setengahHari ?? false}
                        onChange={(e) =>
                          handleChangeStatus(
                            k.id,
                            "setengahHari",
                            e.target.checked
                          )
                        }
                        disabled={
                          !(absensi[k.id]?.hadir ?? true) ||
                          absensi[k.id]?.status === "OFF"
                        }
                        id={`setengah-hari-${k.id}`}
                        className="w-4 h-4"
                      />
                      <label
                        htmlFor={`setengah-hari-${k.id}`}
                        className="text-xs text-gray-600"
                        title="Setengah hari - hanya dihitung setengah gaji"
                      >
                        ½ Hari
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="bg-green-100 p-2 rounded text-center">
                  <div className="text-lg font-bold text-green-600">
                    {
                      filteredKaryawan.filter(
                        (k) => absensi[k.id]?.status === "HADIR"
                      ).length
                    }
                  </div>
                  <div className="text-xs text-green-600">Hadir</div>
                </div>
                <div className="bg-yellow-100 p-2 rounded text-center">
                  <div className="text-lg font-bold text-yellow-600">
                    {
                      filteredKaryawan.filter(
                        (k) => absensi[k.id]?.status === "SAKIT"
                      ).length
                    }
                  </div>
                  <div className="text-xs text-yellow-600">Sakit</div>
                </div>
                <div className="bg-blue-100 p-2 rounded text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {
                      filteredKaryawan.filter(
                        (k) => absensi[k.id]?.status === "IZIN"
                      ).length
                    }
                  </div>
                  <div className="text-xs text-blue-600">Izin</div>
                </div>
                <div className="bg-red-100 p-2 rounded text-center">
                  <div className="text-lg font-bold text-red-600">
                    {
                      filteredKaryawan.filter(
                        (k) => absensi[k.id]?.status === "ALPA"
                      ).length
                    }
                  </div>
                  <div className="text-xs text-red-600">Alpha</div>
                </div>
                <div className="bg-gray-100 p-2 rounded text-center">
                  <div className="text-lg font-bold text-gray-600">
                    {
                      filteredKaryawan.filter(
                        (k) => absensi[k.id]?.status === "OFF"
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-600">Off</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <strong>📋 Keterangan Status Absensi:</strong>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <strong>✅ HADIR:</strong> Karyawan masuk kerja normal
                  </div>
                  <div>
                    <strong>🤒 SAKIT:</strong> Karyawan tidak masuk karena sakit
                  </div>
                  <div>
                    <strong>📝 IZIN:</strong> Karyawan tidak masuk dengan izin
                  </div>
                  <div>
                    <strong>❌ ALPA:</strong> Karyawan tidak masuk tanpa
                    keterangan
                  </div>
                  <div>
                    <strong>🚫 OFF:</strong> Tidak ada jalur/tidak ada pekerjaan
                  </div>
                  <div>
                    <strong>½ Hari:</strong> Masuk tapi hanya dihitung setengah
                    gaji
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Confirmation step */}
        {selectedDept && confirmationStep && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-red-700 mb-3">
              ⚠️ KONFIRMASI PENYIMPANAN ABSENSI
            </h3>
            <p className="text-red-600 mb-3">
              Anda akan menyimpan absensi untuk <strong>{selectedDept}</strong>{" "}
              tanggal <strong>{formatDate(selectedDate)}</strong>
            </p>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Ringkasan:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div>
                  ✅ Hadir:{" "}
                  {
                    filteredKaryawan.filter(
                      (k) => absensi[k.id]?.status === "HADIR"
                    ).length
                  }
                </div>
                <div>
                  🤒 Sakit:{" "}
                  {
                    filteredKaryawan.filter(
                      (k) => absensi[k.id]?.status === "SAKIT"
                    ).length
                  }
                </div>
                <div>
                  📝 Izin:{" "}
                  {
                    filteredKaryawan.filter(
                      (k) => absensi[k.id]?.status === "IZIN"
                    ).length
                  }
                </div>
                <div>
                  ❌ Alpha:{" "}
                  {
                    filteredKaryawan.filter(
                      (k) => absensi[k.id]?.status === "ALPA"
                    ).length
                  }
                </div>
                <div>
                  🚫 Off:{" "}
                  {
                    filteredKaryawan.filter(
                      (k) => absensi[k.id]?.status === "OFF"
                    ).length
                  }
                </div>
              </div>
            </div>
            <p className="text-red-600 text-sm mt-3">
              <strong>
                Pastikan data sudah benar! Data yang sudah disimpan tidak bisa
                dibatalkan dengan mudah.
              </strong>
            </p>
          </div>
        )}

        {/* Submit button */}
        <div className="flex gap-3 justify-center">
          {confirmationStep && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmationStep(false)}
              className="px-8 py-3 text-lg"
            >
              🔙 Kembali Cek Data
            </Button>
          )}

          <Button
            type="submit"
            disabled={loading || !selectedDept}
            className={`px-8 py-3 text-lg font-semibold ${
              confirmationStep
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading
              ? "⏳ Menyimpan..."
              : confirmationStep
              ? "✅ YA, SIMPAN ABSENSI"
              : "📋 CEK & SIMPAN ABSENSI"}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-lg font-semibold text-green-700">
              ✅ {result}
            </div>
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="text-lg font-semibold text-red-700">❌ {error}</div>
          </div>
        )}
      </form>
    </div>
  );
}
