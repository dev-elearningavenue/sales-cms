// src/app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { Sora } from "next/font/google";
import {
  Eye,
  EyeOff,
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Bot,
  FileText,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";

const sora = Sora({ subsets: ["latin"], display: "swap" });

const features = [
  {
    icon: LayoutDashboard,
    title: "Unified Dashboard",
    desc: "Live KPIs, lead counts and team activity at a glance.",
  },
  {
    icon: Users,
    title: "Inbound & My Leads",
    desc: "Capture, assign and track every lead to resolution.",
  },
  {
    icon: Building2,
    title: "Outbound & Company Leads",
    desc: "Run outreach campaigns and manage company pipelines.",
  },
  {
    icon: Briefcase,
    title: "Manager Leads",
    desc: "Bulk import via Excel, panel sync and manager workflows.",
  },
  {
    icon: Bot,
    title: "AI Chat Assistant",
    desc: "Get answers and draft replies powered by AI.",
  },
  {
    icon: FileText,
    title: "Invoicing",
    desc: "Generate invoices, track status and email with CC.",
  },
];

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { setSession, fetchSession } = useApp();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      const data = await response.json();
      setSession(data);
      await fetchSession();
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during login"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isSubmitting;

  return (
    <div className={`${sora.className} min-h-screen w-full bg-slate-50 lg:grid lg:grid-cols-2`}>
      {/* Left – Brand & system overview */}
      <aside className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/30 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 text-lg font-bold shadow-lg">
              FHS
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Leads Management
            </span>
          </div>

          <div className="mt-14 max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Your sales pipeline,{" "}
              <span className="bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">
                end to end.
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              One workspace to capture leads, run outreach, manage invoices and
              keep every team aligned.
            </p>
          </div>
        </div>

        <ul className="relative z-10 mt-12 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <Icon className="h-5 w-5 text-teal-300" />
              <p className="mt-2.5 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {desc}
              </p>
            </li>
          ))}
        </ul>

        <p className="relative z-10 mt-12 text-xs text-slate-500">
          © {new Date().getFullYear()} FHS Technologies · Secure access
        </p>
      </aside>

      {/* Right – Login form */}
      <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 text-lg font-bold text-white shadow-lg">
              FHS
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Leads Management
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to continue to your workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                required
                autoComplete="email"
                disabled={isFormDisabled}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  required
                  autoComplete="current-password"
                  disabled={isFormDisabled}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  disabled={isFormDisabled}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isFormDisabled}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-teal-600 hover:to-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-teal-500" />
            <span>Protected by FHS secure authentication</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
