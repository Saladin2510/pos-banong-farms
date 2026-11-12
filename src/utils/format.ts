import { CartItem } from "@/types/pos";

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat("id-ID").format(absVal);
  return `${isNegative ? "-" : ""}Rp ${formatted}`;
}

export function getCartItemUnitBasePrice(item: CartItem): number {
  if (item.priceTier === "Grosir" && item.product.wholesalePrice) {
    return item.product.wholesalePrice;
  }
  return item.product.sellPrice;
}

export function getCartItemModifiersTotal(item: CartItem): number {
  return item.modifiers.reduce((sum, mod) => sum + mod.price, 0);
}

export function getCartItemGrossTotal(item: CartItem): number {
  const unitWithModifiers =
    getCartItemUnitBasePrice(item) + getCartItemModifiersTotal(item);
  return unitWithModifiers * item.qty;
}

export function getCartItemNetTotal(item: CartItem): number {
  return Math.max(0, getCartItemGrossTotal(item) - item.discountItem);
}

export function formatDateTimeID(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTimeOnlyID(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTerbilang(num: number): string {
  const nominal = Math.abs(Math.floor(num));
  if (nominal === 0) return "Nol Rupiah";

  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  function bilang(n: number): string {
    if (n < 12) return satuan[n];
    if (n < 20) return `${bilang(n - 10)} Belas`;
    if (n < 100) return `${bilang(Math.floor(n / 10))} Puluh ${bilang(n % 10)}`.trim();
    if (n < 200) return `Seratus ${bilang(n - 100)}`.trim();
    if (n < 1000) return `${bilang(Math.floor(n / 100))} Ratus ${bilang(n % 100)}`.trim();
    if (n < 2000) return `Seribu ${bilang(n - 1000)}`.trim();
    if (n < 1000000) return `${bilang(Math.floor(n / 1000))} Ribu ${bilang(n % 1000)}`.trim();
    if (n < 1000000000)
      return `${bilang(Math.floor(n / 1000000))} Juta ${bilang(n % 1000000)}`.trim();
    if (n < 1000000000000)
      return `${bilang(Math.floor(n / 1000000000))} Miliar ${bilang(n % 1000000000)}`.trim();
    return `${bilang(Math.floor(n / 1000000000000))} Triliun ${bilang(n % 1000000000000)}`.trim();
  }

  return `${bilang(nominal)} Rupiah`;
}

export function formatAccountingNumber(amount: number): string {
  const absVal = Math.abs(amount || 0);
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatInvoiceDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}.${minutes}.${seconds}`;
  } catch {
    return isoString;
  }
}

export function formatInvoiceDueDate(isoString: string, daysAhead = 17): string {
  try {
    const d = new Date(isoString);
    d.setDate(d.getDate() + daysAhead);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

