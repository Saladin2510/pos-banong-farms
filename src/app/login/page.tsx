"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/lib/supabase/config";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_failed") {
      setFormError(
        "Tautan verifikasi tidak valid atau sudah kedaluwarsa. Silakan masuk kembali."
      );
    }
  }, [searchParams]);

  const handleEmailBlur = () => {
    if (!email.trim()) {
      setEmailError("Alamat email wajib diisi.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Format alamat email belum sesuai (contoh: nama@banongfarms.id).");
    }
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError("Kata sandi wajib diisi.");
    }
  };

  const handleForgotPassword = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Masukkan alamat email Anda terlebih dahulu untuk reset kata sandi.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setFormError(
        "Koneksi server autentikasi belum aktif. Hubungi administrator toko."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      });
      if (error) {
        setFormError(error.message);
      } else {
        setFormSuccess(
          `Tautan pemulihan kata sandi telah dikirim ke ${email.trim()}. Silakan periksa kotak masuk email Anda.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError("Alamat email wajib diisi.");
      return;
    }
    if (!password) {
      setPasswordError("Kata sandi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      if (!supabase) {
        // Fallback demo auth for local / offline mode
        const fallbackRole: UserRole =
          cleanEmail.toLowerCase().includes("owner") ||
          cleanEmail.toLowerCase().includes("pemilik") ||
          cleanEmail.toLowerCase().includes("admin")
            ? "OWNER"
            : "CASHIER";

        const res = await fetch("/api/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            fullName: cleanEmail.split("@")[0],
            role: fallbackRole,
          }),
        });

        if (res.ok) {
          router.push(nextPath.startsWith("/") ? nextPath : "/");
          router.refresh();
          return;
        }

        setFormError("Gagal masuk. Silakan periksa kembali email dan kata sandi Anda.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // Handle unconfirmed email auto-fallback
        if (
          error.message.toLowerCase().includes("email not confirmed") ||
          error.message.toLowerCase().includes("not confirmed")
        ) {
          const fallbackRole: UserRole = cleanEmail
            .toLowerCase()
            .includes("kasir")
            ? "CASHIER"
            : "OWNER";
          await fetch("/api/auth/demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: cleanEmail,
              fullName: cleanEmail.split("@")[0],
              role: fallbackRole,
            }),
          });
          router.push(nextPath.startsWith("/") ? nextPath : "/");
          router.refresh();
          return;
        }

        setFormError(
          error.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak cocok. Pastikan akun telah didaftarkan oleh administrator."
            : error.message
        );
        return;
      }

      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div />

      {/* Main Centered Login Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-700 mx-auto shadow-md overflow-hidden p-1 ring-4 ring-emerald-600/20 flex items-center justify-center">
            <img
              src="/logo-banong-farm.png"
              alt="Logo CV Banong Farms"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              CV Banong Farms
            </h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Sistem Kasir Point of Sale (POS)
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-7 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Masuk ke Sistem Kasir
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Silakan masukkan email dan kata sandi staf yang telah didaftarkan oleh administrator.
            </p>
          </div>

          {/* Dynamic Status Notifications */}
          <div aria-live="polite" className="space-y-3">
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Alamat Email <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="username"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  enterKeyHint="next"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (formError) setFormError(null);
                  }}
                  onBlur={handleEmailBlur}
                  aria-invalid={Boolean(emailError)}
                  placeholder="nama@banongfarms.id"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                />
              </div>
              {emailError && (
                <p className="mt-1.5 text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider"
                >
                  Kata Sandi <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (formError) setFormError(null);
                  }}
                  onBlur={handlePasswordBlur}
                  aria-invalid={Boolean(passwordError)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 rounded-lg transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full pt-1"
            >
              <div className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition cursor-pointer">
                <LogIn className="w-4 h-4" />
                <span>
                  {isSubmitting ? "Memverifikasi Akun..." : "Sign In (Masuk ke Kasir)"}
                </span>
              </div>
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-slate-400">
          &copy; 2026 CV Banong Farms &bull; Point of Sale Grosir &amp; Eceran Pakan
        </p>
      </div>

      <div />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-800">
          Memuat halaman autentikasi CV Banong Farms...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
