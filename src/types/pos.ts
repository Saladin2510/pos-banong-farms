export type CategoryType =
  | "Semua"
  | "Pakan Ayam/Unggas"
  | "Pakan Burung"
  | "Pakan Ikan"
  | "Pakan Hewan Peliharaan"
  | "Vitamin & Obat"
  | "Alat Ternak";

export type PriceTier = "Eceran" | "Grosir";

export interface ProductModifier {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Exclude<CategoryType, "Semua">;
  sellPrice: number; // Harga Eceran
  wholesalePrice?: number; // Harga Grosir
  unit?: string; // e.g., "1 Kg", "Sak 50 Kg", "Bungkus", "Botol", "Set"
  costPrice: number;
  stock: number;
  image: string;
  isAvailable: boolean;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  qty: number;
  priceTier?: PriceTier;
  discountItem: number; // nominal discount
  note: string;
  modifiers: ProductModifier[]; // digunakan untuk pilihan kemasan / layanan tambahan (misal: + Karung Plastik, Kemasan 5 Kg, dll.)
  batchNumber?: number;
}

export type OrderType = "Eceran Umum" | "Peternak Mitra" | "Agen Grosir";

export type PaymentMethod = "Tunai" | "QRIS" | "Transfer Bank";

export interface HeldOrder {
  id: string;
  createdAt: string;
  customerName: string;
  waiterName: string; // Kasir / Sales
  tableNumber: string; // Metode Pengiriman (Ambil di Toko / Diantar Armada / Ekspedisi)
  orderType: OrderType; // Tipe Pembeli (Eceran Umum / Peternak Mitra / Agen Grosir)
  globalNote: string;
  items: CartItem[];
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  createdAt: string;
  cashierName: string;
  waiterName: string;
  customerName: string;
  tableNumber: string; // Metode Pengiriman
  orderType: OrderType; // Tipe Pembeli
  globalNote: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
}
