import { describe, expect, it } from "vitest";
import {
  buildStaffSlipDetailBreakdown,
  calculateStaffWorkDaysDivisor,
  getDefaultCurrentMonthRange,
  getDefaultCurrentWeekRange,
  parseDateOnlyUtc,
} from "@/lib/staff-salary-utils";

describe("staff-salary-utils (frontend)", () => {
  describe("getDefaultCurrentMonthRange", () => {
    it("returns 1st to last day of month for regular and leap February", () => {
      expect(getDefaultCurrentMonthRange(new Date(2026, 10, 18))).toEqual({
        startDate: "2026-11-01",
        endDate: "2026-11-30",
      });
      expect(getDefaultCurrentMonthRange(new Date(2024, 1, 10))).toEqual({
        startDate: "2024-02-01",
        endDate: "2024-02-29",
      });
      expect(getDefaultCurrentMonthRange(new Date(2026, 1, 10))).toEqual({
        startDate: "2026-02-01",
        endDate: "2026-02-28",
      });
    });
  });

  describe("getDefaultCurrentWeekRange", () => {
    it("returns Monday of current week up to reference date (today/yesterday)", () => {
      // Saturday Nov 28, 2026 (today) -> 23 Nov 2026 s/d 28 Nov 2026
      expect(getDefaultCurrentWeekRange(new Date(2026, 10, 28))).toEqual({
        startDate: "2026-11-23",
        endDate: "2026-11-28",
      });
      // Friday Nov 27, 2026 (yesterday) -> 23 Nov 2026 s/d 27 Nov 2026
      expect(getDefaultCurrentWeekRange(new Date(2026, 10, 27))).toEqual({
        startDate: "2026-11-23",
        endDate: "2026-11-27",
      });
      // Monday Nov 23, 2026 -> 23 Nov 2026 s/d 23 Nov 2026
      expect(getDefaultCurrentWeekRange(new Date(2026, 10, 23))).toEqual({
        startDate: "2026-11-23",
        endDate: "2026-11-23",
      });
      // Sunday Nov 29, 2026 -> 23 Nov 2026 s/d 29 Nov 2026
      expect(getDefaultCurrentWeekRange(new Date(2026, 10, 29))).toEqual({
        startDate: "2026-11-23",
        endDate: "2026-11-29",
      });
    });
  });

  describe("calculateStaffWorkDaysDivisor", () => {
    it("produces 26 or 27 for standard full calendar months minus Sundays", () => {
      expect(calculateStaffWorkDaysDivisor("2026-03-01", "2026-03-31")).toBe(26);
      expect(calculateStaffWorkDaysDivisor("2026-04-01", "2026-04-30")).toBe(26);
      expect(calculateStaffWorkDaysDivisor("2026-07-01", "2026-07-31")).toBe(27);
      expect(calculateStaffWorkDaysDivisor("2026-12-01", "2026-12-31")).toBe(27);
    });

    it("handles cutoff ranges and invalid ranges", () => {
      expect(calculateStaffWorkDaysDivisor("2026-10-26", "2026-11-25")).toBe(27);
      expect(calculateStaffWorkDaysDivisor("2026-11-20", "2026-11-10")).toBe(0);
      expect(parseDateOnlyUtc("2026-11-01")?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    });
  });

  describe("buildStaffSlipDetailBreakdown", () => {
    it("includes Data Fix and custom bonus/potongan items dynamically and sums every item", () => {
      const breakdown = buildStaffSlipDetailBreakdown(
        [
          { label: "Tunjangan Makan", nominal: 250000 },
          { label: "Bonus Kosong", nominal: 0 },
          { label: "  ", nominal: 100000 },
          { label: "Tunjangan Transport", nominal: 150000 },
        ],
        [
          { label: "Pinjaman", nominal: 100000 },
          { label: "BPJS Kesehatan", nominal: 75000 },
          { label: "Warung", nominal: 45000 },
          { label: "Sumbangan", nominal: 0 },
        ]
      );

      expect(breakdown.bonusDetails).toEqual([
        { label: "Tunjangan Makan", nominal: 250000 },
        { label: "Tunjangan Transport", nominal: 150000 },
      ]);
      expect(breakdown.potonganDetails).toEqual([
        { label: "Pinjaman", nominal: 100000 },
        { label: "BPJS Kesehatan", nominal: 75000 },
        { label: "Warung", nominal: 45000 },
      ]);
      expect(breakdown.totalBonus).toBe(400000);
      expect(breakdown.totalPotongan).toBe(220000);
    });

    it("returns empty lists and 0 totals when all items are empty or zero", () => {
      const breakdown = buildStaffSlipDetailBreakdown([], [{ label: "BPJS", nominal: 0 }]);
      expect(breakdown.bonusDetails).toEqual([]);
      expect(breakdown.potonganDetails).toEqual([]);
      expect(breakdown.totalBonus).toBe(0);
      expect(breakdown.totalPotongan).toBe(0);
    });
  });
});
