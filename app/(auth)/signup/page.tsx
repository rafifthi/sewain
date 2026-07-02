"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Lock, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/components/context/auth-context";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter");
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
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

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="name">Nama lengkap</label>
              <div className="auth-input-wrap">
                <UserRound aria-hidden="true" />
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                />
              </div>
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
