"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CloudConfig,
  getSavedCloudConfig,
  saveCloudConfig,
} from "@/lib/cloudDb";

interface CloudDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbSource: "SUPABASE_CLOUD" | "SERVER_API" | "LOCAL";
  isSyncing: boolean;
  onTriggerSync: () => Promise<void>;
}

const SQL_SCHEMA_SNIPPET = `-- Lihat file lengkap beserta trigger Auth & RLS di supabase/schema.sql
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Staf Kasir',
  role TEXT NOT NULL DEFAULT 'CASHIER' CHECK (role IN ('CASHIER', 'OWNER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  wholesale_price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '1 Kg',
  cost_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cashier_name TEXT NOT NULL,
  waiter_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  table_number TEXT NOT NULL,
  order_type TEXT NOT NULL,
  global_note TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_discount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  change_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.held_orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  waiter_name TEXT NOT NULL,
  table_number TEXT NOT NULL,
  order_type TEXT NOT NULL,
  global_note TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);`;

export const CloudDbModal: React.FC<CloudDbModalProps> = ({
  isOpen,
  onClose,
  dbSource,
  isSyncing,
  onTriggerSync,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      const cfg = getSavedCloudConfig();
      setSupabaseUrl(cfg.supabaseUrl);
      setSupabaseAnonKey(cfg.supabaseAnonKey);
      setEnabled(cfg.enabled);
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleNativeClose);

    let cleanupFallback: (() => void) | undefined;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener("click", handleBackdropClick);
      cleanupFallback = () =>
        dialog.removeEventListener("click", handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      if (cleanupFallback) cleanupFallback();
    };
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCfg: CloudConfig = {
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      enabled: Boolean(supabaseUrl.trim() && supabaseAnonKey.trim() && enabled),
    };
    saveCloudConfig(newCfg);
    await onTriggerSync();
    dialogRef.current?.close();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className="no-print w-[95vw] sm:w-full max-w-2xl max-h-[92dvh] overflow-y-auto m-auto my-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-slate-900">
              Koneksi Cloud Database — CV Banong Farms
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Sinkronisasi Database Real-Time (Next.js Server API + Supabase Cloud PostgreSQL)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup modal database"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
        {/* Status Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Server className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 block">
                Database Server API (/api/pos)
              </span>
              <span className="text-sm font-black text-emerald-700 block mt-0.5">
                ✓ Terhubung &amp; Aktif
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Data produk, stok, &amp; transaksi tersimpan otomatis di database server{" "}
                <code>data/banong-pos-db.json</code>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 block">
                Supabase Cloud PostgreSQL
              </span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">
                {dbSource === "SUPABASE_CLOUD"
                  ? "✓ Cloud Online Terhubung"
                  : "Siap Dihubungkan"}
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Hubungkan URL &amp; Anon Key Supabase agar kasir &amp; HP pemilik tersinkronisasi
                via internet.
              </p>
            </div>
          </div>
        </div>

        {/* Supabase Cloud Credentials Form */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Konfigurasi Supabase Cloud (PostgreSQL)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span>Aktifkan Sinkronisasi Supabase Cloud</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supabase Project URL (NEXT_PUBLIC_SUPABASE_URL)
            </label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => {
                setSupabaseUrl(e.target.value);
                if (e.target.value) setEnabled(true);
              }}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supabase Anon Public Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => {
                setSupabaseAnonKey(e.target.value);
                if (e.target.value) setEnabled(true);
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
        </div>

        {/* SQL Schema Helper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Script SQL Pembuatan Tabel Cloud (tersedia juga di{" "}
              <code>supabase/schema.sql</code>):
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSql ? "✓ SQL Disalin!" : "Salin Script SQL"}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-32">
            {SQL_SCHEMA_SNIPPET}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan &amp; Hubungkan Cloud</span>
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};

