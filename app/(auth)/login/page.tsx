"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/components/context/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
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

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <div className="auth-input-wrap">
                <Mail aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Kata sandi</label>
              <div className="auth-input-wrap">
                <Lock aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                />
              </div>
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
