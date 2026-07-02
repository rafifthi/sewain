"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Lock, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/components/context/auth-context";
import { hasFieldErrors, validateSignupForm } from "@/lib/auth/form-validation";
import type { SignupFieldErrors } from "@/lib/auth/form-validation";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function clearFieldError(field: keyof SignupFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateField(field: keyof SignupFieldErrors) {
    const nextErrors = validateSignupForm({ name, email, password });
    setFieldErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const nextErrors = validateSignupForm({ name, email, password });
    setFieldErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-stage" aria-labelledby="signup-title">
        <aside className="auth-hero" aria-label="Ringkasan Sewain">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              <Building2 />
            </span>
            <span>Sewain</span>
          </div>
          <div className="auth-hero-copy">
            <p className="auth-kicker">Operasional properti</p>
            <h2>Mulai dari daftar unit, lalu biarkan alur sewanya mengikuti.</h2>
            <p>Buat akun untuk menata penyewa, kontrak, invoice, dan pekerjaan lapangan dalam satu tempat.</p>
          </div>
          <div className="auth-snapshot" aria-hidden="true">
            <div>
              <span>Setup awal</span>
              <strong>10m</strong>
            </div>
            <div>
              <span>Modul inti</span>
              <strong>6</strong>
            </div>
            <div>
              <span>Akses tim</span>
              <strong>Siap</strong>
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
            <h1 id="signup-title">Buat akun Sewain</h1>
            <p>Mulai kelola properti Anda hari ini.</p>
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="name">Nama lengkap</label>
              <div className={`auth-input-wrap ${fieldErrors.name ? "invalid" : ""}`}>
                <UserRound aria-hidden="true" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onBlur={() => validateField("name")}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                    clearFieldError("name");
                  }}
                  placeholder="Nama Anda"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
              </div>
              {fieldErrors.name && (
                <p id="name-error" className="auth-field-error">
                  {fieldErrors.name}
                </p>
              )}
            </div>

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
                  autoComplete="new-password"
                  value={password}
                  onBlur={() => validateField("password")}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    clearFieldError("password");
                  }}
                  placeholder="Min. 8 karakter"
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

            <button type="submit" disabled={loading} className="auth-submit">
              <span>{loading ? "Memproses..." : "Daftar"}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </form>

          <p className="auth-switch">
            Sudah punya akun?{" "}
            <Link href="/login" className="auth-link strong">
              Masuk di sini
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
