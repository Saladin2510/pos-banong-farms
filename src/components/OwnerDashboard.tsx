"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CreditCard,
  Edit3,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { PaymentMethod, Product, Transaction } from "@/types/pos";
import { formatDateTimeID, formatRupiah } from "@/utils/format";
import { EmployeeManagementView } from "./EmployeeManagementView";

interface OwnerDashboardProps {
  transactions: Transaction[];
  products: Product[];
  onReprintTransaction: (tx: Transaction) => void;
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
  onToggleProductAvailability: (productId: string) => void;
  activeTab?: "DASHBOARD" | "SALES_REPORT" | "EMPLOYEES";
  onChangeTab?: (tab: "DASHBOARD" | "SALES_REPORT" | "EMPLOYEES") => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  transactions,
  products,
  onReprintTransaction,
  onOpenAddProduct,
  onOpenEditProduct,
  onToggleProductAvailability,
  activeTab = "DASHBOARD",
  onChangeTab,
}) => {
  const [tab, setTab] = useState<"DASHBOARD" | "SALES_REPORT" | "EMPLOYEES">(activeTab);

  React.useEffect(() => {
    if (activeTab) setTab(activeTab);
  }, [activeTab]);

  const [filterCashier, setFilterCashier] = useState<string>("ALL");
  const [filterMethod, setFilterMethod] = useState<string>("ALL");
  const [filterTimeRange, setFilterTimeRange] = useState<"ALL" | "MORNING" | "AFTERNOON">(
    "ALL"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cashiersList = useMemo(() => {
    const set = new Set<string>(["Mira Workman", "Mohammad Nur Fawaiq"]);
    transactions.forEach((t) => set.add(t.cashierName));
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterCashier !== "ALL" && tx.cashierName !== filterCashier) return false;
      if (filterMethod !== "ALL" && tx.paymentMethod !== filterMethod) return false;
      if (filterTimeRange !== "ALL") {
        const hour = new Date(tx.createdAt).getHours();
        if (filterTimeRange === "MORNING" && hour >= 12) return false;
        if (filterTimeRange === "AFTERNOON" && hour < 12) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = tx.invoiceNo.toLowerCase().includes(q);
        const matchCustomer = tx.customerName.toLowerCase().includes(q);
        const matchItem = tx.items.some((i) =>
          i.product.name.toLowerCase().includes(q)
        );
        if (!matchInvoice && !matchCustomer && !matchItem) return false;
      }
      return true;
    });
  }, [transactions, filterCashier, filterMethod, filterTimeRange, searchQuery]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalItemsSold = 0;
    let totalCost = 0;

    filteredTransactions.forEach((tx) => {
      totalRevenue += tx.grandTotal;
      tx.items.forEach((item) => {
        totalItemsSold += item.qty;
        totalCost += item.product.costPrice * item.qty;
      });
    });

    const txCount = filteredTransactions.length;
    const avgOrderValue = txCount > 0 ? Math.round(totalRevenue / txCount) : 0;
    const grossProfit = Math.max(0, totalRevenue - totalCost);

    return {
      totalRevenue,
      txCount,
      totalItemsSold,
      avgOrderValue,
      grossProfit,
    };
  }, [filteredTransactions]);

  const topSellingProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        product: Product;
        qtySold: number;
        revenue: number;
      }
    >();

    filteredTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const existing = map.get(item.product.id);
        const itemRev = item.product.sellPrice * item.qty - item.discountItem;
        if (existing) {
          existing.qtySold += item.qty;
          existing.revenue += itemRev;
        } else {
          map.set(item.product.id, {
            product: item.product,
            qtySold: item.qty,
            revenue: itemRev,
          });
        }
      });
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.qtySold - a.qtySold);
    return sorted.slice(0, 5);
  }, [filteredTransactions]);

  const maxQtySold = topSellingProducts[0]?.qtySold || 1;

  return (
    <div className="no-print max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Remote Monitoring Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Remote Cloud Sync • Live Monitoring Aktif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dashboard Pemilik Usaha — CV Banong Farms
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitoring Omset Grosir &amp; Eceran, Penjualan Pakan Ternak, serta Stok Gudang secara
            Real-Time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-400/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Dashboard Admin vs Laporan Penjualan */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl w-fit border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setTab("DASHBOARD");
            onChangeTab?.("DASHBOARD");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
            tab === "DASHBOARD"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard Admin (Ringkasan)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("SALES_REPORT");
            onChangeTab?.("SALES_REPORT");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
            tab === "SALES_REPORT"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Laporan Penjualan &amp; Transaksi</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("EMPLOYEES");
            onChangeTab?.("EMPLOYEES");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
            tab === "EMPLOYEES"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Karyawan</span>
        </button>
      </div>

      {tab === "EMPLOYEES" ? (
        <EmployeeManagementView />
      ) : (
        <>
          {/* 4 Real-time Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Omset Hari Ini
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatRupiah(stats.totalRevenue)}
            </div>
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Estimasi Laba Kotor: {formatRupiah(stats.grossProfit)}</span>
            </p>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Terhitung dari {stats.txCount} transaksi selesai
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Jumlah Transaksi
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.txCount} <span className="text-base font-bold text-slate-400">Nota</span>
            </div>
            <p className="text-xs font-semibold text-indigo-700 mt-1">
              100% Transaksi Lunas &amp; Terverifikasi
            </p>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Update otomatis saat kasir klik Bayar
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Produk Terjual
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.totalItemsSold}{" "}
              <span className="text-base font-bold text-slate-400">Porsi / Item</span>
            </div>
            <p className="text-xs font-semibold text-amber-700 mt-1">
              Dari {products.length} menu aktif di katalog
            </p>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Stok otomatis berkurang setiap penjualan
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rata-Rata Nilai Belanja
            </span>
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatRupiah(stats.avgOrderValue)}
            </div>
            <p className="text-xs font-semibold text-sky-800 mt-1">
              Average Basket Size per Pelanggan
            </p>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Indikator performa upselling kasir
          </div>
        </div>
      </div>

      {/* Middle Row: Top 5 Selling Products Bar Chart & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {tab === "DASHBOARD" && (
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Top 5 Produk Terlaris
                    </h2>
                    <p className="text-xs text-slate-500">
                      Grafik batang kuantitas terjual &amp; kontribusi omset
                    </p>
                  </div>
                </div>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>

              {topSellingProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Belum ada data penjualan pada filter ini.
                </p>
              ) : (
                <div className="space-y-4">
                  {topSellingProducts.map((entry, idx) => {
                    const widthPercent = Math.max(
                      12,
                      Math.round((entry.qtySold / maxQtySold) * 100)
                    );
                    const barColors = [
                      "from-blue-900 to-blue-700",
                      "from-blue-800 to-indigo-600",
                      "from-amber-500 to-yellow-400",
                      "from-sky-600 to-cyan-500",
                      "from-indigo-600 to-purple-500",
                    ];
                    return (
                      <div key={entry.product.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                idx === 0
                                  ? "bg-amber-400 text-slate-950"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <img
                              src={entry.product.image}
                              alt={entry.product.name}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-extrabold text-slate-900 block truncate">
                                {entry.product.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {entry.product.category} • {formatRupiah(entry.product.sellPrice)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900 block">
                              {entry.qtySold} Terjual
                            </span>
                            <span className="text-[11px] font-bold text-blue-800">
                              {formatRupiah(entry.revenue)}
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${
                              barColors[idx % barColors.length]
                            } transition-all duration-500`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {topSellingProducts.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Perbandingan Visual Volume Penjualan
                </span>
                <div className="h-32 flex items-end justify-around gap-3 pt-4 px-2 bg-slate-50 rounded-2xl border border-slate-100">
                  {topSellingProducts.map((entry, idx) => {
                    const heightPct = Math.max(
                      18,
                      Math.round((entry.qtySold / maxQtySold) * 100)
                    );
                    return (
                      <div
                        key={entry.product.id}
                        className="flex flex-col items-center flex-1 h-full justify-end group"
                      >
                        <span className="text-[10px] font-black text-slate-700 mb-1">
                          {entry.qtySold}x
                        </span>
                        <div
                          className={`w-full max-w-[38px] rounded-t-xl transition-all ${
                            idx === 0
                              ? "bg-blue-900"
                              : idx === 1
                              ? "bg-blue-700"
                              : "bg-amber-400"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] font-bold text-slate-600 truncate w-16 text-center mt-1.5 pb-1">
                          {entry.product.name.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Activity Feed / Laporan Transaksi */}
        <div className={`${tab === "SALES_REPORT" ? "lg:col-span-12" : "lg:col-span-7"} bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {tab === "SALES_REPORT"
                    ? "Laporan Penjualan & Riwayat Transaksi Lengkap"
                    : "Live Activity Feed (Riwayat Transaksi)"}
                </h2>
                <p className="text-xs text-slate-500">
                  Filter per rentang waktu, kasir bertugas, atau metode pembayaran
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. Invoice / Menu..."
                className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-blue-800"
              />
            </div>

            <div className="relative">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterCashier}
                onChange={(e) => setFilterCashier(e.target.value)}
                aria-label="Filter Kasir"
                className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-800"
              >
                <option value="ALL">Semua Kasir</option>
                {cashiersList.map((c) => (
                  <option key={c} value={c}>
                    Kasir: {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                aria-label="Filter Metode Pembayaran"
                className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-800"
              >
                <option value="ALL">Semua Metode</option>
                {(["Tunai", "QRIS", "Transfer Bank"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    Metode: {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterTimeRange}
                onChange={(e) =>
                  setFilterTimeRange(e.target.value as "ALL" | "MORNING" | "AFTERNOON")
                }
                aria-label="Filter Rentang Waktu"
                className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-800"
              >
                <option value="ALL">Semua Waktu (Hari Ini)</option>
                <option value="MORNING">Shift Pagi (06:00 - 11:59)</option>
                <option value="AFTERNOON">Shift Siang/Malam (12:00+)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada transaksi yang cocok dengan filter pencarian.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-900 text-white">
                        {tx.invoiceNo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          tx.paymentMethod === "QRIS"
                            ? "bg-blue-100 text-blue-900"
                            : tx.paymentMethod === "Tunai"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDateTimeID(tx.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">
                      {tx.items.map((it) => `${it.qty}x ${it.product.name}`).join(", ")}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>
                        Kasir: <strong className="text-slate-700">{tx.cashierName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Tipe: <strong className="text-slate-700">{tx.orderType}</strong> (
                        {tx.tableNumber})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 font-semibold">
                        Grand Total
                      </span>
                      <span className="text-base font-black text-blue-900">
                        {formatRupiah(tx.grandTotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onReprintTransaction(tx)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Struk</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Product CRUD & Inventory Management Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Manajemen Stok Gudang &amp; Daftar Harga Pakan ({products.length} Barang)
              </h2>
              <p className="text-xs text-slate-500">
                Tambah produk pakan baru, ubah harga eceran/grosir/modal, update stok, atau atur
                ketersediaan barang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Pakan</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3">Nama Barang Pakan</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Harga Modal</th>
                <th className="py-3 px-3">Harga Eceran</th>
                <th className="py-3 px-3">Harga Grosir</th>
                <th className="py-3 px-3">Stok Gudang</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map((prod) => {
                const isLowStock = prod.stock <= 5;
                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-9 h-9 rounded-xl object-contain bg-slate-50 border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{prod.name}</span>
                          <span className="text-xs text-slate-400">
                            Satuan: {prod.unit || "1 Kg"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                      {prod.sku}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-semibold">
                      {formatRupiah(prod.costPrice)}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">
                      {formatRupiah(prod.sellPrice)}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-amber-800">
                      {formatRupiah(prod.wholesalePrice || prod.sellPrice)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg font-extrabold text-xs ${
                          isLowStock
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-50 text-blue-900"
                        }`}
                      >
                        {prod.stock} {prod.unit?.includes("Sak") ? "Sak" : "Unit"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => onToggleProductAvailability(prod.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition ${
                          prod.isAvailable && prod.stock > 0
                            ? "bg-blue-100 text-blue-900 hover:bg-blue-200"
                            : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                        }`}
                      >
                        {prod.isAvailable && prod.stock > 0 ? "Tersedia" : "Habis"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenEditProduct(prod)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
