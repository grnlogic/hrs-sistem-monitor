"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/display/card";
import { Badge } from "@/components/ui/display/badge";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/display/table";
import { Pencil, Trash2 } from "lucide-react";
import { EditPiutangDialog, DeletePiutangDialog } from "@/components/piutang";

type LoanItem = {
  id: string;
  saldoAwal: number | string;
  jumlahCicilan: number | string;
  sisaSaldo: number | string;
  aktif: boolean;
  createdAt: string;
  cicilan?: Array<{
    id: string;
    tanggal?: string;
    createdAt?: string;
    jumlahDipotong: number | string;
    pakaiUangPribadi: boolean;
    sisaSaldoSetelah: number | string;
  }>;
};

type LoansTabProps = {
  loans: LoanItem[];
  onRefresh: () => void;
};

export function LoansTab({ loans, onRefresh }: LoansTabProps) {
  // State for Edit Dialog
  const [editingLoan, setEditingLoan] = useState<LoanItem | null>(null);

  // State for Delete Dialog
  const [deletingLoan, setDeletingLoan] = useState<LoanItem | null>(null);

  return (
    <Card className="rounded-2xl border-zinc-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-zinc-800 font-bold">
          Riwayat Piutang &amp; Cicilan
        </CardTitle>
        <CardDescription>
          Daftar riwayat pinjaman serta log pemotongan gaji / pembayaran pribadi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loans.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-50/50 rounded-2xl border border-dashed">
            Karyawan ini tidak memiliki riwayat piutang.
          </div>
        ) : (
          <div className="space-y-8">
            {loans.map((loan, idx) => {
              const isAktif = loan.aktif;
              const cicilanCount = loan.cicilan?.length || 0;

              return (
                <div
                  key={`loan-${loan.id}`}
                  className="p-5 rounded-2xl border border-zinc-150 bg-white shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800">
                        Pinjaman #{loans.length - idx}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Dibuat pada:{" "}
                        {new Date(loan.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAktif ? (
                        <Badge className="bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-50 border">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-50 border">
                          Lunas / Non-Aktif
                        </Badge>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLoan(loan)}
                        className="h-8 rounded-lg border-zinc-200 gap-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        title="Edit Piutang"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingLoan(loan)}
                        className="h-8 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1 text-xs"
                        title="Hapus Piutang"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-zinc-50/50 p-3.5 rounded-xl border border-zinc-100">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Saldo Awal
                      </p>
                      <p className="font-bold text-zinc-800">
                        Rp {Number(loan.saldoAwal).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Cicilan per Minggu
                      </p>
                      <p className="font-bold text-zinc-800">
                        Rp {Number(loan.jumlahCicilan).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Sisa Saldo
                      </p>
                      <p className="font-bold text-rose-600">
                        Rp {Number(loan.sisaSaldo).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Installments Table */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-700">
                      Log Riwayat Cicilan
                    </p>
                    <div className="border border-zinc-100 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-zinc-50/70">
                          <TableRow>
                            <TableHead className="text-xs py-2">Tanggal</TableHead>
                            <TableHead className="text-xs py-2 text-right">
                              Jumlah Potong/Bayar
                            </TableHead>
                            <TableHead className="text-xs py-2 text-center">
                              Metode Pembayaran
                            </TableHead>
                            <TableHead className="text-xs py-2 text-right">
                              Sisa Saldo Setelahnya
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!loan.cicilan || loan.cicilan.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-4 text-zinc-400 text-xs"
                              >
                                Belum ada pembayaran cicilan dicatat.
                              </TableCell>
                            </TableRow>
                          ) : (
                            loan.cicilan.map((c: any) => (
                              <TableRow
                                key={`cicilan-${c.id}`}
                                className="hover:bg-zinc-50/30"
                              >
                                <TableCell className="text-xs py-2">
                                  {new Date(c.tanggal || c.createdAt).toLocaleDateString(
                                    "id-ID",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )}
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-zinc-850 text-right py-2">
                                  Rp {Number(c.jumlahDipotong).toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-xs text-center py-2">
                                  {c.pakaiUangPribadi ? (
                                    <Badge className="bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                      Uang Pribadi
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                      Slip Gaji
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-zinc-850 text-right py-2">
                                  Rp {Number(c.sisaSaldoSetelah).toLocaleString("id-ID")}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog Edit Piutang */}
      <EditPiutangDialog
        open={Boolean(editingLoan)}
        onOpenChange={(open) => !open && setEditingLoan(null)}
        piutang={editingLoan}
        onSuccess={() => {
          setEditingLoan(null);
          onRefresh();
        }}
      />

      {/* Dialog Konfirmasi Hapus Piutang */}
      <DeletePiutangDialog
        open={Boolean(deletingLoan)}
        onOpenChange={(open) => !open && setDeletingLoan(null)}
        piutang={deletingLoan}
        onSuccess={() => {
          setDeletingLoan(null);
          onRefresh();
        }}
      />
    </Card>
  );
}
