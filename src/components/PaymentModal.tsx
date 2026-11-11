"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Printer,
  QrCode,
  Sparkles,
  X,
} from "lucide-react";
import { CartItem, PaymentMethod, Transaction } from "@/types/pos";
import {
  formatRupiah,
  getCartItemNetTotal,
  getCartItemUnitBasePrice,
} from "@/utils/format";
import { ReceiptPrint, PrintPaperType } from "./ReceiptPrint";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart?: CartItem[];
  grandTotal: number;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  nextInvoiceNo: string;
  onConfirmPayment: (
    method: PaymentMethod,
    amountPaid: number,
    changeAmount: number
  ) => Transaction;
  activePrintPaper?: PrintPaperType;
  onPaperChange?: (paper: PrintPaperType) => void;
  onPrintReceipt?: (tx: Transaction, paper: PrintPaperType) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cart = [],
  grandTotal,
  subtotal,
  totalDiscount,
  taxAmount,
  nextInvoiceNo,
  onConfirmPayment,
  activePrintPaper = "dot-matrix",
  onPaperChange,
  onPrintReceipt,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Tunai");
  const [cashInput, setCashInput] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<"BCA" | "Mandiri" | "BRI">("BCA");
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [paperSize, setPaperSize] = useState<PrintPaperType>(activePrintPaper);

  // Sync paperSize when parent activePrintPaper changes
  useEffect(() => {
    if (activePrintPaper) {
      setPaperSize(activePrintPaper);
    }
  }, [activePrintPaper]);

  // Modal open/close handling - ONLY depend on isOpen!
  // CRITICAL FIX: Do NOT include grandTotal here, because confirming payment clears cart,
  // making grandTotal=0, which would wipe completedTx and reset the modal back to empty!
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setPaymentMethod("Tunai");
      setCashInput(String(grandTotal));
      setCompletedTx(null);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      setCompletedTx(null);
      if (dialog.open) {
        dialog.close();
      }
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
    if (typeof HTMLDialogElement !== "undefined" && !("closedBy" in HTMLDialogElement.prototype)) {
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
      cleanupFallback = () => dialog.removeEventListener("click", handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      if (cleanupFallback) cleanupFallback();
    };
  }, [onClose]);

  const numericPaid = Number(cashInput) || 0;
  const changeAmount = Math.max(0, numericPaid - grandTotal);
  const shortageAmount = Math.max(0, grandTotal - numericPaid);
  const canSubmit =
    paymentMethod === "Tunai"
      ? grandTotal > 0 && numericPaid >= grandTotal
      : grandTotal > 0;

  const quickDenominations = [
    { label: "Uang Pas", value: grandTotal },
    { label: "Rp 20.000", value: 20000 },
    { label: "Rp 50.000", value: 50000 },
    { label: "Rp 100.000", value: 100000 },
    { label: "Rp 200.000", value: 200000 },
  ];

  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const finalPaid = paymentMethod === "Tunai" ? numericPaid : grandTotal;
    const finalChange = paymentMethod === "Tunai" ? changeAmount : 0;
    const newTx = onConfirmPayment(paymentMethod, finalPaid, finalChange);
    setCompletedTx(newTx);
  };

  const handleSelectPaper = (newPaper: PrintPaperType) => {
    setPaperSize(newPaper);
    onPaperChange?.(newPaper);
  };

  const handleCloseModal = () => {
    setCompletedTx(null);
    onClose();
  };

  const handlePrintReceipt = () => {
    if (completedTx) {
      onPaperChange?.(paperSize);
      if (onPrintReceipt) {
        onPrintReceipt(completedTx, paperSize);
        return;
      }
    }
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className={`no-print w-full ${
        completedTx && paperSize === "dot-matrix" ? "max-w-5xl" : "max-w-3xl"
      } rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            {completedTx ? <CheckCircle2 className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-extrabold text-slate-900">
              {completedTx ? "Transaksi Berhasil & Cetak Struk" : "Pembayaran Kasir — CV Banong Farms"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Invoice:{" "}
              <span className="font-mono font-bold text-emerald-800">
                {completedTx ? completedTx.invoiceNo : nextInvoiceNo}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCloseModal}
          aria-label="Tutup modal pembayaran"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!completedTx ? (
        <form onSubmit={handleCompletePayment} className="p-6 space-y-6">
          {/* Top Summary Banner: Clean Emerald Gradient matching Cashier POS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-800/40">
            <div className="sm:col-span-2 flex flex-col justify-between">
              <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
                Total Tagihan (Grand Total)
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight mt-1 tabular-nums text-white">
                {formatRupiah(grandTotal)}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-emerald-200/90 font-medium">
                <span>Subtotal: {formatRupiah(subtotal)}</span>
                {totalDiscount > 0 && <span>• Diskon: -{formatRupiah(totalDiscount)}</span>}
                {taxAmount > 0 && <span>• PPN: {formatRupiah(taxAmount)}</span>}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 flex flex-col justify-center border border-white/15">
              <span className="text-[11px] text-emerald-200 font-semibold">
                Uang Kembalian (Change)
              </span>
              <span className="text-2xl font-black text-amber-300 mt-0.5 tabular-nums">
                {formatRupiah(changeAmount)}
              </span>
              {shortageAmount > 0 && (
                <span className="text-[11px] text-rose-300 font-bold mt-0.5 tabular-nums">
                  Kurang: {formatRupiah(shortageAmount)}
                </span>
              )}
            </div>
          </div>

          {/* Rincian Pemesanan (Order Items Breakdown) */}
          {cart && cart.length > 0 && (
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Rincian Pemesanan
                </span>
                <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} item
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/60 pr-1">
                {cart.map((item) => {
                  const unitPrice = getCartItemUnitBasePrice(item);
                  const itemNetTotal = getCartItemNetTotal(item);
                  return (
                    <div key={item.cartItemId || item.product.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="font-extrabold text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {item.qty} × {formatRupiah(unitPrice)} {item.product.unit ? `/ ${item.product.unit}` : ""}
                          {item.discountItem > 0 && (
                            <span className="text-emerald-700 font-bold ml-1.5">
                              (Diskon -{formatRupiah(item.discountItem)})
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-black text-slate-900 tabular-nums shrink-0">
                        {formatRupiah(itemNetTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Method Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "Tunai" as PaymentMethod, label: "Tunai (Cash)", icon: Banknote },
                { id: "QRIS" as PaymentMethod, label: "QRIS", icon: QrCode },
                { id: "Transfer Bank" as PaymentMethod, label: "Transfer Bank", icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id);
                      if (m.id !== "Tunai") {
                        setCashInput(String(grandTotal));
                      }
                    }}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? "text-emerald-700" : "text-slate-400"}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method-Specific Content */}
          {paymentMethod === "Tunai" && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nominal Uang Diterima (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-emerald-700">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    autoFocus
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder="Masukkan nominal uang tunai..."
                    className="w-full pl-12 pr-4 py-3 text-xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition tabular-nums"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-500 mb-2">
                  Shortcut Pecahan Uang Cepat:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickDenominations.map((den) => (
                    <button
                      key={den.label}
                      type="button"
                      onClick={() => setCashInput(String(den.value))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition ${
                        numericPaid === den.value
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200"
                      }`}
                    >
                      {den.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "QRIS" && (
            <div className="bg-emerald-50/80 p-4 sm:p-5 rounded-2xl border border-emerald-200/90 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900">
                    QRIS Terpilih
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  Pembayaran via QRIS Kasir
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Metode QRIS telah dipilih dengan nominal tagihan pas{" "}
                  <strong className="text-emerald-950 font-bold">{formatRupiah(grandTotal)}</strong>.
                  Silakan langsung klik tombol konfirmasi di bawah untuk menyelesaikan transaksi.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === "Transfer Bank" && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex gap-2">
                {(["BCA", "Mandiri", "BRI"] as const).map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      selectedBank === bank
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Bank {bank}
                  </button>
                ))}
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold">
                    Transfer Bank {selectedBank}
                  </p>
                  <p className="text-xs font-bold text-emerald-700 mt-1">
                    a.n. CV Banong Farms Indonesia
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Nominal Transfer</span>
                  <span className="text-base font-black text-slate-900 tabular-nums">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-5 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-7 py-3.5 rounded-2xl font-extrabold text-sm text-white flex items-center gap-2 transition active:scale-[0.99] ${
                canSubmit
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-700/25 cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {grandTotal <= 0
                  ? "Pilih Produk Dulu (Tagihan Rp 0)"
                  : numericPaid < grandTotal
                  ? `Uang Kurang (${formatRupiah(grandTotal - numericPaid)})`
                  : "Konfirmasi & Selesaikan Pembayaran"}
              </span>
            </button>
          </div>
        </form>
      ) : (
        <div
          className={`p-6 max-h-[85vh] overflow-y-auto ${
            paperSize === "dot-matrix"
              ? "flex flex-col gap-6"
              : "grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
          }`}
        >
          <div className={paperSize === "dot-matrix" ? "w-full space-y-4" : "md:col-span-5 space-y-4"}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Pembayaran Lunas!</span>
              </div>
              <p className="text-xs text-emerald-800">
                Transaksi <strong>{completedTx.invoiceNo}</strong> telah tersimpan ke database.
              </p>
              <div className="pt-2 border-t border-emerald-200/70 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-emerald-800">Metode:</span>
                  <span className="font-bold text-emerald-950">{completedTx.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800">Dibayar:</span>
                  <span className="font-bold text-emerald-950 tabular-nums">
                    {formatRupiah(completedTx.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-950">
                  <span>Kembalian:</span>
                  <span className="tabular-nums">{formatRupiah(completedTx.changeAmount)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Format Faktur / Printer:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPaper("dot-matrix")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left sm:text-center cursor-pointer ${
                    paperSize === "dot-matrix"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-black">🖨️ Faktur Dot Matrix</span>
                  <span className="text-[10px] opacity-80">SPC SQ 300 / Continuous</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaper("80mm")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left sm:text-center cursor-pointer ${
                    paperSize === "80mm"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-black">Thermal 80mm</span>
                  <span className="text-[10px] opacity-80">Struk Roll Standar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaper("58mm")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left sm:text-center cursor-pointer ${
                    paperSize === "58mm"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-black">Thermal 58mm</span>
                  <span className="text-[10px] opacity-80">Struk Mini Bluetooth</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 w-full py-3.5 px-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>
                  CETAK {paperSize === "dot-matrix" ? "FAKTUR DOT MATRIX" : `STRUK (${paperSize})`}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition cursor-pointer"
              >
                + Transaksi Baru
              </button>
            </div>
          </div>

          <div
            className={`${
              paperSize === "dot-matrix" ? "w-full" : "md:col-span-7"
            } bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col items-center overflow-x-auto`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Preview {paperSize === "dot-matrix" ? "Faktur Continuous Form (SPC SQ 300)" : `Struk Thermal (${paperSize})`}
            </span>
            <div className="shadow-xl rounded-lg overflow-hidden border border-slate-300 bg-white w-full flex justify-center">
              <ReceiptPrint transaction={completedTx} paperSize={paperSize} />
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
};
