"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/form/button"
import { Label } from "@/components/ui/form/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/display/table"
import { Checkbox } from "@/components/ui/form/checkbox"
import { ArrowLeft, Calculator, DollarSign } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"

// Mock employees data with salary info
const employees = [
  {
    nip: "EMP001",
    name: "John Doe",
    basicSalary: 8500000,
    allowances: 1000000,
    attendanceDays: 22,
    workDays: 22,
    overtimeHours: 5,
  },
  {
    nip: "EMP002",
    name: "Sarah Wilson",
    basicSalary: 7500000,
    allowances: 800000,
    attendanceDays: 21,
    workDays: 22,
    overtimeHours: 2,
  },
  {
    nip: "EMP003",
    name: "Mike Johnson",
    basicSalary: 6500000,
    allowances: 600000,
    attendanceDays: 20,
    workDays: 22,
    overtimeHours: 0,
  },
]

export default function ProcessSalaryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [salaryData, setSalaryData] = useState(employees)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateSalary = (employee: any) => {
    const attendanceRatio = employee.attendanceDays / employee.workDays
    const adjustedBasicSalary = employee.basicSalary * attendanceRatio
    const overtimePay = employee.overtimeHours * 50000 // 50k per hour
    const grossSalary = adjustedBasicSalary + employee.allowances + overtimePay
    const tax = grossSalary * 0.05 // 5% tax
    const netSalary = grossSalary - tax

    return {
      adjustedBasicSalary,
      overtimePay,
      grossSalary,
      tax,
      netSalary,
    }
  }

  const handleEmployeeSelect = (nip: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, nip])
    } else {
      setSelectedEmployees(selectedEmployees.filter((emp) => emp !== nip))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employees.map((emp) => emp.nip))
    } else {
      setSelectedEmployees([])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (selectedEmployees.length === 0) {
      setError("Pilih minimal satu karyawan untuk diproses gajinya.")
      setIsLoading(false)
      return
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const processedSalaries = selectedEmployees.map((nip) => {
        const employee = employees.find((emp) => emp.nip === nip)
        const calculations = calculateSalary(employee)
        return {
          ...employee,
          ...calculations,
          period: selectedPeriod,
          processedAt: new Date().toISOString(),
        }
      })

      console.log("Processed salaries:", processedSalaries)

      setSuccess(`Gaji berhasil diproses untuk ${selectedEmployees.length} karyawan!`)
      setTimeout(() => {
        router.push("/dashboard/salary")
      }, 2000)
    } catch (err) {
      setError("Gagal memproses gaji. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proses Gaji</h1>
          <p className="text-muted-foreground">Hitung dan proses gaji karyawan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Period Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Periode Gaji
            </CardTitle>
            <CardDescription>Pilih periode untuk pemrosesan gaji</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Periode *</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-01">Januari 2024</SelectItem>
                    <SelectItem value="2023-12">Desember 2023</SelectItem>
                    <SelectItem value="2023-11">November 2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Karyawan</CardTitle>
            <CardDescription>Pilih karyawan yang akan diproses gajinya</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmployees.length === employees.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Tunjangan</TableHead>
                    <TableHead>Kehadiran</TableHead>
                    <TableHead>Lembur</TableHead>
                    <TableHead>Gaji Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const calculations = calculateSalary(employee)
                    return (
                      <TableRow key={employee.nip}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEmployees.includes(employee.nip)}
                            onCheckedChange={(checked) => handleEmployeeSelect(employee.nip, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.nip}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(employee.basicSalary)}</TableCell>
                        <TableCell>{formatCurrency(employee.allowances)}</TableCell>
                        <TableCell>
                          {employee.attendanceDays}/{employee.workDays} hari
                        </TableCell>
                        <TableCell>{employee.overtimeHours} jam</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(calculations.netSalary)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedEmployees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ringkasan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedEmployees.length}</div>
                  <div className="text-sm text-muted-foreground">Karyawan Dipilih</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      selectedEmployees.reduce((total, nip) => {
                        const employee = employees.find((emp) => emp.nip === nip)
                        return total + calculateSalary(employee!).netSalary
                      }, 0),
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Gaji Bersih</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedPeriod || "-"}</div>
                  <div className="text-sm text-muted-foreground">Periode</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading || selectedEmployees.length === 0}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Memproses...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Proses Gaji ({selectedEmployees.length})
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
