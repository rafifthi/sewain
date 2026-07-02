"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/components/context/auth-context";
import { hasFieldErrors, validateLoginForm } from "@/lib/auth/form-validation";
import type { LoginFieldErrors } from "@/lib/auth/form-validation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function clearFieldError(field: keyof LoginFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateField(field: keyof LoginFieldErrors) {
    const nextErrors = validateLoginForm({ email, password });
    setFieldErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const nextErrors = validateLoginForm({ email, password });
    setFieldErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-stage" aria-labelledby="login-title">
        <aside className="auth-hero" aria-label="Ringkasan Sewain">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              <Building2 />
            </span>
            <span>Sewain</span>
          </div>
          <div className="auth-hero-copy">
            <p className="auth-kicker">Operasional properti</p>
            <h2>Semua data sewa tetap rapi saat hari sedang penuh.</h2>
            <p>Masuk untuk memantau unit, penyewa, kontrak, tagihan, dan pekerjaan harian dari satu ruang kerja.</p>
          </div>
          <div className="auth-snapshot" aria-hidden="true">
            <div>
              <span>Okupansi</span>
              <strong>94%</strong>
            </div>
            <div>
              <span>Tagihan bulan ini</span>
              <strong>128</strong>
            </div>
            <div>
              <span>Tiket aktif</span>
              <strong>12</strong>
            </div>
          </div>
        </aside>

        <div className="auth-card">
          <div className="auth-card-head">
            <div className="auth-mobile-brand">
              <span className="auth-brand-mark" aria-hidden="true">
                <Building2 />
              </span>
              <span>Sewain</span>
            </div>
            <h1 id="login-title">Masuk ke Sewain</h1>
            <p>Kelola properti Anda dengan mudah.</p>
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <div className={`auth-input-wrap ${fieldErrors.email ? "invalid" : ""}`}>
                <Mail aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onBlur={() => validateField("email")}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                    clearFieldError("email");
                  }}
                  placeholder="email@contoh.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="auth-field-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password">Kata sandi</label>
              <div className={`auth-input-wrap ${fieldErrors.password ? "invalid" : ""}`}>
                <Lock aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onBlur={() => validateField("password")}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    clearFieldError("password");
                  }}
                  placeholder="Masukkan kata sandi"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="auth-field-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="auth-form-row">
              <Link href="/forgot-password" className="auth-link">
                Lupa kata sandi?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
              <span>{loading ? "Memproses..." : "Masuk"}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </form>

          <p className="auth-switch">
            Belum punya akun?{" "}
            <Link href="/signup" className="auth-link strong">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
