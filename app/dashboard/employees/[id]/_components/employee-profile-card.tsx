import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
} from "@/components/ui/display/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/display/avatar";
import {
  Phone,
  Mail,
  Building,
  Crop,
  UserRound,
} from "lucide-react";
import { getStatusBadge } from "./utils";

const HUMAN_FALLBACK_AVATAR = "/images/fallbacks/avatar-human.svg";

interface EmployeeProfileCardProps {
  employee: any;
  avatarSrc: string;
  leaveInfo: any;
  uploadError: string;
  uploading: boolean;
  handleUploadFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function EmployeeProfileCard({
  employee,
  avatarSrc,
  leaveInfo,
  uploadError,
  uploading,
  handleUploadFoto,
}: EmployeeProfileCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={avatarSrc}
                alt={employee.name}
                onError={(e) => {
                  // Jika gambar gagal dimuat, gunakan fallback
                  const target = e.target as HTMLImageElement;
                  target.src = HUMAN_FALLBACK_AVATAR;
                }}
                onLoad={() => {
                  // Tidak perlu log apa-apa di sini
                }}
              />
              <AvatarFallback className="bg-zinc-100 text-zinc-500">
                <UserRound className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>

            {/* Upload Foto Button */}
            <div className="absolute -bottom-2 -right-2">
              <label htmlFor="upload-foto" className="cursor-pointer">
                <div className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full p-2 shadow-lg">
                  <Crop className="h-4 w-4" />
                </div>
              </label>
              <input
                id="upload-foto"
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">
                {employee.name}
              </h2>
              <p className="text-lg text-zinc-600">{employee.position}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-zinc-500">
                  NIK: {employee.nip}
                </span>
                {getStatusBadge(employee.status)}
              </div>
            </div>

            {uploadError && (
              <div className="text-sm text-red-600 bg-zinc-50 p-2 rounded">
                {uploadError}
              </div>
            )}

            {uploading && (
              <div className="text-sm text-zinc-700 bg-zinc-50 p-2 rounded flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600 mr-2"></div>
                Mengupload foto...
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-600">
                  {employee.department}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-600">
                  {employee.phone}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-600">
                  {employee.email}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-zinc-600">
                  Bergabung{" "}
                  {new Date(employee.joinDate).toLocaleDateString("id-ID")}
                </span>
              </div>
              {leaveInfo && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-zinc-600">
                    Sisa Cuti: {leaveInfo.sisaCuti}/{leaveInfo.batasMaksimal} hari
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
