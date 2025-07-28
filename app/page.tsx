import { LoginForm } from "@/components/auth/login-form";
import { Factory, Users, Shield, Zap } from "lucide-react";
import Image from "next/image";
import Logo from "@/app/image/png.png";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
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

      {/* Animated gears decoration */}
      <div className="absolute top-20 left-10 opacity-10">
        <div
          className="w-16 h-16 border-4 border-white rounded-full animate-spin"
          style={{ animationDuration: "8s" }}
        >
          <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1/2 transform -translate-x-1/2"></div>
          <div className="w-2 h-2 bg-white rounded-full absolute bottom-1 left-1/2 transform -translate-x-1/2"></div>
          <div className="w-2 h-2 bg-white rounded-full absolute left-1 top-1/2 transform -translate-y-1/2"></div>
          <div className="w-2 h-2 bg-white rounded-full absolute right-1 top-1/2 transform -translate-y-1/2"></div>
        </div>
      </div>

      <div className="absolute top-32 right-16 opacity-10">
        <div
          className="w-12 h-12 border-4 border-white rounded-full animate-spin"
          style={{ animationDuration: "6s", animationDirection: "reverse" }}
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 left-1/2 transform -translate-x-1/2"></div>
          <div className="w-1.5 h-1.5 bg-white rounded-full absolute bottom-0.5 left-1/2 transform -translate-x-1/2"></div>
          <div className="w-1.5 h-1.5 bg-white rounded-full absolute left-0.5 top-1/2 transform -translate-y-1/2"></div>
          <div className="w-1.5 h-1.5 bg-white rounded-full absolute right-0.5 top-1/2 transform -translate-y-1/2"></div>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Company Header */}
        <div className="text-center mb-8 space-y-4">
          {/* Company Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 overflow-hidden">
                <Image
                  src={Logo}
                  alt="Logo PT. PADUDJAYA PUTERA"
                  width={60}
                  height={60}
                  className="object-contain w-14 h-14"
                  priority
                />
              </div>
              {/* Small gear decoration */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent tracking-tight">
              PT. PADUDJAYA PUTERA
            </h1>
            <div className="flex items-center justify-center space-x-2 text-slate-300">
              <Users className="w-5 h-5" />
              <p className="text-lg font-medium">Employee Monitoring System</p>
              <Shield className="w-5 h-5" />
            </div>
          </div>

          {/* Subtitle with industrial elements */}
          <div className="flex items-center justify-center space-x-4 text-slate-400 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Production Ready</span>
            </div>
            <div className="w-1 h-4 bg-slate-600"></div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Secure Access</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Footer Information */}
        <div className="mt-8 text-center text-slate-400 text-xs space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Factory className="w-4 h-4" />
            <span>Industrial Management Solutions</span>
          </div>
          <div className="flex items-center justify-center space-x-4 text-slate-500">
            <span>v1.0.0</span>
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
            <span>Build 2025.01</span>
          </div>
        </div>
      </div>

      {/* Additional decorative elements */}
      <div className="absolute bottom-10 right-10 opacity-20">
        <Factory className="w-16 h-16 text-white transform rotate-12" />
      </div>
      <div className="absolute top-10 right-10 opacity-20 animate-pulse">
        <Zap className="w-8 h-8 text-blue-400" />
      </div>
      <div className="absolute bottom-20 left-10 opacity-20">
        <Users className="w-10 h-10 text-white transform -rotate-12" />
      </div>
    </div>
  );
}
