"use client";

import React, { useEffect, useId, useRef } from "react";
import { Clock, Package, PlayCircle, Trash2, X } from "lucide-react";
import { HeldOrder } from "@/types/pos";
import {
  formatDateTimeID,
  formatRupiah,
  getCartItemNetTotal,
} from "@/utils/format";

interface PendingOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResumeOrder: (heldOrder: HeldOrder) => void;
  onDeleteHeldOrder: (id: string) => void;
}

export const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({
  isOpen,
  onClose,
  heldOrders,
  onResumeOrder,
  onDeleteHeldOrder,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
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

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className="no-print w-full max-w-2xl rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-slate-900">
              Daftar Nota Tersimpan / Hold ({heldOrders.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Nota sementara yang dititipkan atau belum diselesaikan
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup daftar pesanan tersimpan"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
        {heldOrders.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm sm:text-base font-bold text-slate-600">
              Belum ada nota yang disimpan sementara (Hold)
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Klik tombol &ldquo;Simpan Nota&rdquo; di bawah keranjang untuk menahan nota sementara.
            </p>
          </div>
        ) : (
          heldOrders.map((order) => {
            const totalOrder = order.items.reduce(
              (acc, it) => acc + getCartItemNetTotal(it),
              0
            );
            const totalQty = order.items.reduce((acc, it) => acc + it.qty, 0);

            return (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-600 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900">
                      {order.customerName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {order.orderType}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {formatDateTimeID(order.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Sales/Kasir: <strong>{order.waiterName}</strong> • {totalQty} Barang (
                    {order.items.map((i) => `${i.qty}x ${i.product.name}`).join(", ")})
                  </p>
                  {order.globalNote && (
                    <p className="text-xs italic text-amber-800">
                      Catatan: &ldquo;{order.globalNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <span className="block text-xs text-slate-400 font-semibold">
                      Estimasi Total
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      {formatRupiah(totalOrder)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onResumeOrder(order);
                        dialogRef.current?.close();
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Panggil ke Kasir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHeldOrder(order.id)}
                      aria-label="Hapus pesanan tersimpan"
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </dialog>
  );
};
