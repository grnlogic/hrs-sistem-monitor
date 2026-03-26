import { LoginForm } from "@/components/auth/login-form";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <LoginForm />
    </div>
  );
}
