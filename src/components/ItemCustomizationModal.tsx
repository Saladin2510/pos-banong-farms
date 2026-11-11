"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, MessageSquarePlus, PackageCheck, Percent, Tag, X } from "lucide-react";
import { CartItem, PriceTier, ProductModifier } from "@/types/pos";
import { AVAILABLE_MODIFIERS } from "@/data/initialData";
import { formatRupiah } from "@/utils/format";

interface ItemCustomizationModalProps {
  item: CartItem | null;
  onClose: () => void;
  onSave: (
    cartItemId: string,
    updates: {
      note: string;
      discountItem: number;
      modifiers: ProductModifier[];
      qty: number;
      priceTier: PriceTier;
    }
  ) => void;
}

const QUICK_NOTES = [
  "Karung dijahit rapat",
  "Plastik rangkap 2",
  "Timbangan pas",
  "Muat ke mobil pikap",
  "Campur jagung & dedak",
  "Kirim ke kandang",
  "Pakan baru (fresh)",
];

export const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  item,
  onClose,
  onSave,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [qty, setQty] = useState(1);
  const [priceTier, setPriceTier] = useState<PriceTier>("Eceran");
  const [note, setNote] = useState("");
  const [discountItem, setDiscountItem] = useState("0");
  const [selectedMods, setSelectedMods] = useState<ProductModifier[]>([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item) {
      setQty(item.qty);
      setPriceTier(item.priceTier || "Eceran");
      setNote(item.note);
      setDiscountItem(String(item.discountItem));
      setSelectedMods(item.modifiers);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [item]);

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

  if (!item) return null;

  const wholesalePrice = item.product.wholesalePrice || item.product.sellPrice;

  const toggleModifier = (mod: ProductModifier) => {
    setSelectedMods((prev) =>
      prev.some((m) => m.id === mod.id)
        ? prev.filter((m) => m.id !== mod.id)
        : [...prev, mod]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.cartItemId, {
      qty: Math.max(1, qty),
      priceTier,
      note: note.trim(),
      discountItem: Math.max(0, Number(discountItem) || 0),
      modifiers: selectedMods,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className="no-print w-[95vw] sm:w-full max-w-xl max-h-[92dvh] overflow-y-auto m-auto my-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div>
          <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-slate-900">
            Pengaturan Harga &amp; Kemasan Pakan
          </h2>
          <p className="text-xs sm:text-sm text-emerald-700 font-bold mt-0.5">
            {item.product.name} ({item.product.unit || "Satuan"})
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup modal kustomisasi"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
        {/* 1. Pilih Tipe Harga: Eceran vs Grosir */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            <Tag className="w-4 h-4 text-emerald-700" />
            <span>Pilih Tipe Harga Penjualan</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPriceTier("Eceran")}
              className={`p-3.5 rounded-2xl border-2 text-left transition ${
                priceTier === "Eceran"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Harga Eceran
                </span>
                {priceTier === "Eceran" && (
                  <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                )}
              </div>
              <div className="text-lg font-black mt-1">
                {formatRupiah(item.product.sellPrice)}
                <span className="text-xs font-semibold text-slate-500">
                  {" "}
                  / {item.product.unit || "Unit"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPriceTier("Grosir")}
              className={`p-3.5 rounded-2xl border-2 text-left transition ${
                priceTier === "Grosir"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  Harga Grosir / Mitra
                </span>
                {priceTier === "Grosir" && (
                  <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                )}
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatRupiah(wholesalePrice)}
                <span className="text-xs font-semibold text-slate-500">
                  {" "}
                  / {item.product.unit || "Unit"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Pilihan Satuan Kemasan & Layanan Tambahan */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-2">
            <PackageCheck className="w-4 h-4 text-emerald-700" />
            <span>Pilih Satuan Kemasan / Tambahan Layanan</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AVAILABLE_MODIFIERS.map((mod) => {
              const isSelected = selectedMods.some((m) => m.id === mod.id);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => toggleModifier(mod)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-left">
                    {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                    <span>{mod.name}</span>
                  </span>
                  <span className="text-slate-500 font-semibold shrink-0 ml-2">
                    {mod.price > 0 ? `+${formatRupiah(mod.price)}` : "Standar"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Potongan Diskon Item */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
            <Percent className="w-4 h-4 text-rose-600" />
            <span>Potongan Harga / Diskon Khusus Item (Rp)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={500}
              value={discountItem}
              onChange={(e) => setDiscountItem(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              placeholder="Contoh: 5000"
            />
            {[0, 2000, 5000, 10000].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiscountItem(String(d))}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 shrink-0"
              >
                {d === 0 ? "Reset" : `-${d / 1000}rb`}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Catatan Kustom Pakan / Pengemasan */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
            <MessageSquarePlus className="w-4 h-4 text-emerald-700" />
            <span>Catatan Kemasan / Pengiriman Barang</span>
          </label>
          <input
            type="text"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: karung dijahit rapat, muat ke pikap, plastik rangkap 2..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_NOTES.map((qn) => (
              <button
                key={qn}
                type="button"
                onClick={() =>
                  setNote((prev) => (prev ? `${prev}, ${qn.toLowerCase()}` : qn))
                }
                className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 transition"
              >
                + {qn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
          >
            Simpan Pengaturan Item
          </button>
        </div>
      </form>
    </dialog>
  );
};
