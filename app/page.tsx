import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Background Wallpaper */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/1405995.png"
          alt="Background Wallpaper"
          fill
          priority
          unoptimized
          className="object-cover object-center select-none pointer-events-none"
        />
        {/* Soft elegant overlay to ensure text contrast and add depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/50 via-slate-900/20 to-teal-950/45 backdrop-blur-[2px]" />
      </div>

      <div className="w-full max-w-sm z-10">
        <LoginForm />
      </div>
    </div>
  );
}
