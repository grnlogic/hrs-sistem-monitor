"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import { salaryAPI } from "@/lib/api";

export default function BonusPage() {
  const router = useRouter();
  const [gajiList, setGajiList] = useState<any[]>([]);
  const [gajiId, setGajiId] = useState("");
  const [bonus, setBonus] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  // Hapus karyawanId

  useEffect(() => {
    import("@/lib/api").then(({ getAllSalaries }) => {
      getAllSalaries().then((res) => {
        console.log("Data gaji yang diambil (bonus):", res);
        setGajiList(res);
      });
    });
  }, []);

  const selectedGaji = gajiList.find((g) => String(g.id) === String(gajiId));
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
      await salaryAPI.addBonus({ gajiId, bonus: Number(bonus) });
      setMsg("Bonus berhasil ditambahkan!");
      setTimeout(() => router.push("/dashboard/salary"), 1500);
    } catch {
      setMsg("Gagal menambahkan bonus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Input Bonus Gaji</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Pilih Gaji</label>
          <select
            value={gajiId}
            onChange={(e) => setGajiId(e.target.value)}
            required
            className="w-full border rounded px-2 py-1"
          >
            <option value="">-- Pilih --</option>
            {gajiList.map((g) => (
              <option key={g.id} value={g.id}>
                {g.periodeAwal} - {g.periodeAkhir} | {g.karyawan?.namaLengkap} (
                {g.karyawan?.nik})
              </option>
            ))}
          </select>
        </div>
        {selectedGaji && (
          <div className="border rounded p-3 bg-gray-50 mb-2">
            <div className="mb-1">
              <b>Periode:</b> {selectedGaji.periodeAwal} -{" "}
              {selectedGaji.periodeAkhir}
            </div>
            <div className="mb-1">
              <b>Gaji Pokok:</b> {formatCurrency(selectedGaji.gajiPokok)}
            </div>
            <div className="mb-1">
              <b>Bonus:</b> {formatCurrency(selectedGaji.bonus)}
            </div>
            <div className="mb-1">
              <b>Potongan:</b> {formatCurrency(selectedGaji.potongan)}
            </div>
            <div className="mb-1">
              <b>Gaji Bersih:</b> {formatCurrency(selectedGaji.totalGajiBersih)}
            </div>
            <div className="mb-1">
              <b>Status:</b> {selectedGaji.statusPembayaran}
            </div>
          </div>
        )}
        <div>
          <label className="block mb-1">Nominal Bonus</label>
          <input
            type="number"
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            required
            min={1}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Bonus"}
          </Button>
        </div>
        {msg && <div className="mt-2 text-center text-sm">{msg}</div>}
      </form>
    </div>
  );
}
