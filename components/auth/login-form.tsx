"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { Eye, EyeOff, LogIn, User, Lock, Factory, Zap } from "lucide-react";
import { authAPI } from "@/lib/api";
import Image from "next/image";
import Logo from "@/app/image/png.png";

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
      const response = await authAPI.login(credentials);

      // Store token in localStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Username atau password salah. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-4 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Industrial background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='53' cy='7' r='1'/%3E%3Ccircle cx='7' cy='53' r='1'/%3E%3Ccircle cx='53' cy='53' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Factory silhouette decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900/50 to-transparent">
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-slate-800/30 opacity-60"
          style={{
            clipPath:
              "polygon(0% 100%, 15% 80%, 25% 100%, 35% 60%, 45% 100%, 60% 40%, 70% 100%, 85% 70%, 100% 100%)",
          }}
        />
      </div>

      <Card className="w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-sm border-slate-200 relative z-10">
        <CardHeader className="space-y-4 text-center pb-6">
          {/* Logo placeholder */}
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
              <Image
                src={Logo}
                alt="Logo PT. PADUDJAYA PUTERA"
                width={48}
                height={48}
                className="object-contain w-12 h-12"
                priority
              />
            </div>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-blue-600" />
              Sistem Manajemen Pabrik
            </CardTitle>
            <CardDescription className="text-slate-600">
              Masukkan kredensial untuk mengakses dashboard kontrol
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Masukkan username"
                  className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white/80"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className="pl-10 pr-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white/80"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Masuk ke Sistem
                </>
              )}
            </Button>
          </form>

          {/* Additional industrial styling elements */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-center text-xs text-slate-500 space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sistem Online</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 opacity-20">
        <Factory className="w-12 h-12 text-white transform rotate-12" />
      </div>
      <div className="absolute bottom-4 left-4 opacity-20">
        <Zap className="w-8 h-8 text-white transform -rotate-12" />
      </div>
    </div>
  );
}
