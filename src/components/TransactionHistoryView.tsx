"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Package,
  Printer,
  Receipt,
  Search,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { PaymentMethod, Transaction } from "@/types/pos";
import { formatDateTimeID, formatRupiah } from "@/utils/format";
import { ReceiptPrint, PrintPaperType } from "./ReceiptPrint";

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  onPrintReceipt: (tx: Transaction, paper?: PrintPaperType) => void;
  onBackToCashier: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  onPrintReceipt,
  onBackToCashier,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("ALL");
  const [filterCashier, setFilterCashier] = useState<string>("ALL");
  const [previewTx, setPreviewTx] = useState<Transaction | null>(null);
  const [paperSize, setPaperSize] = useState<PrintPaperType>("dot-matrix");

  // Extract unique cashiers
  const cashiersList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.cashierName) set.add(tx.cashierName);
    });
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Payment method filter
      if (filterMethod !== "ALL" && tx.paymentMethod !== filterMethod) {
        return false;
      }

      // Cashier filter
      if (filterCashier !== "ALL" && tx.cashierName !== filterCashier) {
        return false;
      }

      // Search query filter (invoice or product name)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = tx.invoiceNo.toLowerCase().includes(q);
        const matchCustomer = tx.customerName?.toLowerCase().includes(q);
        const matchItem = tx.items.some((it) =>
          it.product.name.toLowerCase().includes(q)
        );
        return matchInvoice || matchCustomer || matchItem;
      }

      return true;
    });
  }, [transactions, filterMethod, filterCashier, searchQuery]);

  // Summary statistics
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalTunai = 0;
    let totalQris = 0;
    let totalTransfer = 0;

    transactions.forEach((tx) => {
      totalRevenue += tx.grandTotal;
      if (tx.paymentMethod === "Tunai") totalTunai += tx.grandTotal;
      else if (tx.paymentMethod === "QRIS") totalQris += tx.grandTotal;
      else totalTransfer += tx.grandTotal;
    });

    return {
      count: transactions.length,
      totalRevenue,
      totalTunai,
      totalQris,
      totalTransfer,
    };
  }, [transactions]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            type="button"
            onClick={onBackToCashier}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 shrink-0"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Riwayat Transaksi Penjualan
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                {transactions.length} Transaksi Selesai
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Catatan penjualan kasir, rincian pembayaran lunas, dan preview nota fisik siap cetak.
            </p>
          </div>
        </div>

        {/* Quick Revenue Badge */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Penjualan Tercatat
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              {formatRupiah(summary.totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Mini Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Pembayaran Tunai</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {formatRupiah(summary.totalTunai)}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-extrabold text-xs">
            Cash
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Pembayaran QRIS</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {formatRupiah(summary.totalQris)}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-extrabold text-xs">
            QRIS
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Transfer Bank</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {formatRupiah(summary.totalTransfer)}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 font-extrabold text-xs">
            Bank
          </span>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor nota (INV-...), nama pembeli, atau produk..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Metode Pembayaran */}
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="ALL">Semua Pembayaran</option>
            <option value="Tunai">Tunai (Cash)</option>
            <option value="QRIS">QRIS</option>
            <option value="Transfer Bank">Transfer Bank</option>
          </select>
        </div>

        {/* Filter Kasir */}
        {cashiersList.length > 1 && (
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={filterCashier}
              onChange={(e) => setFilterCashier(e.target.value)}
              className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Kasir</option>
              {cashiersList.map((c) => (
                <option key={c} value={c}>
                  Kasir: {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4. Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Tidak Ada Transaksi yang Ditemukan
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Belum ada riwayat transaksi yang cocok dengan kata kunci atau filter yang Anda pilih.
            </p>
          </div>
          {(searchQuery || filterMethod !== "ALL" || filterCashier !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterMethod("ALL");
                setFilterCashier("ALL");
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Side: Meta & Items Breakdown */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-white tracking-wide">
                    {tx.invoiceNo}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Lunas</span>
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      tx.paymentMethod === "QRIS"
                        ? "bg-blue-100 text-blue-800"
                        : tx.paymentMethod === "Tunai"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {tx.paymentMethod}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTimeID(tx.createdAt)}</span>
                  </span>
                </div>

                {/* Items Purchased summary */}
                <div className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2">
                  {tx.items
                    .map((it) => `${it.qty}x ${it.product.name}`)
                    .join(" • ")}
                </div>

                {/* Cashier & Delivery Info */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span>
                    Kasir: <strong className="text-slate-700">{tx.cashierName}</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Tipe: <strong className="text-slate-700">{tx.orderType}</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Pengiriman:{" "}
                    <strong className="text-slate-700">
                      {tx.tableNumber || "Ambil di Toko"}
                    </strong>
                  </span>
                  {tx.customerName && (
                    <>
                      <span>&bull;</span>
                      <span>
                        Pembeli:{" "}
                        <strong className="text-slate-700">{tx.customerName}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Side: Total & Actions */}
              <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <div className="text-left lg:text-right">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Total Transaksi
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                    {formatRupiah(tx.grandTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tombol Preview Nota */}
                  <button
                    type="button"
                    onClick={() => setPreviewTx(tx)}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Lihat Pratinjau Nota Fisik"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                    <span>Preview Nota</span>
                  </button>

                  {/* Tombol Cetak Struk */}
                  <button
                    type="button"
                    onClick={() => setPreviewTx(tx)}
                    className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    title="Cetak Nota Belanja"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Modal Preview Nota Siap Cetak (Dot Matrix & Thermal Slip) */}
      {previewTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`bg-slate-100 w-full ${
              paperSize === "dot-matrix" || paperSize === "a4" ? "max-w-4xl" : "max-w-md"
            } rounded-3xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 transition-all`}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800">
                  Pratinjau Nota Siap Cetak
                </h3>
              </div>

              {/* Paper Size Selector (A4 vs Dot Matrix vs 80mm vs 58mm) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaperSize("a4")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    paperSize === "a4"
                      ? "bg-emerald-700 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Faktur Standar Kertas A4 (HVS Penuh)"
                >
                  📄 Faktur A4
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize("dot-matrix")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    paperSize === "dot-matrix"
                      ? "bg-emerald-700 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Faktur Continuous Form Printer SPC SQ 300"
                >
                  🖨️ Dot Matrix
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize("80mm")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    paperSize === "80mm"
                      ? "bg-emerald-700 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize("58mm")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    paperSize === "58mm"
                      ? "bg-emerald-700 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  58mm
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTx(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Thermal Paper Sheet */}
            <div className="p-4 overflow-y-auto flex justify-center bg-slate-200/70">
              <div className="shadow-lg rounded-xl overflow-hidden bg-white border border-slate-300/80">
                <ReceiptPrint transaction={previewTx} paperSize={paperSize} />
              </div>
            </div>

            {/* Modal Footer: Action Buttons */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTx(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => {
                  if (previewTx) {
                    onPrintReceipt(previewTx, paperSize);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-emerald-700/20 active:scale-95 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  Cetak Nota ({paperSize === "dot-matrix" ? "Dot Matrix" : paperSize})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

