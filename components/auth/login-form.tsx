"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/display/card";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Eye, EyeOff, LogIn, User, Lock } from "lucide-react";
import Image from "next/image";
import Logo from "@/app/image/png.png";
import { normalizeRole } from "@/lib/auth/roles";
import { NAMA_PT } from "@/lib/constants/perusahaan";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const credentials = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };

    try {
      const result = await signIn("credentials", {
        username: credentials.username,
        password: credentials.password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error("invalid_credentials");
      }

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = normalizeRole(sessionData?.user?.role);
      const redirectPath = role === "AKUNTANSI" ? "/dashboard/salary/staff" : "/dashboard";
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError("Username atau password salah. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className="relative w-full max-w-sm overflow-hidden rounded-[28px]
      border border-white/15 bg-white/10 backdrop-blur-2xl
      shadow-[0_8px_40px_-8px_rgba(7,16,25,0.7)]
      transition-all duration-300 hover:border-white/25
      before:pointer-events-none before:absolute before:inset-0
      before:bg-gradient-to-br before:from-white/25 before:via-white/5 before:to-transparent
      before:opacity-70"
    >
      <CardHeader className="relative space-y-4 pb-2 pt-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/10 p-2.5 shadow-inner ring-1 ring-[#e8c589]/30 backdrop-blur-sm">
          <Image
            src={Logo}
            alt={`Logo ${NAMA_PT.PJP}`}
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9fd4e0]">
            {NAMA_PT.PJP}
          </p>
          <h1 className="font-serif text-xl font-semibold tracking-tight text-[#f4f9fa]">
            Sistem Manajemen Pabrik
          </h1>
          <p className="text-xs font-medium text-[#f4f9fa]/60">
            Masukkan kredensial untuk masuk
          </p>
        </div>

        {/* Garis horizon — elemen ciri khas, menggemakan garis laut di foto */}
        <div className="mx-10 h-px bg-gradient-to-r from-transparent via-[#e8c589]/70 to-transparent" />
      </CardHeader>

      <CardContent className="relative pb-8 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert
              variant="destructive"
              className="rounded-lg border-red-400/30 bg-red-500/15 text-sm text-red-100 backdrop-blur-sm"
            >
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-[#f4f9fa]/80">
              Username
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7cc4d4]" />
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Masukkan username"
                className="rounded-lg border-white/20 bg-white/10 pl-10 text-[#f4f9fa]
                placeholder:text-[#f4f9fa]/40 backdrop-blur-sm transition-all duration-200
                focus-visible:border-[#e8c589] focus-visible:bg-white/15 focus-visible:ring-[#e8c589]/30"
                required
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-[#f4f9fa]/80">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7cc4d4]" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="rounded-lg border-white/20 bg-white/10 pl-10 pr-10 text-[#f4f9fa]
                placeholder:text-[#f4f9fa]/40 backdrop-blur-sm transition-all duration-200
                focus-visible:border-[#e8c589] focus-visible:bg-white/15 focus-visible:ring-[#e8c589]/30"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-[#f4f9fa]/50 hover:bg-transparent hover:text-[#e8c589]"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="group relative mt-6 flex w-full items-center justify-center gap-2
            overflow-hidden rounded-lg border-0 bg-gradient-to-r from-[#e8c589] via-[#f3dba8] to-[#e8c589]
            bg-[length:200%_100%] bg-left py-2.5 font-semibold text-[#0f2a3f]
            shadow-[0_4px_20px_-4px_rgba(232,197,137,0.5)] transition-all duration-500
            hover:bg-right hover:shadow-[0_6px_24px_-4px_rgba(232,197,137,0.65)]
            active:scale-[0.98] motion-safe:hover:scale-[1.01]
            focus-visible:ring-2 focus-visible:ring-[#e8c589]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2a3f]"
            disabled={isLoading}
          >
            {/* Sapuan kilau — bagian "glossy" saat hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0f2a3f] border-t-transparent" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Masuk
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}