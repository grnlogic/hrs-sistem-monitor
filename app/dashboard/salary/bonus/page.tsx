"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/form/button";
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
  const [differentBonuses, setDifferentBonuses] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    import("@/lib/api").then(({ getAllSalaries }) => {
      getAllSalaries().then((res) => {
        console.log("Data gaji yang diambil (bonus):", res);
        setGajiList(res);
      });
    });
  }, []);

  // Filter gaji berdasarkan departemen yang dipilih
  const filteredGajiList = selectedDepartment 
    ? gajiList.filter(g => g.karyawan?.departemen === selectedDepartment)
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
        await salaryAPI.addBonusByDepartmentEqual({
          departemen: selectedDepartment,
          bonus: Number(equalBonus)
        });
        setMsg(`Bonus berhasil ditambahkan untuk ${filteredGajiList.length} karyawan di departemen ${selectedDepartment}!`);
      } else {
        // Bonus berbeda untuk setiap karyawan
        await salaryAPI.addBonusByDepartmentDifferent({
          departemen: selectedDepartment,
          bonuses: Object.fromEntries(
            Object.entries(differentBonuses).map(([gajiId, bonus]) => [gajiId, Number(bonus)])
          )
        });
        setMsg(`Bonus berhasil ditambahkan untuk ${Object.keys(differentBonuses).length} karyawan!`);
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
    setDifferentBonuses(prev => ({
      ...prev,
      [gajiId]: bonus
    }));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Input Bonus Gaji Berdasarkan Departemen</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pilihan Departemen */}
        <div>
          <label className="block mb-2 font-semibold">Pilih Departemen</label>
          <select
            value={selectedDepartment}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Pilih Departemen --</option>
            {departmentOptions.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>

        {selectedDepartment && (
          <>
            {/* Informasi Departemen */}
            <div className="border rounded p-4 bg-blue-50">
              <h3 className="font-semibold mb-2">Informasi Departemen: {selectedDepartment}</h3>
              <p className="text-sm text-gray-600">
                Total karyawan: {filteredGajiList.length} orang
              </p>
            </div>

            {/* Pilihan Tipe Bonus */}
            <div>
              <label className="block mb-2 font-semibold">Tipe Bonus</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="equal"
                    checked={bonusType === "equal"}
                    onChange={(e) => handleBonusTypeChange(e.target.value as "equal" | "different")}
                    className="mr-2"
                  />
                  Sama Rata
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="different"
                    checked={bonusType === "different"}
                    onChange={(e) => handleBonusTypeChange(e.target.value as "equal" | "different")}
                    className="mr-2"
                  />
                  Berbeda per Karyawan
                </label>
              </div>
            </div>

            {/* Form Bonus Sama Rata */}
            {bonusType === "equal" && (
              <div>
                <label className="block mb-2 font-semibold">Nominal Bonus (Sama Rata)</label>
                <input
                  type="number"
                  value={equalBonus}
                  onChange={(e) => setEqualBonus(e.target.value)}
                  required
                  min={1}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Masukkan nominal bonus"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Bonus ini akan diberikan kepada semua karyawan di departemen {selectedDepartment}
                </p>
              </div>
            )}

            {/* Form Bonus Berbeda */}
            {bonusType === "different" && (
              <div>
                <label className="block mb-2 font-semibold">Bonus per Karyawan</label>
                <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  {filteredGajiList.map((gaji) => (
                    <div key={gaji.id} className="flex items-center gap-4 mb-3 p-2 border-b">
                      <div className="flex-1">
                        <div className="font-medium">{gaji.karyawan?.namaLengkap}</div>
                        <div className="text-sm text-gray-600">NIK: {gaji.karyawan?.nik}</div>
                        <div className="text-sm text-gray-600">
                          Gaji Pokok: {formatCurrency(gaji.gajiPokok || 0)}
                        </div>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={differentBonuses[gaji.id] || ""}
                          onChange={(e) => updateDifferentBonus(gaji.id, e.target.value)}
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

            {/* Preview Data */}
            {bonusType === "equal" && equalBonus && (
              <div className="border rounded p-4 bg-green-50">
                <h4 className="font-semibold mb-2">Preview Bonus Sama Rata</h4>
                <p>Departemen: {selectedDepartment}</p>
                <p>Nominal: {formatCurrency(Number(equalBonus))}</p>
                <p>Jumlah Karyawan: {filteredGajiList.length}</p>
                <p>Total Bonus: {formatCurrency(Number(equalBonus) * filteredGajiList.length)}</p>
              </div>
            )}

            {bonusType === "different" && Object.keys(differentBonuses).length > 0 && (
              <div className="border rounded p-4 bg-green-50">
                <h4 className="font-semibold mb-2">Preview Bonus Individual</h4>
                <div className="max-h-40 overflow-y-auto">
                  {Object.entries(differentBonuses).map(([gajiId, bonus]) => {
                    const gaji = filteredGajiList.find(g => g.id === gajiId);
                    return (
                      <div key={gajiId} className="flex justify-between py-1">
                        <span>{gaji?.karyawan?.namaLengkap}</span>
                        <span>{formatCurrency(Number(bonus))}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <strong>Total Bonus: {formatCurrency(
                    Object.values(differentBonuses).reduce((sum, bonus) => sum + Number(bonus), 0)
                  )}</strong>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !selectedDepartment || 
              (bonusType === "equal" && !equalBonus) ||
              (bonusType === "different" && Object.keys(differentBonuses).length === 0)
            }
          >
            {loading ? "Menyimpan..." : "Simpan Bonus"}
          </Button>
        </div>
        
        {msg && (
          <div className={`mt-2 text-center text-sm p-2 rounded ${
            msg.includes("berhasil") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}
