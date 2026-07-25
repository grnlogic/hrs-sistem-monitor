import { Button } from "@/components/ui/form/button";
import { X, File as FileIcon } from "lucide-react";

interface FilePreviewModalProps {
  previewFile: any;
  previewUrl: string | null;
  setPreviewFile: (file: any) => void;
  setPreviewUrl: (url: string | null) => void;
}

export function FilePreviewModal({
  previewFile,
  previewUrl,
  setPreviewFile,
  setPreviewUrl,
}: FilePreviewModalProps) {
  if (!previewFile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">{previewFile.nama}</h3>
            <p className="text-sm text-zinc-500">{previewFile.kategori} &bull; {previewFile.tipe}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPreviewFile(null);
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-zinc-50 rounded min-h-[300px]">
          {!previewUrl ? (
            <div className="flex flex-col items-center text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400 mb-2"></div>
              <p>Memuat preview...</p>
            </div>
          ) : previewFile.tipe === 'image' ? (
            <img
              src={previewUrl}
              alt={previewFile.nama}
              className="max-w-full max-h-[70vh] object-contain"
            />
          ) : previewFile.tipe === 'pdf' ? (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] border-0"
              title={previewFile.nama}
            />
          ) : (
            <div className="flex flex-col items-center text-zinc-400">
              <FileIcon className="h-16 w-16 mb-3" />
              <p>Preview tidak tersedia untuk tipe file ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
