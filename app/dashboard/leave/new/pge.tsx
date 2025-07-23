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
import { ArrowLeft, Save, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"

// Mock employees data
const employees = [
  { nip: "EMP001", name: "John Doe", position: "Software Engineer" },
  { nip: "EMP002", name: "Sarah Wilson", position: "HR Manager" },
  { nip: "EMP003", name: "Mike Johnson", position: "Marketing Specialist" },
  { nip: "EMP004", name: "Lisa Chen", position: "Accountant" },
  { nip: "EMP005", name: "David Brown", position: "Operations Manager" },
]

export default function NewLeavePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [leaveDays, setLeaveDays] = useState(0)

  const calculateLeaveDays = (start: string, end: string) => {
    if (start && end) {
      const startDate = new Date(start)
      const endDate = new Date(end)
      const timeDiff = endDate.getTime() - startDate.getTime()
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
      setLeaveDays(dayDiff > 0 ? dayDiff : 0)
    } else {
      setLeaveDays(0)
    }
  }

  const handleStartDateChange = (date: string) => {
    setStartDate(date)
    calculateLeaveDays(date, endDate)
  }

  const handleEndDateChange = (date: string) => {
    setEndDate(date)
    calculateLeaveDays(startDate, date)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const leaveData = {
      employeeNip: formData.get("employeeNip") as string,
      leaveType: formData.get("leaveType") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      days: leaveDays,
      reason: formData.get("reason") as string,
      emergencyContact: formData.get("emergencyContact") as string,
      handoverTo: formData.get("handoverTo") as string,
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("New leave data:", leaveData)

      setSuccess("Pengajuan cuti berhasil disubmit!")
      setTimeout(() => {
        router.push("/dashboard/leave")
      }, 2000)
    } catch (err) {
      setError("Gagal mengajukan cuti. Silakan coba lagi.")
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
          <h1 className="text-3xl font-bold tracking-tight">Ajukan Cuti</h1>
          <p className="text-muted-foreground">Buat pengajuan cuti baru</p>
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
              <Calendar className="h-5 w-5" />
              Informasi Cuti
            </CardTitle>
            <CardDescription>Masukkan detail pengajuan cuti</CardDescription>
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
                        {employee.nip} - {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaveType">Jenis Cuti *</Label>
                <Select name="leaveType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis cuti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cuti Tahunan">Cuti Tahunan</SelectItem>
                    <SelectItem value="Cuti Sakit">Cuti Sakit</SelectItem>
                    <SelectItem value="Cuti Melahirkan">Cuti Melahirkan</SelectItem>
                    <SelectItem value="Cuti Khusus">Cuti Khusus</SelectItem>
                    <SelectItem value="Cuti Bersama">Cuti Bersama</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Selesai *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Durasi Cuti</Label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <span className="text-sm font-medium">{leaveDays} hari</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Kontak Darurat</Label>
                <Input id="emergencyContact" name="emergencyContact" placeholder="Nomor telepon yang bisa dihubungi" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan Cuti *</Label>
              <Textarea id="reason" name="reason" placeholder="Jelaskan alasan pengajuan cuti" rows={3} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handoverTo">Serah Terima Pekerjaan</Label>
              <Select name="handoverTo">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan pengganti (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.nip} value={employee.nip}>
                      {employee.name} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leave Policy Info */}
        <Card>
          <CardHeader>
            <CardTitle>Ketentuan Cuti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Jenis Cuti:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Cuti Tahunan: 12 hari per tahun</li>
                  <li>• Cuti Sakit: Dengan surat dokter</li>
                  <li>• Cuti Melahirkan: 3 bulan</li>
                  <li>• Cuti Khusus: Pernikahan, kematian keluarga</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Prosedur:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Ajukan minimal 3 hari sebelumnya</li>
                  <li>• Lampirkan dokumen pendukung jika diperlukan</li>
                  <li>• Pastikan pekerjaan sudah diserahterimakan</li>
                  <li>• Menunggu persetujuan atasan</li>
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
          <Button type="submit" disabled={isLoading || leaveDays === 0}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Mengajukan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Ajukan Cuti
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
