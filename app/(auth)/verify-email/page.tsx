"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
    <div className="text-center space-y-4">
      {status === "loading" && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {status === "success" && (
        <>
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
          <Link href="/login" className="block text-sm text-blue-600 hover:text-blue-500 font-medium">
            Masuk ke akun Anda
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
          <Link href="/login" className="block text-sm text-blue-600 hover:text-blue-500">
            Kembali ke halaman masuk
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Verifikasi Email</h1>
          <p className="text-sm text-gray-500 mt-1">Memverifikasi alamat email Anda</p>
        </div>
        <Suspense fallback={<div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
