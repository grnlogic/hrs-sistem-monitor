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
  const [absensi, setAbsensi] = useState<AbsensiState>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

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
    // Set semua karyawan di departemen ini ke HADIR
    const updated: AbsensiState = { ...absensi };
    karyawan
      .filter((k) => k.departemen === dept)
      .forEach((k) => {
        updated[k.id] = { 
          hadir: true, 
          status: "HADIR",
          setengahHari: false 
        };
      });
    setAbsensi(updated);
    setShowList(false); // hide daftar karyawan setelah pilih departemen
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
        ...(field === "status" && value === "OFF" && { setengahHari: false, hadir: false }),
        // Jika setengah hari true, hadir harus true dan status bukan OFF
        ...(field === "setengahHari" && value && { hadir: true, status: prev[id]?.status === "OFF" ? "HADIR" : prev[id]?.status }),
      },
    }));
  };

  // Submit absensi massal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
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
      try {
        const res = await publicAbsensiAPI.updateStatus(
          k.id,
          absen.hadir,
          absen.status,
          absen.setengahHari
        );
        if (res.success) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }
    setResult(
      `Absensi selesai. Berhasil: ${successCount}, Gagal: ${failCount}.`
    );
    setLoading(false);
  };

  // Tampilkan karyawan di departemen terpilih
  const filteredKaryawan = karyawan.filter(
    (k) => k.departemen === selectedDept
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Pilih Departemen</Label>
        <Select value={selectedDept} onValueChange={handleSelectDept}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih departemen..." />
          </SelectTrigger>
          <SelectContent>
            {departemenList.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedDept && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowList((v) => !v)}
              className="text-xs px-3 py-1"
            >
              {showList
                ? "Sembunyikan Daftar Karyawan"
                : "Tampilkan Daftar Karyawan"}
            </Button>
            <span className="text-sm text-gray-500">
              ({filteredKaryawan.length} karyawan)
            </span>
          </div>
          {showList && (
            <div>
              <Label>Daftar Karyawan ({selectedDept})</Label>
              <div className="space-y-2 mt-2">
                {filteredKaryawan.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-2 border-b pb-2"
                  >
                    <input
                      type="checkbox"
                      checked={absensi[k.id]?.hadir ?? true}
                      onChange={(e) =>
                        handleChangeStatus(k.id, "hadir", e.target.checked)
                      }
                      id={`hadir-${k.id}`}
                      disabled={absensi[k.id]?.status === "OFF"}
                    />
                    <label htmlFor={`hadir-${k.id}`} className="w-32">
                      {k.namaLengkap}
                    </label>
                    <Select
                      value={absensi[k.id]?.status || "HADIR"}
                      onValueChange={(val) =>
                        handleChangeStatus(k.id, "status", val)
                      }
                      disabled={!(absensi[k.id]?.hadir ?? true) && absensi[k.id]?.status !== "OFF"}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={absensi[k.id]?.setengahHari ?? false}
                        onChange={(e) =>
                          handleChangeStatus(k.id, "setengahHari", e.target.checked)
                        }
                        disabled={!(absensi[k.id]?.hadir ?? true) || absensi[k.id]?.status === "OFF"}
                        id={`setengah-hari-${k.id}`}
                        className="w-4 h-4"
                      />
                      <label 
                        htmlFor={`setengah-hari-${k.id}`} 
                        className="text-xs text-gray-600"
                        title="Setengah hari - hanya dihitung setengah gaji"
                      >
                        Setengah Hari
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Info Status Absensi:</strong>
                <ul className="mt-1 space-y-1">
                  <li><strong>HADIR:</strong> Karyawan masuk kerja normal</li>
                  <li><strong>SAKIT:</strong> Karyawan tidak masuk karena sakit</li>
                  <li><strong>IZIN:</strong> Karyawan tidak masuk dengan izin</li>
                  <li><strong>ALPA:</strong> Karyawan tidak masuk tanpa keterangan</li>
                  <li><strong>OFF:</strong> Tidak ada jalur/tidak ada pekerjaan (tidak dihitung absensi)</li>
                  <li><strong>Setengah Hari:</strong> Karyawan masuk tapi hanya dihitung setengah gaji pokok</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      <Button
        type="submit"
        disabled={loading || !selectedDept}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {loading ? "Menyimpan..." : "Simpan Absensi Publik"}
      </Button>
      {result && <div className="mt-2 text-sm text-blue-700">{result}</div>}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </form>
  );
}


