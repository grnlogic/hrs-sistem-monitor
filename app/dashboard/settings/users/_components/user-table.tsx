"use client";

import { SystemUser } from "@/lib/api";
import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { Badge } from "@/components/ui/display/badge";

type UserTableProps = {
  users: SystemUser[];
  loading: boolean;
  onEdit: (user: SystemUser) => void;
  onDeactivate: (id: string) => void;
};

export function UserTable({ users, loading, onEdit, onDeactivate }: UserTableProps) {
  return (
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
                <TableHead>Lokasi</TableHead>
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
                  <TableCell>{user.lokasi || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "outline"}>
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(user)}
                    >
                      Edit
                    </Button>
                    {user.isActive && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeactivate(user.id)}
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
  );
}
