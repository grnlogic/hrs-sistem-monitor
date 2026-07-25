"use client";

import { SystemRole, LokasiCode } from "@/lib/api";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/display/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { NAMA_PT } from "@/lib/constants/perusahaan";

type UserFormCardProps = {
  form: {
    username: string;
    namaLengkap: string;
    email: string;
    password: string;
    role: SystemRole;
    lokasi: LokasiCode | null;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    username: string;
    namaLengkap: string;
    email: string;
    password: string;
    role: SystemRole;
    lokasi: LokasiCode | null;
  }>>;
  editingId: string | null;
  saving: boolean;
  title: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onResetForm: () => void;
};

export function UserFormCard({
  form,
  setForm,
  editingId,
  saving,
  title,
  onSubmit,
  onResetForm,
}: UserFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Role tersedia: HRD (akses penuh) dan Akuntansi (hanya gaji).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid md:grid-cols-2 gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input
              id="nama"
              value={form.namaLengkap}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, namaLengkap: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {editingId ? "(opsional saat edit)" : ""}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required={!editingId}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(value: SystemRole) =>
                setForm((prev) => ({
                  ...prev,
                  role: value,
                  lokasi: value === "AKUNTANSI" ? prev.lokasi : null,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HRD">HRD</SelectItem>
                <SelectItem value="AKUNTANSI">Akuntansi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.role === "AKUNTANSI" && (
            <div className="space-y-2">
              <Label>Lokasi Akuntansi *</Label>
              <Select
                value={form.lokasi || ""}
                onValueChange={(value: LokasiCode) =>
                  setForm((prev) => ({ ...prev, lokasi: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJP">{NAMA_PT.PJP}</SelectItem>
                  <SelectItem value="SP">{NAMA_PT.SP}</SelectItem>
                  <SelectItem value="PRIMA">{NAMA_PT.PRIMA}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="md:col-span-2 flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Buat User"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={onResetForm}>
                Batal Edit
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
