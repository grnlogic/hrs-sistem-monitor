import { Badge } from "@/components/ui/display/badge";

export function getStatusBadge(status: string) {
  switch (status) {
    case "Aktif":
    case "Hadir":
    case "Disetujui":
    case "Dibayar":
      return (
        <Badge variant="default" className="bg-zinc-100 text-zinc-900">
          {status}
        </Badge>
      );
    case "Terlambat":
    case "Pending":
      return (
        <Badge variant="secondary" className="bg-zinc-100 text-zinc-800">
          {status}
        </Badge>
      );
    case "Sakit":
    case "Ditolak":
      return <Badge variant="destructive">{status}</Badge>;
    case "Tidak Ada Absensi":
      return (
        <Badge className="border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.22)] border-dashed border-2">
          Tidak Ada Absensi
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getLokasiBadge(lokasi?: string | null) {
  const norm = String(lokasi || "").trim().toUpperCase();
  switch (norm) {
    case "PJP":
      return (
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-semibold text-[11px] px-2 py-0.5">
          PJP
        </Badge>
      );
    case "SP":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-[11px] px-2 py-0.5">
          SP
        </Badge>
      );
    case "PRIMA":
      return (
        <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 font-semibold text-[11px] px-2 py-0.5">
          PRIMA
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600 text-[11px] px-2 py-0.5">
          {lokasi || "Tidak diketahui"}
        </Badge>
      );
  }
}

export function getSalaryEffectiveLocation(salary: any): string {
  if (salary?.lokasiEfektif) return salary.lokasiEfektif;
  if (salary?.lokasi) return salary.lokasi;
  if (salary?.rekap?.lokasi) return salary.rekap.lokasi;
  return "Tidak diketahui";
}

export function determineSubStatus(status: string, keterangan?: string): string {
  const normStatus = String(status || "").trim().toUpperCase();
  const ket = String(keterangan || "").trim().toLowerCase();

  if (normStatus === "SETENGAH_HARI") return "SETENGAH_HARI";
  if (normStatus === "HADIR") return "HADIR";

  if (ket.includes("sakit")) return "SAKIT";
  if (ket.includes("libur")) return "LIBUR";
  if (ket.includes("alpa")) return "ALPA";
  if (ket.includes("izin")) return "IZIN";

  if (normStatus === "IZIN") return "IZIN";
  if (normStatus === "TIDAK_HADIR") return "ALPA";

  return "ALPA";
}

export function renderIzinSakitBadge(status?: string, keterangan?: string) {
  const sub = determineSubStatus(status || "", keterangan || "");
  
  if (sub === "IZIN") {
    return (
      <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
        Izin
      </Badge>
    );
  }
  if (sub === "SAKIT") {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
        Sakit
      </Badge>
    );
  }
  if (sub === "ALPA") {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
        Alpa
      </Badge>
    );
  }
  if (sub === "LIBUR") {
    return (
      <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100">
        Libur/Off
      </Badge>
    );
  }

  return <Badge variant="outline">-</Badge>;
}

export function renderLeaveTypeLabel(leave: any) {
  if (leave?.jenisCuti === "CUTI_TAHUNAN") return "Cuti Tahunan";
  if (leave?.jenisCuti === "CUTI_MELAHIRKAN") return "Cuti Melahirkan";
  if (leave?.jenisCuti === "CUTI_LAINNYA") return leave?.labelCustom || "Cuti Lainnya";
  return leave?.jenisCuti || "-";
}

export function renderLeaveStatusBadge(status?: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PENDING") {
    return <Badge className="bg-zinc-100 text-zinc-700">Menunggu</Badge>;
  }
  if (normalized === "APPROVED") {
    return <Badge className="bg-zinc-100 text-zinc-900">Disetujui</Badge>;
  }
  if (normalized === "REJECTED") {
    return <Badge className="bg-zinc-100 text-red-800">Ditolak</Badge>;
  }
  return <Badge variant="outline">-</Badge>;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPeriodeGaji(periodeAwal?: string | null, periodeAkhir?: string | null) {
  if (!periodeAwal || !periodeAkhir) return "-";

  const start = new Date(periodeAwal);
  const end = new Date(periodeAkhir);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${periodeAwal} - ${periodeAkhir}`;
  }

  const startLabel = start.toLocaleDateString("id-ID");
  const endLabel = end.toLocaleDateString("id-ID");
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export function getSalaryRowKey(salary: any, index: number) {
  const idPart = salary?.id ? String(salary.id) : "no-id";
  const startPart = salary?.periodeAwal ? String(salary.periodeAwal) : "no-start";
  const endPart = salary?.periodeAkhir ? String(salary.periodeAkhir) : "no-end";
  return `${idPart}-${startPart}-${endPart}-${index}`;
}

export function formatIzinSakitTanggal(tanggal?: string) {
  if (!tanggal) return "-";
  const date = new Date(tanggal);
  if (Number.isNaN(date.getTime())) return "-";
  
  const isSunday = date.getDay() === 0;
  const formatted = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  
  return isSunday ? `${formatted} (MINGGU)` : formatted;
}
