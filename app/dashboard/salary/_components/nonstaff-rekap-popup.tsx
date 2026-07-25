"use client";

import { Button } from "@/components/ui/form/button";
import type { RekapPopupState } from "./nonstaff-salary-shared";

type NonStaffRekapPopupProps = {
  rekapPopup: RekapPopupState;
  setRekapPopup: (state: RekapPopupState) => void;
};

export function NonStaffRekapPopup(props: NonStaffRekapPopupProps) {
  const { rekapPopup, setRekapPopup } = props;

  if (!rekapPopup.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-card p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">
          {rekapPopup.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {rekapPopup.message}
        </p>

        {rekapPopup.type === "loading" ? (
          <div className="mt-4 inline-flex items-center rounded-md border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Memproses update status pembayaran...
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() =>
                setRekapPopup({
                  open: false,
                  title: "",
                  message: "",
                  type: "loading",
                })
              }
            >
              Tutup
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
