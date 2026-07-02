"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Building2, CheckCircle2, LoaderCircle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token verifikasi tidak ditemukan.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setMessage("Email Anda berhasil diverifikasi!");
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.error ?? "Verifikasi gagal.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Terjadi kesalahan saat verifikasi.");
      });
  }, [token]);

  return (
    <div className="auth-status-stack">
      {status === "loading" && (
        <div className="auth-status neutral">
          <LoaderCircle className="auth-spinner" aria-hidden="true" />
          <span>Memverifikasi tautan...</span>
        </div>
      )}

      {status === "success" && (
        <>
          <div className="auth-status success">
            <CheckCircle2 aria-hidden="true" />
            <span>{message}</span>
          </div>
          <Link href="/login" className="auth-link strong">
            Masuk ke akun Anda
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="auth-status error">
            <AlertCircle aria-hidden="true" />
            <span>{message}</span>
          </div>
          <Link href="/login" className="auth-link strong">
            Kembali ke halaman masuk
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-single" aria-labelledby="verify-email-title">
        <div className="auth-card-head center">
          <div className="auth-mobile-brand always">
            <span className="auth-brand-mark" aria-hidden="true">
              <Building2 />
            </span>
            <span>Sewain</span>
          </div>
          <h1 id="verify-email-title">Verifikasi Email</h1>
          <p>Memverifikasi alamat email Anda.</p>
        </div>
        <Suspense fallback={<div className="auth-status neutral"><LoaderCircle className="auth-spinner" aria-hidden="true" /><span>Memuat...</span></div>}>
          <VerifyEmailContent />
        </Suspense>
      </section>
    </main>
  );
}
