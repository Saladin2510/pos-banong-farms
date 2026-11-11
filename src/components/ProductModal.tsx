"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  Barcode,
  CheckCircle2,
  Globe,
  ImagePlus,
  Link2,
  Package,
  PackagePlus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CategoryType, Product } from "@/types/pos";
import { PRODUCT_IMAGES } from "@/data/initialData";

interface ProductModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onSaveProduct: (productData: Omit<Product, "id">, existingId?: string) => void;
  onDeleteProduct?: (productId: string) => void;
}

const CATEGORIES: Exclude<CategoryType, "Semua">[] = [
  "Pakan Ayam/Unggas",
  "Pakan Burung",
  "Pakan Ikan",
  "Pakan Hewan Peliharaan",
  "Vitamin & Obat",
  "Alat Ternak",
];

const PRESET_GALLERY = [
  { label: "Pur Ayam", url: PRODUCT_IMAGES.purAyamEceran },
  { label: "Karung 50Kg", url: PRODUCT_IMAGES.pakanAyamSak },
  { label: "Jagung Giling", url: PRODUCT_IMAGES.jagungGiling },
  { label: "Pakan Burung", url: PRODUCT_IMAGES.pakanBurung },
  { label: "Pelet Ikan", url: PRODUCT_IMAGES.peletIkan },
  { label: "Pakan Kucing", url: PRODUCT_IMAGES.pakanKucing },
  { label: "Vitamin", url: PRODUCT_IMAGES.vitaminTernak },
  { label: "Alat Ternak", url: PRODUCT_IMAGES.alatTernak },
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  editingProduct,
  onClose,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] =
    useState<Exclude<CategoryType, "Semua">>("Pakan Ayam/Unggas");
  const [unit, setUnit] = useState("1 Kg");
  const [sellPrice, setSellPrice] = useState("12000");
  const [wholesalePrice, setWholesalePrice] = useState("10500");
  const [costPrice, setCostPrice] = useState("8500");
  const [stock, setStock] = useState("50");
  const [image, setImage] = useState<string>(PRODUCT_IMAGES.purAyamEceran);
  const [imageInputMode, setImageInputMode] = useState<"UPLOAD" | "URL">("UPLOAD");
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (editingProduct) {
        setName(editingProduct.name);
        setSku(editingProduct.sku);
        setCategory(editingProduct.category);
        setUnit(editingProduct.unit || "1 Kg");
        setSellPrice(String(editingProduct.sellPrice));
        setWholesalePrice(
          String(editingProduct.wholesalePrice || editingProduct.sellPrice)
        );
        setCostPrice(String(editingProduct.costPrice));
        setStock(String(editingProduct.stock));
        setImage(editingProduct.image || "");
        setIsAvailable(editingProduct.isAvailable);

        if (editingProduct.image && editingProduct.image.startsWith("http")) {
          setImageInputMode("URL");
          setImageUrlInput(editingProduct.image);
        } else {
          setImageInputMode("UPLOAD");
          setImageUrlInput("");
        }
      } else {
        setName("");
        setSku(`PKN${Math.floor(100 + Math.random() * 900)}`);
        setCategory("Pakan Ayam/Unggas");
        setUnit("1 Kg");
        setSellPrice("15000");
        setWholesalePrice("13500");
        setCostPrice("11000");
        setStock("40");
        setImage(PRODUCT_IMAGES.purAyamEceran);
        setImageInputMode("UPLOAD");
        setImageUrlInput("");
        setIsAvailable(true);
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, editingProduct]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 600;
          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE);
            const scale = Math.max(MAX_SIZE / img.width, MAX_SIZE / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (MAX_SIZE - w) / 2;
            const y = (MAX_SIZE - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            setImage(canvas.toDataURL("image/jpeg", 0.88));
          } else {
            setImage(reader.result as string);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    onSaveProduct(
      {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category,
        unit: unit.trim() || "1 Kg",
        sellPrice: Math.max(0, Number(sellPrice) || 0),
        wholesalePrice: Math.max(0, Number(wholesalePrice) || Number(sellPrice) || 0),
        costPrice: Math.max(0, Number(costPrice) || 0),
        stock: Math.max(0, Number(stock) || 0),
        image: image || PRODUCT_IMAGES.purAyamEceran,
        isAvailable,
      },
      editingProduct?.id
    );
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className="no-print w-[95vw] sm:w-full max-w-2xl max-h-[92dvh] overflow-y-auto m-auto my-auto rounded-3xl bg-white p-0 text-slate-900 shadow-2xl border border-slate-200 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#0F2942] text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-white">
              {editingProduct
                ? `Edit Produk: ${editingProduct.name}`
                : "Tambah Produk Baru"}
            </h2>
            <p className="text-xs text-slate-300">
              Katalog Toko CV Banong Farms (Foto Produk, Eceran, Grosir &amp; Stok)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup modal produk"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
          {/* Left Column: Image Selection (Upload File Lokal VS Link Gambar Online) */}
          <div className="sm:col-span-4 flex flex-col items-center space-y-3">
            {/* Live Image Preview Container */}
            <div className="w-full max-w-[190px] aspect-square rounded-2xl border-2 border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center overflow-hidden relative group shadow-inner">
              {image ? (
                <img
                  src={image}
                  alt={name || "Preview Produk"}
                  className="w-full h-full rounded-xl object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = PRODUCT_IMAGES.purAyamEceran;
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <Package className="w-10 h-10 mb-1 stroke-1" />
                  <span className="text-[11px] font-bold">Belum ada foto</span>
                </div>
              )}
            </div>

            {/* Switcher Tab: File Lokal vs Link Gambar Online */}
            <div className="w-full grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setImageInputMode("UPLOAD")}
                className={`py-1.5 px-1 rounded-lg transition flex items-center justify-center gap-1 ${
                  imageInputMode === "UPLOAD"
                    ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setImageInputMode("URL")}
                className={`py-1.5 px-1 rounded-lg transition flex items-center justify-center gap-1 ${
                  imageInputMode === "URL"
                    ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Link Online</span>
              </button>
            </div>

            {/* Input Dynamic based on Choice */}
            {imageInputMode === "UPLOAD" ? (
              <div className="w-full space-y-1.5">
                <label className="w-full cursor-pointer py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                  <ImagePlus className="w-4 h-4" />
                  <span>Pilih dari HP / Laptop</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Format JPG/PNG/WebP langsung dioptimalkan
                </p>
              </div>
            ) : (
              <div className="w-full space-y-1.5">
                <div className="relative">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImageUrlInput(val);
                      if (val.trim()) {
                        setImage(val.trim());
                      }
                    }}
                    placeholder="https://contoh.com/foto.jpg"
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Tempel URL foto produk online
                </p>
              </div>
            )}

            {/* Quick Presets (Real Photos Only, NO SVG) */}
            <div className="w-full pt-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">
                Atau Pilih Foto Cepat:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_GALLERY.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setImage(preset.url);
                      if (imageInputMode === "URL") setImageUrlInput(preset.url);
                    }}
                    title={preset.label}
                    className={`p-1 rounded-lg border transition overflow-hidden ${
                      image === preset.url
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full aspect-square object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Form Inputs */}
          <div className="sm:col-span-8 space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                Nama Produk Pakan / Obat / Alat Ternak *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pur Ayam 511 Pokphand (Sak 50 Kg)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Kode SKU *
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PKA001"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold uppercase focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Kategori *
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Exclude<CategoryType, "Semua">)
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:outline-none focus:border-emerald-600"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                  Kemasan / Satuan
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="1 Kg / Sak 50 Kg / Botol"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Eceran (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Harga Grosir (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50/40 text-sm font-extrabold text-amber-900 focus:outline-none focus:border-emerald-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Modal (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stok Gudang
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 tabular-nums"
                />
              </div>
            </div>

            {/* Ketersediaan Toggle */}
            <div className="pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="block text-xs sm:text-sm font-extrabold text-slate-800">
                    Status Ketersediaan Stok
                  </span>
                  <span className="text-xs text-slate-500">
                    {isAvailable
                      ? "Stok aktif dan dapat dipilih di kasir"
                      : "Stok nonaktif sementara"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable((v) => !v)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition ${
                    isAvailable
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-rose-100 text-rose-700 border border-rose-200"
                  }`}
                >
                  {isAvailable ? "✓ Aktif Dijual" : "✕ Nonaktif"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {editingProduct && onDeleteProduct ? (
            <button
              type="button"
              onClick={() => {
                onDeleteProduct(editingProduct.id);
                dialogRef.current?.close();
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Produk</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingProduct ? "Simpan Perubahan" : "Tambahkan Produk"}</span>
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};
