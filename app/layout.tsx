import type React from "react"
import type { Metadata } from "next"
import { Sora } from "next/font/google"
import "./globals.css"
import { AuthSessionProvider } from "@/components/providers/session-provider"
import { SessionTokenSync } from "@/components/auth/session-token-sync"
import { NAMA_PT } from "@/lib/constants/perusahaan"

const sora = Sora({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "Employee Monitoring System",
  description: `Sistem monitoring karyawan untuk ${NAMA_PT.PJP}`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={sora.className}>
        <AuthSessionProvider>
          <SessionTokenSync />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
