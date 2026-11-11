"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Edit3,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  Menu,
  Minus,
  Package,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Table2,
  Tag,
  Trash2,
  Truck,
  User,
  Users,
  Wheat,
  X,
} from "lucide-react";
import {
  CartItem,
  CategoryType,
  HeldOrder,
  OrderType,
  PaymentMethod,
  PriceTier,
  Product,
  ProductModifier,
  Transaction,
} from "@/types/pos";
import {
  INITIAL_CART_ITEMS,
  INITIAL_HELD_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  PRODUCT_IMAGES,
} from "@/data/initialData";
import {
  formatRupiah,
  getCartItemGrossTotal,
  getCartItemNetTotal,
  getCartItemUnitBasePrice,
} from "@/utils/format";
import { HpLogo } from "@/components/HpLogo";
import { PaymentModal } from "@/components/PaymentModal";
import { ItemCustomizationModal } from "@/components/ItemCustomizationModal";
import { ProductModal } from "@/components/ProductModal";
import { PendingOrdersModal } from "@/components/PendingOrdersModal";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { ProductCatalogView } from "@/components/ProductCatalogView";
import { TransactionHistoryView } from "@/components/TransactionHistoryView";
import { ReceiptPrint, PrintPaperType } from "@/components/ReceiptPrint";
import { CloudDbModal } from "@/components/CloudDbModal";
import { fetchPosDataFromCloud, syncPosDataToCloud } from "@/lib/cloudDb";
import { AuthUserProfile } from "@/lib/supabase/config";

const STORAGE_KEYS = {
  PRODUCTS: "cb_banong_products_v3",
  TRANSACTIONS: "cb_banong_transactions_v3",
  HELD_ORDERS: "cb_banong_held_orders_v3",
  CART: "cb_banong_active_cart_v3",
};

const CATEGORIES: CategoryType[] = [
  "Semua",
  "Pakan Ayam/Unggas",
  "Pakan Burung",
  "Pakan Ikan",
  "Pakan Hewan Peliharaan",
  "Vitamin & Obat",
  "Alat Ternak",
];

const CASHIERS = ["Mira Workman", "Mohammad Nur Fawaiq", "Dimas Pratama"];
const DELIVERY_METHODS = [
  "Ambil di Toko",
  "Diantar Armada Toko",
  "Kirim Ekspedisi",
  "Muat Pikap / Truk",
];

// Helper to guarantee a realistic photo for all products (even if stale SVG is in localStorage)
const resolveProductImage = (prod: Product): string => {
  if (
    !prod.image ||
    prod.image.startsWith("data:image/svg+xml") ||
    prod.image.trim() === ""
  ) {
    if (prod.category === "Pakan Ayam/Unggas") {
      return prod.unit?.toLowerCase().includes("sak")
        ? PRODUCT_IMAGES.pakanAyamSak
        : PRODUCT_IMAGES.purAyamEceran;
    }
    if (prod.category === "Pakan Burung") return PRODUCT_IMAGES.pakanBurung;
    if (prod.category === "Pakan Ikan") return PRODUCT_IMAGES.peletIkan;
    if (prod.category === "Pakan Hewan Peliharaan") return PRODUCT_IMAGES.pakanKucing;
    if (prod.category === "Vitamin & Obat") return PRODUCT_IMAGES.vitaminTernak;
    if (prod.category === "Alat Ternak") return PRODUCT_IMAGES.alatTernak;
    return PRODUCT_IMAGES.purAyamEceran;
  }
  return prod.image;
};

