import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/display/card";

export function UsageNotesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catatan Penggunaan</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-zinc-600">
        <ul className="list-disc space-y-1 pl-5">
          <li>Template ini disimpan dalam database SQLite lokal agar dapat dengan mudah dipanggil ulang.</li>
          <li>Step 2 (Print PKB) akan selalu mengambil versi terbaru yang telah disimpan.</li>
          <li>Anda dapat upload gambar lewat toolbar atau drag file gambar langsung ke area dokumen.</li>
          <li>Klik gambar atau tabel untuk mengaktifkan kontrol ukuran dan posisi di panel atas editor.</li>
          <li>Jika Anda menambahkan placeholder baru, pastikan nama variabel sesuai daftar di samping.</li>
          <li>Gunakan tombol Reset jika ingin kembali ke format standar perusahaan.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
