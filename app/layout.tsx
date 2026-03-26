import type React from "react"
import type { Metadata } from "next"
import { Sora } from "next/font/google"
import "./globals.css"

const sora = Sora({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "Employee Monitoring System",
  description: "Sistem monitoring karyawan untuk PT. PADUD",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={sora.className}>{children}</body>
    </html>
  )
}