export default function PosPage() {
  // Navigation & View Modes
  const [appMode, setAppMode] = useState<
    "CASHIER" | "OWNER" | "CATALOG_MGMT" | "TRANSACTIONS"
  >("CASHIER");
  const [ownerActiveTab, setOwnerActiveTab] = useState<
    "DASHBOARD" | "SALES_REPORT" | "EMPLOYEES"
  >("DASHBOARD");
  const [catalogViewMode, setCatalogViewMode] = useState<"GRID" | "CLASSIC_TABLE">(
    "GRID"
  );
  const [mobileTab, setMobileTab] = useState<"CATALOG" | "CART">("CATALOG");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);

  const handleSwitchToOwnerMode = () => {
    if (authUser && authUser.role !== "OWNER") {
      showToast(
        "🔒 Akses Dibatasi: Hanya akun Pemilik (Owner) yang dapat membuka Dashboard Admin!"
      );
      return;
    }
    setAppMode("OWNER");
  };

  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    window.location.href = "/login";
  };

  // Core POS Data State (Starts with clean empty cart & CV Banong Farms feed catalog!)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART_ITEMS);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(INITIAL_HELD_ORDERS);
  const [transactions, setTransactions] = useState<Transaction[]>(
    INITIAL_TRANSACTIONS
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Order Meta State (Left Panel - Wholesale & Retail Feed Store)
  const [customerName, setCustomerName] = useState("Pembeli Umum");
  const [cashierName, setCashierName] = useState("Mira Workman");
  const [waiterName, setWaiterName] = useState("Mira Workman");
  const [orderType, setOrderType] = useState<OrderType>("Eceran Umum");
  const [defaultPriceTier, setDefaultPriceTier] = useState<PriceTier>("Eceran");
  const [tableNumber, setTableNumber] = useState("Ambil di Toko");
  const [globalNote, setGlobalNote] = useState("");
  const [orderPhotoAttached, setOrderPhotoAttached] = useState<string | null>(null);
  const [enableTax, setEnableTax] = useState(false);
  const [showSummaryDetail, setShowSummaryDetail] = useState(true);
  const [showOrderMetaCollapsible, setShowOrderMetaCollapsible] = useState(false);

  // Search, Barcode, Category Filter State (Right Panel)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("Semua");
  const [barcodeQuickQty, setBarcodeQuickQty] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<CartItem | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [dbSource, setDbSource] = useState<"SUPABASE_CLOUD" | "SERVER_API" | "LOCAL">(
    "SERVER_API"
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Active Transaction & Paper Size for Direct Printing (`#print-only-root`)
  const [activePrintTx, setActivePrintTx] = useState<Transaction | null>(
    INITIAL_TRANSACTIONS[INITIAL_TRANSACTIONS.length - 1]
  );
  const [activePrintPaper, setActivePrintPaper] = useState<PrintPaperType>("dot-matrix");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Load persisted data from LocalStorage on mount & clean up old restaurant v1/v2 keys
  useEffect(() => {
    try {
      [
        "hp_pos_products_v1",
        "hp_pos_transactions_v1",
        "hp_pos_held_orders_v1",
        "hp_pos_active_cart_v1",
        "cb_pos_products_v1",
        "cb_pos_transactions_v1",
        "cb_pos_held_orders_v1",
        "cb_pos_active_cart_v1",
        "cb_pos_products_v2",
        "cb_pos_transactions_v2",
        "cb_pos_held_orders_v2",
        "cb_pos_active_cart_v2",
      ].forEach((k) => localStorage.removeItem(k));

      const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProds) {
        try {
          const parsed = JSON.parse(savedProds);
          setProducts(parsed.map((p: any) => ({ ...p, image: resolveProductImage(p) })));
        } catch {
          // ignore
        }
      }

      const savedTxs = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (savedTxs) {
        const parsedTxs = JSON.parse(savedTxs);
        setTransactions(parsedTxs);
        if (parsedTxs.length > 0) setActivePrintTx(parsedTxs[0]);
      }

      const savedHeld = localStorage.getItem(STORAGE_KEYS.HELD_ORDERS);
      if (savedHeld) setHeldOrders(JSON.parse(savedHeld));

      const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch {
      // Fallback to initial data
    } finally {
      setIsHydrated(true);
    }

    // Fetch latest data from Cloud / Server Database API
    fetchPosDataFromCloud().then((remote) => {
      if (remote && remote.products.length > 0) {
        setDbSource(remote.source);
        // Merge or use local if user already edited images locally, else use remote
        const localRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (!localRaw) {
          setProducts(remote.products);
        }
        if (remote.transactions.length > 0) {
          setTransactions(remote.transactions);
          setActivePrintTx(remote.transactions[0]);
        }
      }
    });

    // Fetch verified server auth session & role
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const verifiedUser = data.user as AuthUserProfile;
          setAuthUser(verifiedUser);
          if (verifiedUser.role === "OWNER") {
            setAppMode("OWNER");
          }
          if (verifiedUser.fullName) {
            setCashierName(verifiedUser.fullName);
            setWaiterName(verifiedUser.fullName);
          }
        }
      })
      .catch(() => {});

    // Check if redirected from `/owner` due to role guard or requested `?mode=owner` / `?mode=transactions`
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "forbidden_owner") {
        showToast(
          "🔒 Rute /owner Terlindungi: Hanya Pemilik (Owner) yang memiliki izin akses!"
        );
      } else if (params.get("mode") === "owner") {
        setAppMode("OWNER");
      } else if (params.get("mode") === "transactions") {
        setAppMode("TRANSACTIONS");
      }
    }
  }, []);

  // Strict role-based workspace guard:
  // - Admin (OWNER) HANYA memiliki akses ke: Dashboard Admin, Laporan Penjualan, Manajemen Karyawan, dan Riwayat Transaksi.
  //   TIDAK memiliki akses ke Kasir dan Katalog Produk.
  // - Kasir (CASHIER) memiliki akses ke Kasir POS, Katalog Produk, dan Riwayat Transaksi.
  useEffect(() => {
    if (authUser?.role === "OWNER") {
      if (appMode === "CASHIER" || appMode === "CATALOG_MGMT") {
        setAppMode("OWNER");
      }
    } else if (authUser?.role === "CASHIER") {
      if (appMode === "OWNER") {
        setAppMode("CASHIER");
      }
    }
  }, [authUser, appMode]);

  // Persist changes to LocalStorage AND Sync to Server/Cloud Database
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEYS.HELD_ORDERS, JSON.stringify(heldOrders));
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // Ignore quota errors
    }

    // Background sync to Next.js Server API (/api/pos) & Supabase Cloud
    syncPosDataToCloud({ products, transactions, heldOrders }).then((res) => {
      if (res.syncedToSupabase) setDbSource("SUPABASE_CLOUD");
      else if (res.syncedToServer) setDbSource("SERVER_API");
    });
  }, [products, transactions, heldOrders, cart, isHydrated]);

  const handleManualCloudSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncPosDataToCloud({ products, transactions, heldOrders });
      if (res.syncedToSupabase) {
        setDbSource("SUPABASE_CLOUD");
        showToast("✓ Data berhasil disinkronkan ke Supabase Cloud PostgreSQL!");
      } else if (res.syncedToServer) {
        setDbSource("SERVER_API");
        showToast("✓ Data tersimpan di Server Database (/api/pos)!");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-focus search input when entering cashier mode
  useEffect(() => {
    if (appMode === "CASHIER") {
      searchInputRef.current?.focus();
    }
  }, [appMode]);

  // Switch all cart items & default tier between Eceran and Grosir
  const handleSwitchGlobalPriceTier = (tier: PriceTier) => {
    setDefaultPriceTier(tier);
    setCart((prev) => prev.map((item) => ({ ...item, priceTier: tier })));
    showToast(`Mode harga diubah ke: Harga ${tier}`);
  };

  // When Buyer Type changes, automatically suggest corresponding price tier
  const handleSelectOrderType = (newOrderType: OrderType) => {
    setOrderType(newOrderType);
    if (newOrderType === "Agen Grosir" || newOrderType === "Peternak Mitra") {
      handleSwitchGlobalPriceTier("Grosir");
    } else {
      handleSwitchGlobalPriceTier("Eceran");
    }
  };

  // Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryType, number> = {
      Semua: products.length,
      "Pakan Ayam/Unggas": 0,
      "Pakan Burung": 0,
      "Pakan Ikan": 0,
      "Pakan Hewan Peliharaan": 0,
      "Vitamin & Obat": 0,
      "Alat Ternak": 0,
    };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered Products for Right Panel
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "Semua" || p.category === activeCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, activeCategory, searchQuery]);

  // Cart Calculations
  const cartSummary = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;
    let totalItemsCount = 0;

    cart.forEach((item) => {
      grossSubtotal += getCartItemGrossTotal(item);
      totalDiscount += item.discountItem;
      totalItemsCount += item.qty;
    });

    const netAfterDiscount = Math.max(0, grossSubtotal - totalDiscount);
    const taxAmount = enableTax ? Math.round(netAfterDiscount * 0.1) : 0;
    const grandTotal = netAfterDiscount + taxAmount;

    return {
      subtotal: grossSubtotal,
      totalDiscount,
      taxAmount,
      grandTotal,
      totalItemsCount,
    };
  }, [cart, enableTax]);

  const nextInvoiceNo = useMemo(() => {
    const seq = String(transactions.length + 1).padStart(3, "0");
    return `INV-20261108-${seq}`;
  }, [transactions.length]);

  const handleAddToCart = (product: Product, qtyToAdd = 1) => {
    if (!product.isAvailable || product.stock <= 0) {
      showToast(`Maaf, stok "${product.name}" sedang habis!`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          (item.priceTier || "Eceran") === defaultPriceTier &&
          item.note === "" &&
          item.modifiers.length === 0 &&
          item.discountItem === 0
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        const newQty = Math.min(product.stock, currentItem.qty + qtyToAdd);
        updated[existingIndex] = { ...currentItem, qty: newQty };
        return updated;
      }

      return [
        ...prev,
        {
          cartItemId: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          product,
          qty: Math.min(product.stock, qtyToAdd),
          priceTier: defaultPriceTier,
          discountItem: 0,
          note: "",
          modifiers: [],
          batchNumber: 1,
        },
      ];
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      const exactSku = products.find((p) => p.sku.toLowerCase() === q);
      const targetProd = exactSku || filteredProducts[0];
      if (targetProd) {
        handleAddToCart(targetProd, barcodeQuickQty);
        showToast(`✓ Barcode ${targetProd.sku}: +${barcodeQuickQty} ${targetProd.name}`);
        setSearchQuery("");
        setBarcodeQuickQty(1);
      } else {
        showToast(`Produk / Barcode "${searchQuery}" tidak ditemukan`);
      }
    }
  };

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.stock) {
            showToast(`Stok maksimal ${item.product.name} tersisa ${item.product.stock}`);
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleToggleItemPriceTier = (cartItemId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const nextTier: PriceTier =
          item.priceTier === "Grosir" ? "Eceran" : "Grosir";
        return { ...item, priceTier: nextTier };
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleSaveItemCustomization = (
    cartItemId: string,
    updates: {
      note: string;
      discountItem: number;
      modifiers: ProductModifier[];
      qty: number;
      priceTier: PriceTier;
    }
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, ...updates } : item
      )
    );
    showToast("Pengaturan harga & kemasan pakan berhasil disimpan");
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) {
      showToast("Keranjang belanja pakan masih kosong!");
      return;
    }
    const newHeld: HeldOrder = {
      id: `hold-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customerName: `${customerName} (${orderType})`,
      waiterName,
      tableNumber,
      orderType,
      globalNote,
      items: cart,
    };
    setHeldOrders((prev) => [newHeld, ...prev]);
    setCart([]);
    setGlobalNote("");
    setMobileTab("CATALOG");
    showToast(`Nota disimpan sementara ke Pending Orders (${customerName})`);
  };

  const handleResumeHeldOrder = (order: HeldOrder) => {
    setCart(order.items);
    setWaiterName(order.waiterName);
    setTableNumber(order.tableNumber);
    setOrderType(order.orderType);
    setGlobalNote(order.globalNote);
    setHeldOrders((prev) => prev.filter((h) => h.id !== order.id));
    setMobileTab("CART");
    showToast(`Nota "${order.customerName}" dipanggil kembali ke kasir`);
  };

  const handleDeleteHeldOrder = (id: string) => {
    setHeldOrders((prev) => prev.filter((h) => h.id !== id));
  };

  const handleConfirmPayment = (
    method: PaymentMethod,
    amountPaid: number,
    changeAmount: number
  ): Transaction => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      invoiceNo: nextInvoiceNo,
      createdAt: new Date().toISOString(),
      cashierName,
      waiterName,
      customerName,
      tableNumber,
      orderType,
      globalNote,
      items: cart,
      subtotal: cartSummary.subtotal,
      totalDiscount: cartSummary.totalDiscount,
      taxAmount: cartSummary.taxAmount,
      grandTotal: cartSummary.grandTotal,
      paymentMethod: method,
      amountPaid,
      changeAmount,
    };

    setProducts((prevProds) =>
      prevProds.map((p) => {
        const soldQty = cart
          .filter((ci) => ci.product.id === p.id)
          .reduce((acc, ci) => acc + ci.qty, 0);
        if (soldQty === 0) return p;
        const nextStock = Math.max(0, p.stock - soldQty);
        return {
          ...p,
          stock: nextStock,
          isAvailable: nextStock > 0 ? p.isAvailable : false,
        };
      })
    );

    setTransactions((prev) => [newTx, ...prev]);
    setActivePrintTx(newTx);
    setCart([]);
    setGlobalNote("");
    setOrderPhotoAttached(null);
    setMobileTab("CATALOG");
    return newTx;
  };

  const handleSaveProduct = (
    productData: Omit<Product, "id">,
    existingId?: string
  ) => {
    if (existingId) {
      setProducts((prev) =>
        prev.map((p) => (p.id === existingId ? { ...productData, id: existingId } : p))
      );
      setCart((prev) =>
        prev.map((ci) =>
          ci.product.id === existingId
            ? { ...ci, product: { ...productData, id: existingId } }
            : ci
        )
      );
      showToast(`Produk "${productData.name}" berhasil diperbarui`);
    } else {
      const newProd: Product = {
        ...productData,
        id: `prod-${Date.now()}`,
      };
      setProducts((prev) => [newProd, ...prev]);
      showToast(`Produk pakan "${newProd.name}" ditambahkan ke katalog`);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((ci) => ci.product.id !== productId));
    showToast("Produk dihapus dari katalog");
  };

  const handleToggleProductAvailability = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
      )
    );
  };

  const handleReprintTransaction = (
    tx: Transaction,
    paper: PrintPaperType = "dot-matrix"
  ) => {
    setActivePrintTx(tx);
    setActivePrintPaper(paper);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.HELD_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CART);
    setProducts(INITIAL_PRODUCTS);
    setCart([]);
    setHeldOrders([]);
    setTransactions(INITIAL_TRANSACTIONS);
    setActivePrintTx(INITIAL_TRANSACTIONS[INITIAL_TRANSACTIONS.length - 1]);
    setSidebarOpen(false);
    showToast("Data Katalog Pakan CV Banong Farms berhasil di-reset");
  };

  return (
    <div
      className={`font-sans flex flex-col bg-slate-100 ${
        appMode === "CASHIER" ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"
      }`}
    >
      {/* =====================================================================
          1A. TOP NAVIGATION BAR (CLEAN, SLIM 56PX-64PX, MODERN INDONESIAN POS)
      ====================================================================== */}
      <header className="no-print shrink-0 z-30 h-14 sm:h-16 bg-white text-slate-800 border-b border-slate-200 px-2.5 sm:px-5 flex items-center justify-between shadow-2xs">
        {/* Left Side: Sidebar Toggle + Brand Identity + Online Indicator */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle Menu Sidebar"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Official CV Banong Farms Logo & Brand Label */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1.5 ring-emerald-600/30 bg-emerald-700">
              <img
                src="/logo-banong-farm.png"
                alt="Logo CV Banong Farms"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-slate-900 text-xs sm:text-base tracking-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                  CV Banong Farms
                </span>
                <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Grosir &amp; Eceran
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:inline truncate">
                Pakan Ternak, Unggas &amp; Pet Shop
              </span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Segmented Mode Switcher (Visible on lg and above) */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {/* Untuk Kasir: HANYA Kasir & Katalog Produk */}
          {authUser?.role !== "OWNER" && (
            <>
              <button
                type="button"
                onClick={() => setAppMode("CASHIER")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  appMode === "CASHIER"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Kasir</span>
              </button>

              <button
                type="button"
                onClick={() => setAppMode("CATALOG_MGMT")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  appMode === "CATALOG_MGMT"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Kelola & Lihat Detail Katalog Produk"
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Katalog Produk</span>
              </button>
            </>
          )}

          {/* Untuk Admin / Pemilik: HANYA Dashboard Admin, Laporan Penjualan, Manajemen Karyawan */}
          {authUser?.role === "OWNER" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setAppMode("OWNER");
                  setOwnerActiveTab("DASHBOARD");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  appMode === "OWNER" && ownerActiveTab === "DASHBOARD"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Buka Ringkasan Dashboard Admin"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
                <span>Dashboard Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAppMode("OWNER");
                  setOwnerActiveTab("SALES_REPORT");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  appMode === "OWNER" && ownerActiveTab === "SALES_REPORT"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Buka Laporan Penjualan & Riwayat Lengkap"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Laporan Penjualan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAppMode("OWNER");
                  setOwnerActiveTab("EMPLOYEES");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  appMode === "OWNER" && ownerActiveTab === "EMPLOYEES"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Kelola Akun Karyawan & Hak Akses"
              >
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Manajemen Karyawan</span>
              </button>
            </>
          )}

          {/* Menu Riwayat Transaksi (Dapat diakses oleh Admin & Kasir) */}
          <button
            type="button"
            onClick={() => setAppMode("TRANSACTIONS")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              appMode === "TRANSACTIONS"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Riwayat Transaksi & Cetak Nota Belanja"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Riwayat Transaksi</span>
          </button>
        </div>

        {/* Center: Mobile Mode / Tab Switcher (Visible on < lg screens) */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          {authUser?.role !== "OWNER" && appMode === "CASHIER" && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMobileTab("CATALOG")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  mobileTab === "CATALOG"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Katalog</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("CART")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  mobileTab === "CART"
                    ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Nota</span>
                {cart.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      mobileTab === "CART"
                        ? "bg-white text-emerald-800"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                )}
              </button>
            </div>
          )}

          {appMode !== "CASHIER" && (
            <span className="text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
              {appMode === "OWNER"
                ? "Admin"
                : appMode === "CATALOG_MGMT"
                ? "Katalog"
                : "Riwayat"}
            </span>
          )}
        </div>

        {/* Right Side: Notification Icon, Single Active Cashier Name, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Notification / Pending Orders Icon with Badge (Hanya untuk Kasir) */}
          {authUser?.role !== "OWNER" && (
            <button
              type="button"
              onClick={() => setIsPendingModalOpen(true)}
              title="Daftar Nota Pakan Tersimpan (Hold / Pending Orders)"
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              {heldOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {heldOrders.length}
                </span>
              )}
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Active Cashier Display (Single, clean, no duplicate text) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[140px]">
                {authUser ? authUser.fullName : cashierName}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                {authUser?.role === "OWNER" ? "Pemilik" : "Kasir Aktif"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              title="Keluar dari Sesi Akun (Logout)"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 transition flex items-center gap-1.5 text-xs font-bold min-w-[36px] min-h-[36px] justify-center"
            >
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Collapsible Navigation Sidebar Drawer */}
      {sidebarOpen && (
        <div className="no-print fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-80 bg-white text-slate-800 h-full flex flex-col justify-between p-5 shadow-2xl border-r border-slate-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <HpLogo size="sm" showText={true} darkText={true} />
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Tutup menu sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5 text-sm font-bold">
                {/* 1. Menu Kasir (Point of Sale) - HANYA untuk Kasir */}
                {authUser?.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppMode("CASHIER");
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                      appMode === "CASHIER"
                        ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-700/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Store className="w-5 h-5" />
                    <span>Kasir (Point of Sale)</span>
                  </button>
                )}

                {/* 2. Menu Dashboard Admin, Laporan Penjualan, Manajemen Karyawan (HANYA untuk Admin / Pemilik) */}
                {authUser?.role === "OWNER" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAppMode("OWNER");
                        setOwnerActiveTab("DASHBOARD");
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                        appMode === "OWNER" && ownerActiveTab === "DASHBOARD"
                          ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-700/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAppMode("OWNER");
                        setOwnerActiveTab("SALES_REPORT");
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                        appMode === "OWNER" && ownerActiveTab === "SALES_REPORT"
                          ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-700/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                      <span>Laporan Penjualan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAppMode("OWNER");
                        setOwnerActiveTab("EMPLOYEES");
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                        appMode === "OWNER" && ownerActiveTab === "EMPLOYEES"
                          ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-700/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      <span>Manajemen Karyawan</span>
                    </button>
                  </>
                )}

                {/* 3. Menu Katalog Produk - HANYA untuk Kasir */}
                {authUser?.role !== "OWNER" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppMode("CATALOG_MGMT");
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                      appMode === "CATALOG_MGMT"
                        ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-700/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Package className="w-5 h-5 text-emerald-600" />
                    <span>Katalog Produk</span>
                  </button>
                )}

                {/* 4. Menu Riwayat Transaksi (Dapat diakses oleh Admin & Kasir) */}
                <button
                  type="button"
                  onClick={() => {
                    setAppMode("TRANSACTIONS");
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                    appMode === "TRANSACTIONS"
                      ? "bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-700/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>Riwayat Transaksi</span>
                </button>
              </nav>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              {authUser && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 truncate">
                      {authUser.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {authUser.role === "OWNER" ? "Pemilik" : "Kasir"}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate">{authUser.email}</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleResetDemo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Reset Katalog Awal</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-extrabold transition border border-rose-200/80"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Sign Out)</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center font-medium">
                CV Banong Farms POS
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          MAIN WORKSPACE: MODE KASIR VS DASHBOARD PEMILIK VS KATALOG PRODUK
      ====================================================================== */}
      {appMode === "OWNER" ? (
        <main className="no-print flex-1 overflow-y-auto">
          <OwnerDashboard
            transactions={transactions}
            products={products}
            activeTab={ownerActiveTab}
            onChangeTab={setOwnerActiveTab}
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
      ) : appMode === "CATALOG_MGMT" ? (
        <main className="no-print flex-1 overflow-y-auto bg-slate-100">
          <ProductCatalogView
            products={products}
            onOpenAddProduct={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            onOpenEditProduct={(prod) => {
              setEditingProduct(prod);
              setIsProductModalOpen(true);
            }}
            onDeleteProduct={handleDeleteProduct}
            onToggleProductAvailability={handleToggleProductAvailability}
            onBackToCashier={() => setAppMode("CASHIER")}
          />
        </main>
      ) : appMode === "TRANSACTIONS" ? (
        <main className="no-print flex-1 overflow-y-auto bg-slate-100">
          <TransactionHistoryView
            transactions={transactions}
            onPrintReceipt={handleReprintTransaction}
            onBackToCashier={() => {
              if (authUser?.role === "OWNER") {
                setAppMode("OWNER");
              } else {
                setAppMode("CASHIER");
              }
            }}
          />
        </main>
      ) : (
        /* ===================================================================
           1B. AREA KASIR UTAMA (MODERN SPLIT-SCREEN POS: 62% KATALOG | 38% NOTA)
        =================================================================== */
        <main className="no-print flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#F4F6F8] relative">
          {/* -----------------------------------------------------------------
              PANEL KIRI: AREA KATALOG PRODUK PAKAN & PERTANIAN (62% - lg:col-span-7 xl:col-span-8)
          ------------------------------------------------------------------ */}
          <section className={`lg:col-span-7 xl:col-span-8 bg-[#F4F6F8] flex flex-col h-full min-h-0 overflow-hidden border-r border-slate-200 ${
            mobileTab === "CATALOG" ? "flex" : "hidden lg:flex"
          }`}>
            {/* Top Search Bar + Add Product + Category Pills */}
            <div className="px-3 sm:px-4 lg:px-6 pt-3 pb-2 space-y-2 shrink-0 bg-white border-b border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Cari nama produk pakan, pupuk, atau obat..."
                    className="w-full min-h-[42px] pl-9 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick "+ Tambah Produk" Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                  className="min-h-[42px] px-3 sm:px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xs shrink-0 transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Tambah Produk</span>
                  <span className="sm:hidden">Tambah</span>
                </button>
              </div>

              {/* Filter Kategori Pakan (Scrollable Horizontal Bar without cut-off) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border transition ${
                        isActive
                          ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {isActive && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                      <span>
                        {cat} <span className="opacity-65 text-[11px]">({count})</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle Area: Scrollable Product Cards Grid (Clean Continuous POS Tiles) */}
            <div className="flex-1 min-h-0 px-2.5 sm:px-4 lg:px-5 py-3 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="h-64 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center p-6 shadow-2xs">
                  <PackageSearch className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-base font-bold text-slate-700">
                    Produk tidak ditemukan pada kategori atau kata kunci ini.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Coba periksa ejaan SKU atau pilih kategori &quot;Semua&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("Semua");
                      setSearchQuery("");
                    }}
                    className="mt-3.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Tampilkan Semua Produk
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 pb-24 lg:pb-8">
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock > 0 && product.stock <= 5;
                    const isOut = !product.isAvailable || product.stock <= 0;
                    const inCartQty = cart
                      .filter((c) => c.product.id === product.id)
                      .reduce((sum, c) => sum + c.qty, 0);

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleAddToCart(product);
                          }
                        }}
                        className={`group relative bg-white rounded-2xl p-2.5 sm:p-4 border transition-all select-none flex flex-col justify-between cursor-pointer active:scale-[0.99] ${
                          isOut
                            ? "opacity-55 border-slate-200 bg-slate-50 cursor-not-allowed"
                            : inCartQty > 0
                            ? "border-emerald-600 ring-2 ring-emerald-600/20 shadow-md"
                            : "border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300"
                        }`}
                      >
                        {/* Top: Photo with Overlaid Category & Stock Badges */}
                        <div className="relative w-full aspect-[4/3] sm:h-36 md:h-40 rounded-xl overflow-hidden bg-slate-100 mb-2 shrink-0">
                          <img
                            src={resolveProductImage(product)}
                            alt={product.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                PRODUCT_IMAGES.purAyamEceran;
                            }}
                          />

                          {/* Category Badge (Top-Left Pill) */}
                          <span className="absolute top-2 left-2 max-w-[65%] truncate bg-black/70 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md tracking-wider shadow-xs">
                            {product.category === "Pakan Ayam/Unggas"
                              ? "Ayam"
                              : product.category}
                          </span>

                          {/* Stock Badge (Top-Right Pill) */}
                          <span
                            className={`absolute top-2 right-2 text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md shadow-xs ${
                              isOut
                                ? "bg-slate-900/90 text-white"
                                : isLowStock
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-white/95 text-slate-800"
                            }`}
                          >
                            {isOut ? "Habis" : `Stok: ${product.stock}`}
                          </span>

                          {/* Edit Pencil Icon (Bottom-Left on Image hover) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(product);
                              setIsProductModalOpen(true);
                            }}
                            title="Edit Detail Produk"
                            className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* In-Cart Quantity Indicator */}
                          {inCartQty > 0 && (
                            <div className="absolute bottom-2 right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                              {inCartQty}
                            </div>
                          )}
                        </div>

                        {/* Bottom Info: Title + Price on Left | Circular Action Plus Button on Right */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 pb-0.5 px-0.5 min-w-0 shrink-0">
                          <div className="flex-1 min-w-0 space-y-0.5 text-left">
                            <h3
                              className="font-extrabold text-xs sm:text-[13px] text-slate-900 leading-tight truncate"
                              title={product.name}
                            >
                              {product.name}
                            </h3>

                            <div className="flex items-baseline gap-1">
                              <span className="text-xs sm:text-base font-black text-slate-900 tabular-nums">
                                {formatRupiah(product.sellPrice)}
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">
                                /{product.unit || "Kg"}
                              </span>
                            </div>
                          </div>

                          {/* Circular Plus Button (Always Fully Visible & Centered) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                            disabled={isOut}
                            title="Tambahkan ke Keranjang"
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E07A5F] hover:bg-[#d0694e] text-white flex items-center justify-center shadow-xs shrink-0 active:scale-90 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Bottom Checkout Bar (HANYA MUNCUL DI HP / MOBILE SAAT ADA BARANG DI NOTA) */}
            {cart.length > 0 && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.12)] safe-area-bottom">
                <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                        {cart.reduce((sum, item) => sum + item.qty, 0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Total Tagihan
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums truncate block">
                        {formatRupiah(cartSummary.grandTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileTab("CART")}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-700/20 shrink-0 transition cursor-pointer"
                  >
                    <span>Buka Nota &amp; Bayar</span>
                    <span className="text-emerald-200 font-bold">&rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        
          {/* -----------------------------------------------------------------
              PANEL KANAN: AREA NOTA / KERANJANG KASIR (38% - lg:col-span-5 xl:col-span-4)
              DESAIN STRUK KASIR PROFESIONAL & SATU-SATUNYA TEMPAT AKSI BAYAR
          ------------------------------------------------------------------ */}
          <section className={`lg:col-span-5 xl:col-span-4 bg-white flex flex-col h-full min-h-0 overflow-hidden shadow-xs border-l border-slate-200 ${
            mobileTab === "CART" ? "flex" : "hidden lg:flex"
          }`}>
            {/* Mobile Top Bar to go back to Catalog */}
            <div className="lg:hidden px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab("CATALOG")}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-200 hover:text-white active:scale-95 transition"
              >
                <span>&larr;</span>
                <span>Kembali ke Katalog Produk</span>
              </button>
              <span className="text-[11px] font-bold text-slate-400">
                {cart.reduce((sum, item) => sum + item.qty, 0)} Barang di Nota
              </span>
            </div>

            {/* 1. Header Keranjang: Bersih & Minimalis */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-extrabold text-slate-800">Keranjang Belanja</h2>
                {cart.length > 0 && (
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {cart.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                )}
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    showToast("Keranjang belanja dikosongkan");
                  }}
                  title="Kosongkan Keranjang"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* 2. Scrollable Cart Items List (Spacious & Clean Layout) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <Store className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-700">
                    Keranjang Belanja Kosong
                  </p>
                  <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                    Pilih produk dari katalog di sebelah kiri untuk menambah ke nota transaksi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMobileTab("CATALOG")}
                    className="lg:hidden mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    Buka Katalog Produk
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <CartItemRow
                    key={item.cartItemId}
                    item={item}
                    onUpdateQty={handleUpdateQty}
                    onTogglePriceTier={handleToggleItemPriceTier}
                    onRemove={handleRemoveCartItem}
                    onCustomize={setCustomizingItem}
                  />
                ))
              )}
            </div>

            {/* 3. Sticky Payment Footer (THE ONLY PLACE FOR PAYMENT & SIMPAN ACTIONS) */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-2 shrink-0 safe-area-bottom">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-extrabold text-slate-800">Keranjang Belanja</h2>
                {cart.length > 0 && (
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {cart.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                )}
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    showToast("Keranjang belanja dikosongkan");
                  }}
                  title="Kosongkan Keranjang"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* 2. Scrollable Cart Items List (Spacious & Clean Layout) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <Store className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-700">
                    Keranjang Belanja Kosong
                  </p>
                  <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                    Pilih produk dari katalog di sebelah kiri untuk menambah ke nota transaksi.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <CartItemRow
                    key={item.cartItemId}
                    item={item}
                    onUpdateQty={handleUpdateQty}
                    onTogglePriceTier={handleToggleItemPriceTier}
                    onRemove={handleRemoveCartItem}
                    onCustomize={setCustomizingItem}
                  />
                ))
              )}
            </div>

            {/* 3. Sticky Payment Footer (THE ONLY PLACE FOR PAYMENT & SIMPAN ACTIONS) */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-2 shrink-0">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} barang)</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRupiah(cartSummary.subtotal)}
                  </span>
                </div>

                {cartSummary.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Total Potongan Diskon</span>
                    <span className="tabular-nums">
                      -{formatRupiah(cartSummary.totalDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={enableTax}
                      onChange={(e) => setEnableTax(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span>PPN Faktur (opsional)</span>
                  </label>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {enableTax ? formatRupiah(cartSummary.taxAmount) : "Rp 0"}
                  </span>
                </div>
              </div>

              {/* Total Tagihan Box */}
              <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    Total Tagihan
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {cart.length} item di nota
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-slate-950 tabular-nums block">
                    {formatRupiah(cartSummary.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Two Prominent Action Buttons */}
              <div className="grid grid-cols-12 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0}
                  className="col-span-4 min-h-[48px] py-2.5 px-3 rounded-xl border-2 border-amber-300 bg-amber-50/70 hover:bg-amber-100 disabled:opacity-40 text-amber-900 font-extrabold text-xs sm:text-sm transition active:scale-[0.99] text-center"
                >
                  Simpan Nota
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={cart.length === 0}
                  className="col-span-8 min-h-[48px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm sm:text-base shadow-md shadow-emerald-700/20 transition active:scale-[0.99] text-center flex items-center justify-center gap-2"
                >
                  <span>Bayar Sekarang</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* =====================================================================
          MODALS (PAYMENT, ITEM CUSTOMIZATION, PRODUCT CRUD, PENDING ORDERS)
      ====================================================================== */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        cart={cart}
        grandTotal={cartSummary.grandTotal}
        subtotal={cartSummary.subtotal}
        totalDiscount={cartSummary.totalDiscount}
        taxAmount={cartSummary.taxAmount}
        nextInvoiceNo={nextInvoiceNo}
        onConfirmPayment={handleConfirmPayment}
        activePrintPaper={activePrintPaper}
        onPaperChange={setActivePrintPaper}
        onPrintReceipt={handleReprintTransaction}
      />

      <ItemCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onSave={handleSaveItemCustomization}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        editingProduct={editingProduct}
        onClose={() => setIsProductModalOpen(false)}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      <PendingOrdersModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeHeldOrder}
        onDeleteHeldOrder={handleDeleteHeldOrder}
      />

      <CloudDbModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        dbSource={dbSource}
        isSyncing={isSyncing}
        onTriggerSync={handleManualCloudSync}
      />

      {/* =====================================================================
          DEDICATED PRINT ENGINE CONTAINER (ONLY VISIBLE IN @media print)
      ====================================================================== */}
      <div id="print-only-root" aria-hidden="true">
        <ReceiptPrint transaction={activePrintTx} paperSize={activePrintPaper} />
      </div>
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENT: CART ITEM ROW (WITH GROSIR/ECERAN & KEMASAN CONTROLS)
============================================================================ */
interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onTogglePriceTier: (cartItemId: string) => void;
  onRemove: (cartItemId: string) => void;
  onCustomize: (item: CartItem) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onUpdateQty,
  onTogglePriceTier,
  onRemove,
  onCustomize,
}) => {
  const unitBasePrice = getCartItemUnitBasePrice(item);
  const baseLinePrice = unitBasePrice * item.qty;
  const isGrosir = item.priceTier === "Grosir";

  return (
    <div className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2 transition">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onCustomize(item)}
          className="text-left font-bold text-sm text-slate-900 hover:text-emerald-700 transition leading-snug line-clamp-2"
        >
          {item.product.name}
        </button>
        <span className="font-extrabold text-sm text-slate-900 shrink-0 tabular-nums">
          {formatRupiah(baseLinePrice)}
        </span>
      </div>

      {/* Price Per Unit */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="tabular-nums font-semibold">
          @ {formatRupiah(unitBasePrice)} / {item.product.unit || "Unit"}
        </span>
      </div>

      {(item.discountItem > 0 || item.modifiers.length > 0 || item.note) && (
        <div className="space-y-1 text-xs pt-1 border-t border-dashed border-slate-100">
          {item.discountItem > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Potongan Diskon</span>
              <span className="text-rose-600 font-bold tabular-nums">
                -{formatRupiah(item.discountItem)}
              </span>
            </div>
          )}

          {item.modifiers.map((mod) => (
            <div key={mod.id} className="flex justify-between text-slate-600">
              <span>
                • {item.qty}x {mod.name}
              </span>
              <span className="font-semibold tabular-nums">
                {mod.price > 0 ? formatRupiah(mod.price * item.qty) : "Standar"}
              </span>
            </div>
          ))}

          {item.note && (
            <div className="text-slate-600 font-medium">Ket: {item.note}</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => onCustomize(item)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition"
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Ubah Kemasan / Diskon</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateQty(item.cartItemId, -1)}
            aria-label="Kurangi jumlah"
            className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-7 text-center text-sm font-extrabold text-slate-900 tabular-nums">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(item.cartItemId, 1)}
            aria-label="Tambah jumlah"
            className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-800 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.cartItemId)}
            aria-label="Hapus item"
            className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
