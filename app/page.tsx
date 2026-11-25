import { LoginForm } from "@/components/auth/login-form";
import { NAMA_PT } from "@/lib/constants/perusahaan";

export default function HomePage() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-10">
      {/* Subtle CSS dot-grid & soft ambient radial accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 20% 20%, rgba(15, 118, 110, 0.08), transparent 45%)",
            "radial-gradient(circle at 82% 78%, rgba(217, 119, 6, 0.07), transparent 45%)",
            "radial-gradient(circle, rgba(24, 24, 27, 0.11) 1px, transparent 1.5px)",
          ].join(", "),
          backgroundSize: "100% 100%, 100% 100%, 24px 24px",
        }}
      />

      {/* Minimal geometric hairline ring accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200/70"
      />

      <div className="relative z-10 w-full max-w-[390px]">
        <LoginForm />
      </div>

      <p className="relative z-10 mt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {NAMA_PT.PJP}
      </p>
    </main>
  );
}
