import { Button } from "@/components/ui/form/button";
import { RotateCcw, Check } from "lucide-react";
import ReactCrop, { Crop as CropType, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ASPECT_RATIO = 1;
const MIN_DIMENSION = 150;

interface CropModalProps {
  crop: CropType | undefined;
  setCrop: (crop: CropType) => void;
  setCompletedCrop: (crop: PixelCrop) => void;
  imgSrc: string;
  imgRef: React.RefObject<HTMLImageElement>;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  handleCancelCrop: () => void;
  handleCropComplete: () => void;
  completedCrop: PixelCrop | undefined;
}

export function CropModal({
  crop,
  setCrop,
  setCompletedCrop,
  imgSrc,
  imgRef,
  onImageLoad,
  handleCancelCrop,
  handleCropComplete,
  completedCrop,
}: CropModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Crop Foto Profil</h3>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelCrop}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCropComplete}
              disabled={!completedCrop}
            >
              <Check className="h-4 w-4 mr-2" />
              Selesai & Upload
            </Button>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={ASPECT_RATIO}
            minWidth={MIN_DIMENSION}
            minHeight={MIN_DIMENSION}
          >
            <img
              ref={imgRef}
              alt="Crop me"
              src={imgSrc}
              onLoad={onImageLoad}
              className="max-w-full h-auto"
            />
          </ReactCrop>
        </div>
        <p className="text-sm text-zinc-600 mt-2">
          Drag untuk mengatur area crop. Foto akan dipotong menjadi bentuk
          persegi.
        </p>
      </div>
    </div>
  );
}
