"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/display/card";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
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
    } catch {
      setError("Username atau password salah. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="relative w-full overflow-hidden rounded-xl border border-zinc-200/90 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_34px_-10px_rgba(24,24,27,0.1)]">
      <div
        aria-hidden="true"
        className="h-1 w-full bg-gradient-to-r from-zinc-900 via-teal-700 to-amber-600"
      />
      <CardHeader className="space-y-4 px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 p-1.5">
            <Image
              src={Logo}
              alt={`Logo ${NAMA_PT.PJP}`}
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {NAMA_PT.PJP}
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Sistem Manajemen HRD
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Masukkan kredensial akun Anda untuk melanjutkan.
        </p>
      </CardHeader>

      <CardContent className="px-6 pb-7 pt-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert" aria-live="polite" className="text-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-medium text-foreground">
              Username
            </Label>
            <div className="relative">
              <User
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Masukkan username"
                className="h-11 pl-10 text-base sm:text-sm"
                required
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                aria-invalid={Boolean(error)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                className="h-11 pl-10 pr-11 text-base sm:text-sm"
                required
                autoComplete="current-password"
                enterKeyHint="done"
                aria-invalid={Boolean(error)}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="mt-2 h-11 w-full gap-2 font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Masuk
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
