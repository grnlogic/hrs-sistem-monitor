export type StaffSlipItem = {
  label: string;
  nominal: number;
};

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDateOnlyUtc(value: string): Date | null {
  const clean = String(value || "").trim();
  const match = DATE_ONLY_REGEX.exec(clean);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Batas akhir maksimal 1 bulan kalender inklusif dari start.
 */
export function getMaxOneMonthEndDate(start: Date): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  const nextMonthLastDay = new Date(Date.UTC(year, month + 2, 0, 0, 0, 0, 0)).getUTCDate();
  const anchorNextMonth = new Date(
    Date.UTC(year, month + 1, Math.min(day, nextMonthLastDay), 0, 0, 0, 0)
  );
  return new Date(anchorNextMonth.getTime() - MS_PER_DAY);
}

/**
 * Mengembalikan rentang default satu bulan penuh (tanggal 1 s/d hari terakhir bulan berjalan)
 * dalam format date-only YYYY-MM-DD berdasarkan tanggal lokal.
 */
export function getDefaultCurrentMonthRange(referenceDate: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

/**
 * Fungsi util murni penghitung pembagi hari kerja Staff:
 * jumlah hari kalender pada rentang inklusif [startDate..endDate] dikurangi hari Minggu.
 */
export function calculateStaffWorkDaysDivisor(
  startDate: string | Date,
  endDate: string | Date
): number {
  const start =
    startDate instanceof Date
      ? new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
      : parseDateOnlyUtc(startDate);
  const end =
    endDate instanceof Date
      ? new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))
      : parseDateOnlyUtc(endDate);

  if (!start || !end || end.getTime() < start.getTime()) {
    return 0;
  }

  let workDays = 0;
  for (let ts = start.getTime(); ts <= end.getTime(); ts += MS_PER_DAY) {
    if (new Date(ts).getUTCDay() !== 0) {
      workDays += 1;
    }
  }
  return workDays;
}

/**
 * Merinci item bonus/potongan untuk slip Staff secara dinamis:
 * menghapus item tanpa label atau nominal <= 0 agar slip rapi,
 * dan menghitung total dari seluruh item yang berlaku.
 */
export function buildStaffSlipDetailBreakdown(
  bonusItems: StaffSlipItem[],
  potonganItems: StaffSlipItem[]
): {
  bonusDetails: StaffSlipItem[];
  potonganDetails: StaffSlipItem[];
  totalBonus: number;
  totalPotongan: number;
} {
  const sanitize = (items: StaffSlipItem[]) =>
    (Array.isArray(items) ? items : [])
      .map((item) => ({
        label: String(item?.label || "").trim(),
        nominal: Number(item?.nominal || 0),
      }))
      .filter((item) => item.label.length > 0 && Number.isFinite(item.nominal) && item.nominal > 0);

  const bonusDetails = sanitize(bonusItems);
  const potonganDetails = sanitize(potonganItems);
  const totalBonus = bonusDetails.reduce((sum, item) => sum + item.nominal, 0);
  const totalPotongan = potonganDetails.reduce((sum, item) => sum + item.nominal, 0);

  return {
    bonusDetails,
    potonganDetails,
    totalBonus,
    totalPotongan,
  };
}
