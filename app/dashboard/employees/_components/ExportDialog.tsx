import { Button } from "@/components/ui/form/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import { Download } from "lucide-react";
import { Checkbox } from "@/components/ui/form/checkbox";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportFormat: "pdf" | "excel";
  onExportFormatChange: (format: "pdf" | "excel") => void;
  selectedFields: string[];
  onFieldToggle: (field: string) => void;
  availableFields: Array<{ key: string; label: string }>;
  isExporting: boolean;
  onExport: () => void;
  onOpenDialog: () => void;
  isSensitiveUnlocked: boolean;
  filteredCount: number;
  totalCount: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  exportFormat,
  onExportFormatChange,
  selectedFields,
  onFieldToggle,
  availableFields,
  isExporting,
  onExport,
  onOpenDialog,
  isSensitiveUnlocked,
  filteredCount,
  totalCount,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button variant="outline" onClick={onOpenDialog}>
        <Download className="h-4 w-4 mr-2" />
        Export Data
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Data Karyawan</DialogTitle>
          <DialogDescription>
            Pilih data yang ingin diekspor dan format file yang
            diinginkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Format Export
            </label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="pdf"
                  name="format"
                  value="pdf"
                  checked={exportFormat === "pdf"}
                  onChange={(e) =>
                    onExportFormatChange(e.target.value as "pdf" | "excel")
                  }
                  className="h-4 w-4"
                />
                <label
                  htmlFor="pdf"
                  className="flex items-center text-sm"
                >
                  PDF
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="excel"
                  name="format"
                  value="excel"
                  checked={exportFormat === "excel"}
                  onChange={(e) =>
                    onExportFormatChange(e.target.value as "pdf" | "excel")
                  }
                  className="h-4 w-4"
                />
                <label
                  htmlFor="excel"
                  className="flex items-center text-sm"
                >
                  Excel
                </label>
              </div>
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Data yang Diekspor
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
              {availableFields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => onFieldToggle(field.key)}
                  />
                  <label htmlFor={field.key} className="text-sm">
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedFields.length} dari {availableFields.length} field
              dipilih
            </p>
          </div>

          {/* Info */}
          <div className="bg-zinc-50 p-3 rounded-md">
            <p className="text-sm text-zinc-900">
              <strong>Info:</strong> Data akan diekspor berdasarkan filter
              yang sedang aktif. Saat ini akan mengekspor{" "}
              {filteredCount} dari {totalCount} karyawan.
            </p>
          </div>

          {!isSensitiveUnlocked && (
            <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200">
              <p className="text-sm text-zinc-800">
                Data sensitif terkunci. Masukkan password untuk membuka
                akses export data penuh.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Batal
          </Button>
          <Button
            onClick={onExport}
            disabled={isExporting || selectedFields.length === 0}
          >
            {isExporting
              ? "Mengekspor..."
              : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
