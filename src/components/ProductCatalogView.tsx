"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Edit3,
  Eye,
  Filter,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { CategoryType, Product } from "@/types/pos";
import { formatRupiah } from "@/utils/format";
import { PRODUCT_IMAGES } from "@/data/initialData";

interface ProductCatalogViewProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleProductAvailability: (productId: string) => void;
  onBackToCashier: () => void;
}

const CATEGORIES: CategoryType[] = [
  "Semua",
  "Pakan Ayam/Unggas",
  "Pakan Burung",
  "Pakan Ikan",
  "Pakan Hewan Peliharaan",
  "Vitamin & Obat",
  "Alat Ternak",
];

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  products,
  onOpenAddProduct,
  onOpenEditProduct,
  onDeleteProduct,
  onToggleProductAvailability,
  onBackToCashier,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("Semua");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT" | "AVAILABLE">("ALL");

  // Detail Modal State
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Delete Confirmation State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Helper image resolver
  const resolveProductImage = (prod: Product): string => {
    if (!prod.image || prod.image.startsWith("data:image/svg+xml") || prod.image.trim() === "") {
      const lower = prod.name.toLowerCase();
      if (lower.includes("sak") || lower.includes("50")) return PRODUCT_IMAGES.pakanAyamSak;
      if (lower.includes("jagung")) return PRODUCT_IMAGES.jagungGiling;
      if (lower.includes("burung") || lower.includes("milet") || lower.includes("topsong"))
        return PRODUCT_IMAGES.pakanBurung;
      if (lower.includes("ikan") || lower.includes("pelet") || lower.includes("lele"))
        return PRODUCT_IMAGES.peletIkan;
      if (lower.includes("kucing") || lower.includes("cat") || lower.includes("anjing"))
        return PRODUCT_IMAGES.pakanKucing;
      if (lower.includes("vitamin") || lower.includes("obat")) return PRODUCT_IMAGES.vitaminTernak;
      if (lower.includes("alat") || lower.includes("tempat")) return PRODUCT_IMAGES.alatTernak;
      return PRODUCT_IMAGES.purAyamEceran;
    }
    return prod.image;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category Filter
      if (selectedCategory !== "Semua" && p.category !== selectedCategory) {
        return false;
      }

      // Stock Filter
      if (stockFilter === "LOW" && (p.stock <= 0 || p.stock > 5)) return false;
      if (stockFilter === "OUT" && p.stock > 0 && p.isAvailable) return false;
      if (stockFilter === "AVAILABLE" && (p.stock <= 0 || !p.isAvailable)) return false;

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [products, selectedCategory, stockFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outOfStock = products.filter((p) => p.stock <= 0 || !p.isAvailable).length;
    return { total, lowStock, outOfStock };
  }, [products]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            type="button"
            onClick={onBackToCashier}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 shrink-0"
            title="Kembali ke Layar Kasir POS"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Katalog &amp; Manajemen Produk
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                {products.length} Produk
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Lihat detail produk, kelola harga jual, stok gudang, atau tambahkan produk baru.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-emerald-700/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk, SKU, atau kategori pakan..."
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

          {/* Quick Stock Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Kondisi Stok ({stats.total})</option>
              <option value="AVAILABLE">Stok Tersedia</option>
              <option value="LOW">Stok Menipis &le; 5 ({stats.lowStock})</option>
              <option value="OUT">Stok Habis / Nonaktif ({stats.outOfStock})</option>
            </select>
          </div>
        </div>

        {/* Category Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count =
              cat === "Semua"
                ? products.length
                : products.filter((p) => p.category === cat).length;
            const active = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Product Cards Grid (Clean, Touch-Friendly, Responsive) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Tidak Ada Produk yang Ditemukan
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Coba sesuaikan kata kunci pencarian, ubah filter kategori, atau tambahkan produk baru.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Semua");
              setStockFilter("ALL");
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock > 0 && product.stock <= 5;
            const isOut = !product.isAvailable || product.stock <= 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-3 sm:p-4 flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Image + Badges */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 mb-3">
                    <img
                      src={resolveProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Category Badge */}
                    <span className="absolute top-2.5 left-2.5 max-w-[65%] truncate bg-black/70 backdrop-blur-xs text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                      {product.category}
                    </span>

                    {/* Stock Badge */}
                    <span
                      className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs ${
                        isOut
                          ? "bg-slate-900 text-white"
                          : isLowStock
                          ? "bg-rose-600 text-white animate-pulse"
                          : "bg-white/95 text-slate-800"
                      }`}
                    >
                      {isOut ? "Habis" : `Stok: ${product.stock}`}
                    </span>
                  </div>

                  {/* SKU & Category Info */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>{product.sku}</span>
                    <button
                      type="button"
                      onClick={() => onToggleProductAvailability(product.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                        product.isAvailable && product.stock > 0
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                      title="Klik untuk ubah status ketersediaan"
                    >
                      {product.isAvailable && product.stock > 0 ? "Tersedia" : "Nonaktif"}
                    </button>
                  </div>

                  {/* Product Title */}
                  <h3
                    className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 mb-2"
                    title={product.name}
                  >
                    {product.name}
                  </h3>

                  {/* Price Info */}
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-base font-black text-slate-900">
                      {formatRupiah(product.sellPrice)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / {product.unit || "1 Kg"}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons: Detail, Edit, Hapus */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailProduct(product)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Lihat Detail Produk"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEditProduct(product)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Edit Produk"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingProduct(product)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer shrink-0"
                    title="Hapus Produk"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800">Detail Lengkap Produk</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 relative border border-slate-200">
                <img
                  src={resolveProductImage(detailProduct)}
                  alt={detailProduct.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-lg bg-black/75 text-white backdrop-blur-xs">
                  {detailProduct.isAvailable ? "Status: Aktif" : "Status: Nonaktif"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono text-emerald-700 font-extrabold uppercase">
                  SKU: {detailProduct.sku}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">
                  {detailProduct.name}
                </h2>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                  {detailProduct.category}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">
                    Harga Jual Eceran
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatRupiah(detailProduct.sellPrice)}
                  </span>
                  <span className="text-xs text-slate-500 block">/ {detailProduct.unit || "1 Kg"}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">
                    Sisa Stok Gudang
                  </span>
                  <span
                    className={`text-lg font-black ${
                      detailProduct.stock <= 5 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {detailProduct.stock} {detailProduct.unit || "Unit"}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {detailProduct.stock <= 5 ? "⚠️ Stok hampir habis" : "Stok aman terkendali"}
                  </span>
                </div>
              </div>

              {detailProduct.costPrice > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Harga Modal Pokok</span>
                  <span className="font-black text-slate-700 font-mono">
                    {formatRupiah(detailProduct.costPrice)}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const prod = detailProduct;
                  setDetailProduct(null);
                  onOpenEditProduct(prod);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Produk Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Dialog */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Hapus Produk dari Toko?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Produk <strong className="text-slate-800">{deletingProduct.name}</strong> akan
                dihapus secara permanen dari katalog dan tidak akan muncul di layar kasir.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(deletingProduct.id);
                  setDeletingProduct(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm shadow-rose-600/20 transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

