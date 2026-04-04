"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Badge } from "@/components/ui/display/badge";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  SystemRole,
  SystemUser,
  userManagementAPI,
} from "@/lib/api";

const initialForm = {
  username: "",
  namaLengkap: "",
  email: "",
  password: "",
  role: "HRD" as SystemRole,
};

export default function UserManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isHRD = session?.user?.role === "HRD";

  const title = useMemo(
    () => (editingId ? "Edit User" : "Tambah User Baru"),
    [editingId]
  );

  useEffect(() => {
    if (session?.user?.role === "AKUNTANSI") {
      router.push("/penggajian");
      return;
    }

    if (session?.user?.role === "HRD") {
      loadUsers();
    }
  }, [session, router]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await userManagementAPI.getAll();
      setUsers(Array.isArray(result) ? result : []);
    } catch (e) {
      setError("Gagal memuat daftar user. Pastikan endpoint /users tersedia.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await userManagementAPI.update(editingId, {
          username: form.username,
          namaLengkap: form.namaLengkap,
          email: form.email || "",
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        setMessage("User berhasil diperbarui.");
      } else {
        await userManagementAPI.create(form);
        setMessage("User berhasil dibuat.");
      }

      resetForm();
      await loadUsers();
    } catch (e) {
      setError("Gagal menyimpan user.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      namaLengkap: user.namaLengkap,
      email: user.email || "",
      password: "",
      role: user.role,
    });
  };

  const handleDeactivate = async (id: string) => {
    setError("");
    setMessage("");
    try {
      await userManagementAPI.deactivate(id);
      setMessage("User berhasil dinonaktifkan.");
      await loadUsers();
    } catch (e) {
      setError("Gagal menonaktifkan user.");
    }
  };

  if (!isHRD) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Memuat akses manajemen user...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan · Manajemen User</h1>
        <p className="text-sm text-muted-foreground">
          HRD dapat membuat akun baru, edit akun, dan nonaktifkan akun user.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Role tersedia: HRD (akses penuh) dan Akuntansi (hanya penggajian).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
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
                  setForm((prev) => ({ ...prev, role: value }))
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

            <div className="md:col-span-2 flex items-center gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Buat User"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat data user...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.namaLengkap}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "outline"}>
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </Button>
                      {user.isActive && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivate(user.id)}
                        >
                          Nonaktifkan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
