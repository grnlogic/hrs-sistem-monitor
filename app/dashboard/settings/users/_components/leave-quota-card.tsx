"use client";

import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/display/card";

type LeaveQuotaCardProps = {
  isResettingLeaveQuota: boolean;
  onReset: () => void;
};

export function LeaveQuotaCard({ isResettingLeaveQuota, onReset }: LeaveQuotaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Cuti Tahunan</CardTitle>
        <CardDescription>
          Trigger manual reset jatah cuti tahunan untuk tahun berjalan (sementara manual).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isResettingLeaveQuota}
        >
          {isResettingLeaveQuota ? "Mereset Jatah Tahunan..." : "Reset Jatah Tahunan"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Tombol ini hanya ditampilkan pada bulan Januari.
        </p>
      </CardContent>
    </Card>
  );
}
