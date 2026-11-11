import Link from "next/link";
import { Store, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            404 - Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition shadow-md shadow-emerald-700/20 active:scale-95"
        >
          <Store className="w-4 h-4" />
          <span>Kembali ke Sistem Kasir</span>
        </Link>
      </div>
    </div>
  );
}
