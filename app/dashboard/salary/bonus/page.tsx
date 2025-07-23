"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/form/button"
import { Input } from "@/components/ui/form/input"
import { Label } from "@/components/ui/form/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form/select"
import { Textarea } from "@/components/ui/form/textarea"
import { ArrowLeft, Save, Gift } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"

// Mock employees data
const employees = [
  { nip: "EMP001", name: "John Doe", position: "Software Engineer" },
  { nip: "EMP002", name: "Sarah Wilson", position: "HR Manager" },
  { nip: "EMP003", name: "Mike Johnson", position: "Marketing Specialist" },
  { nip: "EMP004", name: "Lisa Chen", position: "Accountant" },
  { nip: "EMP005", name: "David Brown", position: "Operations Manager" },
]

export default function BonusPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [bonusType, setBonusType] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const bonusData = {
      employeeNip: formData.get("employeeNip") as string,
      bonusType: formData.get("bonusType") as string,
      amount: formData.get("amount") as string,
      period: formData.get("period") as string,
      reason: formData.get("reason") as string,
      effectiveDate: formData.get("effectiveDate") as string,
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("New bonus data:", bonusData)

      setSuccess("Bonus berhasil ditambahkan!")
      setTimeout(() => {
        router.push("/dashboard/salary")
      }, 2000)
    } catch (err) {
      setError("Gagal menambahkan bonus. Silakan coba lagi.")
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
          <h1 className="text-3xl font-bold tracking-tight">Input Bonus</h1>
          <p className="text-muted-foreground">Tambahkan bonus untuk karyawan</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Data Bonus
            </CardTitle>
            <CardDescription>Masukkan informasi bonus karyawan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNip">Karyawan *</Label>
                <Select name="employeeNip" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.nip} value={employee.nip}>
                        {employee.nip} - {employee.name} ({employee.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonusType">Jenis Bonus *</Label>
                <Select name="bonusType" value={bonusType} onValueChange={setBonusType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis bonus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Bonus Kinerja</SelectItem>
                    <SelectItem value="project">Bonus Proyek</SelectItem>
                    <SelectItem value="annual">Bonus Tahunan</SelectItem>
                    <SelectItem value="holiday">Bonus Hari Raya</SelectItem>
                    <SelectItem value="achievement">Bonus Pencapaian</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Bonus *</Label>
                <Input id="amount" name="amount" type="number" placeholder="1000000" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Periode *</Label>
                <Select name="period" required>
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
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Tanggal Efektif *</Label>
                <Input
                  id="effectiveDate"
                  name="effectiveDate"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan/Keterangan *</Label>
              <Textarea id="reason" name="reason" placeholder="Masukkan alasan pemberian bonus" rows={3} required />
            </div>
          </CardContent>
        </Card>

        {/* Bonus Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Panduan Bonus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Jenis Bonus:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Bonus Kinerja: Berdasarkan evaluasi kinerja</li>
                  <li>• Bonus Proyek: Untuk penyelesaian proyek khusus</li>
                  <li>• Bonus Tahunan: Bonus akhir tahun</li>
                  <li>• Bonus Hari Raya: THR dan bonus keagamaan</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Ketentuan:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Bonus akan dikenakan pajak sesuai ketentuan</li>
                  <li>• Bonus akan dibayarkan bersama gaji periode terkait</li>
                  <li>• Pastikan alasan bonus jelas dan terukur</li>
                  <li>• Bonus memerlukan persetujuan atasan langsung</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Bonus
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
