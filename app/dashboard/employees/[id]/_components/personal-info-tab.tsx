import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";


interface PersonalInfoTabProps {
  employee: any;
  leaveInfo: any;
}

export function PersonalInfoTab({ employee, leaveInfo }: PersonalInfoTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-500">
                Tanggal Lahir
              </label>
              <p className="text-zinc-900">
                {new Date(employee.birthDate).toLocaleDateString("id-ID")}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">
                Alamat
              </label>
              <p className="text-zinc-900">{employee.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">
                Gaji Pokok
              </label>
              <p className="text-zinc-900">{employee.salary}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontak Darurat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-500">
                Nama
              </label>
              <p className="text-zinc-900">
                {employee.emergencyContact.name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">
                Hubungan
              </label>
              <p className="text-zinc-900">
                {employee.emergencyContact.relation}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">
                Nomor Telepon
              </label>
              <p className="text-zinc-900">
                {employee.emergencyContact.phone}
              </p>
            </div>
          </CardContent>
        </Card>

        {leaveInfo && (
          <Card>
            <CardHeader>
              <CardTitle>
                Informasi Cuti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-500">
                  Cuti Tahun Ini
                </label>
                <p className="text-zinc-900">
                  {leaveInfo.jumlahCutiTahunIni} hari kerja
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-500">
                  Sisa Cuti
                </label>
                <p className="text-zinc-900">
                  {leaveInfo.sisaCuti} hari kerja
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-500">
                  Batas Maksimal
                </label>
                <p className="text-zinc-900">
                  {leaveInfo.batasMaksimal} hari kerja per tahun
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      leaveInfo.sisaCuti > leaveInfo.batasMaksimal / 2
                        ? "bg-zinc-500"
                        : leaveInfo.sisaCuti > leaveInfo.batasMaksimal / 4
                        ? "bg-zinc-500"
                        : "bg-zinc-500"
                    }`}
                    style={{
                      width: `${
                        (leaveInfo.sisaCuti / Math.max(1, leaveInfo.batasMaksimal)) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {Math.round(
                    (leaveInfo.sisaCuti / Math.max(1, leaveInfo.batasMaksimal)) * 100
                  )}
                  % tersisa
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tambahan: Tabel JSON Data Pribadi Lengkap */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tabel Data Pribadi</CardTitle>
          <CardDescription>Menampilkan data asli</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-left bg-zinc-50">
                    Field
                  </th>
                  <th className="border px-2 py-1 text-left bg-zinc-50">
                    Data Asli
                  </th>
                  <th className="border px-2 py-1 text-left bg-zinc-50">
                    Data Terenkripsi
                  </th>
                </tr>
              </thead>
              <tbody>
                {employee &&
                  employee._rawKaryawan &&
                  Object.entries(employee._rawKaryawan)
                    .filter(
                      ([key]) =>
                        !["absensi", "cuti", "gaji", "pelanggaran"].includes(key)
                    )
                    .map(([key, value]) => {
                      // Tentukan apakah ini field encrypted atau tidak
                      const isEncrypted =
                        key.includes("encrypted") ||
                        key.includes("Encrypted");
                      const originalKey = key
                        .replace("_encrypted", "")
                        .replace("Encrypted", "");

                      // Cari data asli jika ini field encrypted
                      let originalValue = null;
                      if (isEncrypted) {
                        originalValue =
                          employee._rawKaryawan[originalKey] ||
                          "Tidak ada data asli";
                      }

                      // Format value untuk tampilan (hindari [object Object])
                      const formatValue = (v: unknown): string => {
                        if (v === null || v === undefined) return "-";
                        if (Array.isArray(v))
                          return `${v.length} item`;
                        if (typeof v === "object" && v instanceof Date)
                          return v.toLocaleDateString("id-ID");
                        if (typeof v === "object")
                          return "[Data objek]";
                        return String(v);
                      };

                      return (
                        <tr
                          key={key}
                          className={isEncrypted ? "bg-zinc-50" : ""}
                        >
                          <td className="border px-2 py-1 font-mono text-xs font-medium">
                            {key}
                            {isEncrypted && (
                              <span className="ml-1 text-xs text-zinc-700">
                                (encrypted)
                              </span>
                            )}
                          </td>
                          <td className="border px-2 py-1 font-mono text-xs">
                            {isEncrypted ? (
                              <span className="text-zinc-700">
                                {originalValue}
                              </span>
                            ) : (
                              <span className="text-zinc-600">
                                {formatValue(value)}
                              </span>
                            )}
                          </td>
                          <td className="border px-2 py-1 font-mono text-xs">
                            {isEncrypted ? (
                              <span className="text-red-600 font-bold">
                                {formatValue(value)}
                              </span>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 bg-zinc-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Keterangan:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-zinc-50 border border-zinc-200 rounded mr-2"></div>
                <span>Field terenkripsi</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-zinc-50 border border-zinc-200 rounded mr-2"></div>
                <span className="text-zinc-700">Data asli</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-zinc-50 border border-zinc-200 rounded mr-2"></div>
                <span className="text-red-600">Data terenkripsi</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
