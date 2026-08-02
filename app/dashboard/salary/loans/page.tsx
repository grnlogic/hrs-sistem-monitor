"use client";

import React, { useState, useEffect } from "react";
import { useCompany } from "@/components/providers/company-provider";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Checkbox } from "@/components/ui/form/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/overlay/dialog";
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
import { piutangAPI, employeeAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Coins,
  Calendar,
  CreditCard,
  Search,
  Building2,
  Sparkles,
  Clock,
  User,
  Info,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

type Karyawan = {
  id: string;
  namaLengkap: string;
  departemen: string;
  statusKaryawan: string;
};

type Piutang = {
  id: string;
  karyawanId: string;
  saldoAwal: number;
  jumlahCicilan: number;
  sisaSaldo: number;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
  karyawan?: Karyawan;
};

type PiutangCicilan = {
  id: string;
  piutangId: string;
  gajiId: string | null;
  tanggal: string;
  jumlahDipotong: number;
  sisaSaldoSetelah: number;
  pakaiUangPribadi: boolean;
  createdAt: string;
  gaji?: {
    periodeAwal: string;
    periodeAkhir: string;
  } | null;
};

export default function LoansPage() {
  const { company } = useCompany();

  const [loans, setLoans] = useState<Piutang[]>([]);
  const [employees, setEmployees] = useState<Karyawan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Piutang | null>(null);
  const [installments, setInstallments] = useState<PiutangCicilan[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  // New Loan Form Dialog State
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newLoanData, setNewLoanData] = useState({
    karyawanId: "",
    saldoAwal: "",
    jumlahCicilan: "",
  });
  const [submittingNew, setSubmittingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Manual Payment State
  const [paymentData, setPaymentData] = useState({
    nominal: "",
    pakaiUangPribadi: false,
    tanggal: new Date().toISOString().split("T")[0],
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // UI state for error / success message
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await piutangAPI.getAll();
      setLoans(res || []);
      // If we had a selected loan, update its data as well
      if (selectedLoan) {
        const updatedSelected = (res || []).find((l: Piutang) => l.id === selectedLoan.id);
        if (updatedSelected) {
          setSelectedLoan(updatedSelected);
        } else {
          setSelectedLoan(null);
          setInstallments([]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal mengambil data piutang");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll();
      // Filter only non-staff active employees
      const filtered = (res || []).filter((emp: Karyawan) => {
        const dept = String(emp.departemen || "").toLowerCase();
        const status = String(emp.statusKaryawan || "").toLowerCase();
        return !dept.includes("staff") && !status.includes("staff");
      });
      setEmployees(filtered);
    } catch (err) {
      console.error("Gagal mengambil data karyawan", err);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
  }, [company]);

  const loadInstallments = async (loanId: string) => {
    try {
      setLoadingInstallments(true);
      const res = await piutangAPI.getCicilanList(loanId);
      setInstallments(res || []);
    } catch (err) {
      console.error("Gagal mengambil data cicilan", err);
    } finally {
      setLoadingInstallments(false);
    }
  };

  const handleSelectLoan = (loan: Piutang) => {
    setSelectedLoan(loan);
    loadInstallments(loan.id);
    // Reset payment form
    setPaymentData({
      nominal: "",
      pakaiUangPribadi: false,
      tanggal: new Date().toISOString().split("T")[0],
    });
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newLoanData.karyawanId || !newLoanData.saldoAwal || !newLoanData.jumlahCicilan) {
      setErrorMsg("Semua field formulir wajib diisi!");
      return;
    }

    try {
      setSubmittingNew(true);
      await piutangAPI.create({
        karyawanId: newLoanData.karyawanId,
        saldoAwal: Number(newLoanData.saldoAwal),
        jumlahCicilan: Number(newLoanData.jumlahCicilan),
      });
      setSuccessMsg("Piutang baru berhasil didaftarkan!");
      setIsNewDialogOpen(false);
      setNewLoanData({ karyawanId: "", saldoAwal: "", jumlahCicilan: "" });
      fetchLoans();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat piutang baru");
    } finally {
      setSubmittingNew(false);
    }
  };

  const handleDeleteLoan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus data piutang ini secara permanen?")) return;

    try {
      await piutangAPI.delete(id);
      setSuccessMsg("Data piutang berhasil dihapus");
      if (selectedLoan?.id === id) {
        setSelectedLoan(null);
        setInstallments([]);
      }
      fetchLoans();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus piutang");
    }
  };

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    setErrorMsg("");
    setSuccessMsg("");

    const nominal = Number(paymentData.nominal);
    if (isNaN(nominal) || nominal <= 0) {
      setErrorMsg("Masukkan nominal pembayaran yang valid!");
      return;
    }

    try {
      setSubmittingPayment(true);
      await piutangAPI.bayarManual(selectedLoan.id, {
        nominal,
        pakaiUangPribadi: paymentData.pakaiUangPribadi,
        tanggal: paymentData.tanggal,
      });

      setSuccessMsg("Pembayaran cicilan berhasil dicatat!");
      // Reload loan list and installment logs
      await fetchLoans();
      await loadInstallments(selectedLoan.id);

      // Reset payment input
      setPaymentData({
        nominal: "",
        pakaiUangPribadi: false,
        tanggal: new Date().toISOString().split("T")[0],
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses pembayaran manual");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Filter employees for new loan selector to only show those without active loans
  const employeesAvailable = employees.filter((emp) => {
    const hasActiveLoan = loans.some((l) => l.karyawanId === emp.id && l.aktif);
    return !hasActiveLoan;
  });

  const filteredEmployeesAvailable = employeesAvailable.filter((emp) =>
    emp.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics calculations
  const activeLoans = loans.filter((l) => l.aktif);
  const resolvedLoans = loans.filter((l) => !l.aktif);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.sisaSaldo, 0);

  return (
    <div className="p-6 space-y-6 bg-zinc-50/50 min-h-[calc(100vh-4rem)]">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-500" />
            Piutang & Pinjaman Karyawan
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Kelola pinjaman karyawan non-staff, catat cicilan otomatis mingguan, dan catat pembayaran manual.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLoans}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => setIsNewDialogOpen(true)}
            className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Daftarkan Pinjaman
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-tr from-yellow-50 to-amber-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Total Piutang Berjalan
                </p>
                <h3 className="text-2xl font-bold text-amber-900">
                  {formatCurrency(totalOutstanding)}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{activeLoans.length} karyawan non-staff aktif</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-tr from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Piutang Aktif
                </p>
                <h3 className="text-2xl font-bold text-indigo-900">
                  {activeLoans.length}
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-700">
              <Info className="h-3.5 w-3.5" />
              <span>Dipotong otomatis tiap Sabtu saat generate gaji</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-tr from-emerald-50 to-green-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Lunas Seluruhnya
                </p>
                <h3 className="text-2xl font-bold text-emerald-900">
                  {resolvedLoans.length}
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700">
              <User className="h-3.5 w-3.5" />
              <span>Daftar riwayat lunas terekam aman</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Loan Table list */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h2 className="font-semibold text-zinc-950 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zinc-500" />
              Daftar Piutang Berjalan
            </h2>
            <span className="text-xs font-medium bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
              {loans.length} Record
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Nama Karyawan</TableHead>
                  <TableHead className="font-semibold text-right">Saldo Awal</TableHead>
                  <TableHead className="font-semibold text-right">Cicilan / Minggu</TableHead>
                  <TableHead className="font-semibold text-right">Sisa Saldo</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900"></div>
                        <span>Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : loans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-400">
                      Tidak ada data piutang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  loans.map((loan) => (
                    <TableRow
                      key={loan.id}
                      onClick={() => handleSelectLoan(loan)}
                      className={`cursor-pointer transition-colors ${
                        selectedLoan?.id === loan.id
                          ? "bg-zinc-50 font-medium"
                          : "hover:bg-zinc-50/40"
                      }`}
                    >
                      <TableCell>
                        <div>
                          <p className="text-zinc-900 font-medium truncate max-w-[150px]">
                            {loan.karyawan?.namaLengkap || "Karyawan"}
                          </p>
                          <p className="text-xs text-zinc-500 font-normal">
                            {loan.karyawan?.departemen || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(loan.saldoAwal)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-600">
                        {formatCurrency(loan.jumlahCicilan)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-zinc-900">
                        {formatCurrency(loan.sisaSaldo)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            loan.aktif
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {loan.aktif ? "Aktif" : "Lunas"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteLoan(loan.id, e)}
                            className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Column: Loan Detail Panel & Manual Payment */}
        <div className="lg:col-span-5 space-y-6">
          {selectedLoan ? (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
              {/* Header Profile */}
              <div className="p-5 border-b border-zinc-100 bg-zinc-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">
                    {selectedLoan.karyawan?.namaLengkap}
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Karyawan Non-Staff • {selectedLoan.karyawan?.departemen}
                  </p>
                </div>
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  {selectedLoan.aktif ? "Aktif" : "Lunas"}
                </span>
              </div>

              <div className="p-5 space-y-6">
                {/* Outstanding Details */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[10px] uppercase font-semibold text-zinc-500">Saldo Awal</p>
                    <p className="text-sm font-bold text-zinc-800 mt-1">
                      {formatCurrency(selectedLoan.saldoAwal)}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[10px] uppercase font-semibold text-zinc-500">Cicilan/Minggu</p>
                    <p className="text-sm font-bold text-zinc-800 mt-1">
                      {formatCurrency(selectedLoan.jumlahCicilan)}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-900/5 rounded-xl border border-zinc-200/50">
                    <p className="text-[10px] uppercase font-semibold text-zinc-600">Sisa Saldo</p>
                    <p className="text-sm font-bold text-zinc-950 mt-1">
                      {formatCurrency(selectedLoan.sisaSaldo)}
                    </p>
                  </div>
                </div>

                {/* Manual Payment Section */}
                {selectedLoan.aktif && (
                  <form onSubmit={handleManualPayment} className="p-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl space-y-3">
                    <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-zinc-600" />
                      Catat Pembayaran Cicilan
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">Nominal (Rp)</label>
                        <Input
                          type="number"
                          placeholder="Rp 0"
                          min={1}
                          required
                          value={paymentData.nominal}
                          onChange={(e) => setPaymentData({ ...paymentData, nominal: e.target.value })}
                          className="h-9 px-3 py-1 text-sm rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">Tanggal</label>
                        <Input
                          type="date"
                          required
                          value={paymentData.tanggal}
                          onChange={(e) => setPaymentData({ ...paymentData, tanggal: e.target.value })}
                          className="h-9 px-3 py-1 text-sm rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="pakaiUangPribadi"
                        checked={paymentData.pakaiUangPribadi}
                        onCheckedChange={(checked) =>
                          setPaymentData({ ...paymentData, pakaiUangPribadi: Boolean(checked) })
                        }
                      />
                      <label
                        htmlFor="pakaiUangPribadi"
                        className="text-xs text-zinc-600 font-medium cursor-pointer"
                      >
                        Pembayaran menggunakan uang pribadi
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingPayment}
                      className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-sm mt-1"
                    >
                      {submittingPayment ? "Mencatat..." : "Catat Pembayaran"}
                    </Button>
                  </form>
                )}

                {/* Installment History Log */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-zinc-950 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    Riwayat Pembayaran Cicilan
                  </h4>

                  <div className="border border-zinc-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow>
                          <TableHead className="text-xs py-2">Tanggal</TableHead>
                          <TableHead className="text-xs py-2">Nominal</TableHead>
                          <TableHead className="text-xs py-2">Metode</TableHead>
                          <TableHead className="text-xs py-2 text-right">Sisa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingInstallments ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-zinc-400 text-xs">
                              Memuat riwayat...
                            </TableCell>
                          </TableRow>
                        ) : installments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-zinc-400 text-xs">
                              Belum ada pembayaran cicilan dicatat.
                            </TableCell>
                          </TableRow>
                        ) : (
                          installments.map((inst) => (
                            <TableRow key={inst.id} className="hover:bg-zinc-50/50">
                              <TableCell className="text-xs py-2">
                                {new Date(inst.tanggal).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-xs font-medium py-2">
                                {formatCurrency(inst.jumlahDipotong)}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-zinc-500">
                                {inst.pakaiUangPribadi ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    Uang Pribadi
                                  </span>
                                ) : (
                                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    Slip Gaji
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-right py-2 font-medium">
                                {formatCurrency(inst.sisaSaldoSetelah)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-2 border-zinc-200 bg-white">
              <CardContent className="py-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-2.5">
                <Coins className="h-10 w-10 text-zinc-300" />
                <div>
                  <p className="font-semibold text-zinc-600 text-sm">Detail Pinjaman & Pembayaran</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Pilih salah satu karyawan di daftar piutang untuk memproses pembayaran manual atau memonitor riwayat cicilan.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Loan Form Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Daftarkan Pinjaman Baru</DialogTitle>
            <DialogDescription>
              Isi data karyawan non-staff untuk mendaftarkan piutang/pinjaman baru.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-zinc-600 block mb-1">
                Karyawan Non-Staff
              </label>
              <div className="relative">
                <Select
                  value={newLoanData.karyawanId}
                  onValueChange={(v) => setNewLoanData({ ...newLoanData, karyawanId: v })}
                >
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Pilih Karyawan Non-Staff" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {/* Inline search filter option */}
                    <div className="p-2 border-b flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <input
                        placeholder="Cari karyawan..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-xs outline-none bg-transparent"
                      />
                    </div>
                    {filteredEmployeesAvailable.length === 0 ? (
                      <div className="p-2 text-center text-xs text-zinc-400">
                        Tidak ada karyawan tersedia
                      </div>
                    ) : (
                      filteredEmployeesAvailable.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.namaLengkap} ({emp.departemen})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1">
                  Saldo Awal (Nominal Pinjaman)
                </label>
                <Input
                  type="number"
                  placeholder="Rp 0"
                  min={1}
                  required
                  value={newLoanData.saldoAwal}
                  onChange={(e) => setNewLoanData({ ...newLoanData, saldoAwal: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 block mb-1">
                  Cicilan / Minggu
                </label>
                <Input
                  type="number"
                  placeholder="Rp 0"
                  min={1}
                  required
                  value={newLoanData.jumlahCicilan}
                  onChange={(e) => setNewLoanData({ ...newLoanData, jumlahCicilan: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewDialogOpen(false)}
                className="rounded-xl text-zinc-500"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submittingNew}
                className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm"
              >
                {submittingNew ? "Mendaftar..." : "Daftarkan Pinjaman"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
