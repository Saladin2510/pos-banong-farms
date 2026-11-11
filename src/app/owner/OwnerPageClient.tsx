"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Receipt, ShieldCheck } from "lucide-react";
import { AuthUserProfile } from "@/lib/supabase/config";
import { Product, Transaction } from "@/types/pos";
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from "@/data/initialData";
import { fetchPosDataFromCloud, syncPosDataToCloud } from "@/lib/cloudDb";
import { HpLogo } from "@/components/HpLogo";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { ProductModal } from "@/components/ProductModal";
import { ReceiptPrint, PrintPaperType } from "@/components/ReceiptPrint";

const STORAGE_KEYS = {
  PRODUCTS: "cb_banong_products_v3",
  TRANSACTIONS: "cb_banong_transactions_v3",
};

export default function OwnerPageClient({ user }: { user: AuthUserProfile }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activePrintTx, setActivePrintTx] = useState<Transaction | null>(
    INITIAL_TRANSACTIONS[0] || null
  );
  const [activePrintPaper, setActivePrintPaper] =
    useState<PrintPaperType>("dot-matrix");

  useEffect(() => {
    try {
      const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProds) setProducts(JSON.parse(savedProds));

      const savedTxs = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (savedTxs) setTransactions(JSON.parse(savedTxs));
    } catch {
      // Fallback
    }

    fetchPosDataFromCloud().then((remote) => {
      if (remote && remote.products.length > 0) {
        setProducts(remote.products);
        if (remote.transactions.length > 0) {
          setTransactions(remote.transactions);
        }
      }
    });
  }, []);

  const persistAndSync = (nextProducts: Product[], nextTxs: Transaction[]) => {
    setProducts(nextProducts);
    setTransactions(nextTxs);
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxs));
    } catch {
      // Ignore storage error
    }
    syncPosDataToCloud({
      products: nextProducts,
      transactions: nextTxs,
      heldOrders: [],
    });
  };

  const handleSaveProduct = (
    productData: Omit<Product, "id">,
    existingId?: string
  ) => {
    const nextProducts = existingId
      ? products.map((p) =>
          p.id === existingId ? { ...productData, id: existingId } : p
        )
      : [{ ...productData, id: `prod-${Date.now()}` }, ...products];
    persistAndSync(nextProducts, transactions);
  };

  const handleDeleteProduct = (productId: string) => {
    const nextProducts = products.filter((p) => p.id !== productId);
    persistAndSync(nextProducts, transactions);
  };

  const handleToggleProductAvailability = (productId: string) => {
    const nextProducts = products.map((p) =>
      p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
    );
    persistAndSync(nextProducts, transactions);
  };

  const handleReprintTransaction = (
    tx: Transaction,
    paper: PrintPaperType = "dot-matrix"
  ) => {
    setActivePrintTx(tx);
    setActivePrintPaper(paper);
    setTimeout(() => window.print(), 150);
  };

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="no-print h-16 bg-white text-slate-800 border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <HpLogo size="sm" showText={true} darkText={true} />
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Rute Terlindungi /owner • {user.fullName} (OWNER)</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/?mode=transactions"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm transition"
          >
            <Receipt className="w-4 h-4" />
            <span>Riwayat Transaksi</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <main className="no-print flex-1">
        <OwnerDashboard
          transactions={transactions}
          products={products}
          onReprintTransaction={handleReprintTransaction}
          onOpenAddProduct={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
          onOpenEditProduct={(prod) => {
            setEditingProduct(prod);
            setIsProductModalOpen(true);
          }}
          onToggleProductAvailability={handleToggleProductAvailability}
        />
      </main>

      <ProductModal
        isOpen={isProductModalOpen}
        editingProduct={editingProduct}
        onClose={() => setIsProductModalOpen(false)}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      <div id="print-only-root" aria-hidden="true">
        <ReceiptPrint transaction={activePrintTx} paperSize={activePrintPaper} />
      </div>
    </div>
  );
}

