import React from "react";
import { Transaction } from "@/types/pos";
import { STORE_INFO } from "@/data/initialData";
import {
  formatDateTimeID,
  formatRupiah,
  formatTerbilang,
  getCartItemNetTotal,
  getCartItemUnitBasePrice,
} from "@/utils/format";
import { HpLogo } from "./HpLogo";

export type PrintPaperType = "dot-matrix" | "80mm" | "58mm";

interface ReceiptPrintProps {
  transaction: Transaction | null;
  paperSize?: PrintPaperType;
  className?: string;
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  transaction,
  paperSize = "dot-matrix",
  className = "",
}) => {
  if (!transaction) return null;

  // Calculate total kilograms and total packages
  let totalKg = 0;
  let totalPcs = 0;
  transaction.items.forEach((it) => {
    totalPcs += it.qty;
    const unitLower = (it.product.unit || "").toLowerCase();
    if (unitLower.includes("sak") || unitLower.includes("50")) {
      totalKg += it.qty * 50;
    } else if (unitLower.includes("kg")) {
      totalKg += it.qty * 1;
    } else if (unitLower.includes("bungkus") || unitLower.includes("bks")) {
      totalKg += it.qty * 0.5;
    } else {
      totalKg += it.qty * 1;
    }
  });

  const invoiceChars = transaction.invoiceNo.split("");
  const customerDisplay = transaction.customerName || "Pembeli Umum";
  const plateDisplay = transaction.globalNote?.toUpperCase().includes("PLAT")
    ? transaction.globalNote.toUpperCase()
    : transaction.tableNumber || "R 8522 OC (Armada Toko)";

  // --------------------------------------------------------------------------
  // 1. FORMAT FAKTUR CONTINUOUS FORM UNTUK PRINTER DOT MATRIX (SPC SQ 300)
  // Desain sesuai standar faktur timbangan pakan ternak (New Hope / Charoen Pokphand)
  // --------------------------------------------------------------------------
  if (paperSize === "dot-matrix") {
    return (
      <div
        id="printable-receipt"
        className={`bg-white text-black font-mono text-[11px] leading-tight p-4 mx-auto w-full max-w-[215mm] border border-black/80 ${className}`}
        style={{
          fontFamily: "'Courier New', Courier, Consolas, monospace",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Header Perusahaan: Dot Matrix Title */}
        <div className="border-b-2 border-black pb-2 mb-2 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-wider uppercase">
                {STORE_INFO.name} ({STORE_INFO.legalName})
              </span>
            </div>
            <p className="text-[10px] font-bold text-black uppercase tracking-wider">
              Grosir &amp; Eceran Pakan Ternak, Unggas, Ikan &amp; Pet Shop
            </p>
            <p className="text-[9px] text-black">
              {STORE_INFO.address} | Telp/WA: {STORE_INFO.phone}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block border border-black px-2 py-0.5 text-xs font-black uppercase tracking-widest bg-white">
              FAKTUR &amp; SURAT JALAN
            </span>
            <p className="text-[10px] font-bold mt-1">
              Printer: SPC SQ 300 (Continuous)
            </p>
          </div>
        </div>

        {/* Top Meta Info: Box Grid (Match New Hope Sales Weighing Slip) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-black text-[10px] mb-2 divide-x divide-y sm:divide-y-0 divide-black">
          <div className="p-1.5 space-y-0.5">
            <span className="block font-bold text-gray-700 uppercase text-[9px]">Weigh NO / No. Faktur:</span>
            <strong className="block text-xs font-black tracking-wider">{transaction.invoiceNo}</strong>
          </div>
          <div className="p-1.5 space-y-0.5">
            <span className="block font-bold text-gray-700 uppercase text-[9px]">Date / Tanggal:</span>
            <strong className="block text-xs font-black">{formatDateTimeID(transaction.createdAt)}</strong>
          </div>
          <div className="p-1.5 space-y-0.5">
            <span className="block font-bold text-gray-700 uppercase text-[9px]">Plate NO / No. Kendaraan:</span>
            <strong className="block text-xs font-black">{plateDisplay}</strong>
          </div>
          <div className="p-1.5 space-y-0.5">
            <span className="block font-bold text-gray-700 uppercase text-[9px]">Customer / Pembeli:</span>
            <strong className="block text-xs font-black truncate">{customerDisplay}</strong>
          </div>
        </div>

        {/* Tabel Rincian Barang Pakan (Line Items) */}
        <table className="w-full border-collapse border border-black text-[10px] mb-2">
          <thead>
            <tr className="border-b border-black bg-gray-100 font-black uppercase text-center">
              <th className="border border-black py-1 px-1.5 w-8">No</th>
              <th className="border border-black py-1 px-2 text-left">Kode / Barang Pakan</th>
              <th className="border border-black py-1 px-1.5 w-20">Kemasan</th>
              <th className="border border-black py-1 px-1.5 w-16 text-right">Qty</th>
              <th className="border border-black py-1 px-1.5 w-20 text-right">Est. Berat</th>
              <th className="border border-black py-1 px-2 text-right w-24">Harga (Rp)</th>
              <th className="border border-black py-1 px-1.5 text-right w-16">Diskon</th>
              <th className="border border-black py-1 px-2 text-right w-28">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {transaction.items.map((item, idx) => {
              const netLine = getCartItemNetTotal(item);
              const unitPrice = getCartItemUnitBasePrice(item);
              const itemKg = (item.product.unit || "").toLowerCase().includes("sak")
                ? item.qty * 50
                : item.qty * 1;

              return (
                <tr key={`${item.cartItemId}-${idx}`} className="border-b border-black">
                  <td className="border border-black py-1 px-1.5 text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="border border-black py-1 px-2">
                    <span className="font-black block">{item.product.name}</span>
                    <span className="text-[9px] text-gray-700 font-mono">SKU: {item.product.sku}</span>
                    {item.note && (
                      <span className="text-[9px] italic block text-gray-800">Ket: {item.note}</span>
                    )}
                  </td>
                  <td className="border border-black py-1 px-1.5 text-center">
                    {item.product.unit || "1 Kg"}
                  </td>
                  <td className="border border-black py-1 px-1.5 text-right font-black">
                    {item.qty}
                  </td>
                  <td className="border border-black py-1 px-1.5 text-right font-mono">
                    {itemKg} Kg
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-mono">
                    {formatRupiah(unitPrice).replace("Rp ", "")}
                  </td>
                  <td className="border border-black py-1 px-1.5 text-right text-gray-700 font-mono">
                    {item.discountItem > 0 ? formatRupiah(item.discountItem).replace("Rp ", "") : "-"}
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-black font-mono">
                    {formatRupiah(netLine).replace("Rp ", "")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Section Ringkasan Timbangan & Finansial (Mirip Format New Hope Sales Weighing) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 border border-black text-[10px] mb-2 divide-y sm:divide-y-0 sm:divide-x divide-black">
          {/* Kolom Kiri (7 cols): Data Timbangan Truk / Sak */}
          <div className="sm:col-span-7 p-2 space-y-1">
            <span className="font-black text-[9px] uppercase tracking-wider block border-b border-black pb-0.5 mb-1">
              Catatan Penimbangan &amp; Logistik Pakan:
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              <div>
                <span className="text-gray-700">Total Kuantitas: </span>
                <strong className="font-black">{totalPcs} Kemasan / Sak</strong>
              </div>
              <div>
                <span className="text-gray-700">Total Berat Bersih: </span>
                <strong className="font-black font-mono">{totalKg} Kg</strong>
              </div>
              <div>
                <span className="text-gray-700">Tipe Layanan: </span>
                <strong>{transaction.orderType}</strong>
              </div>
              <div>
                <span className="text-gray-700">Metode Bayar: </span>
                <strong className="uppercase">{transaction.paymentMethod} (LUNAS)</strong>
              </div>
            </div>

            <div className="pt-1.5 mt-1 border-t border-dashed border-black text-[9px]">
              <span className="font-bold">Terbilang: </span>
              <span className="italic font-bold uppercase">
                # {formatTerbilang(transaction.grandTotal)} #
              </span>
            </div>
          </div>

          {/* Kolom Kanan (5 cols): Rincian Pembayaran Faktur */}
          <div className="sm:col-span-5 p-2 space-y-1 bg-gray-50/50">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.totalDiscount > 0 && (
              <div className="flex justify-between text-black">
                <span>Potongan Diskon:</span>
                <span className="font-mono font-bold">-{formatRupiah(transaction.totalDiscount)}</span>
              </div>
            )}
            {transaction.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>PPN / Pajak:</span>
                <span className="font-mono font-bold">{formatRupiah(transaction.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-black pt-1 font-black text-xs">
              <span>TOTAL FAKTUR:</span>
              <span className="font-mono text-sm">{formatRupiah(transaction.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-[9px] pt-0.5">
              <span>Uang Diterima: {formatRupiah(transaction.amountPaid)}</span>
              <span>Kembalian: {formatRupiah(transaction.changeAmount)}</span>
            </div>
          </div>
        </div>

        {/* 4 Kolom Tanda Tangan & Stempel Resmi (Sesuai Gambar Timbangan New Hope) */}
        <div className="grid grid-cols-4 border border-black text-center text-[9px] mt-2 divide-x divide-black">
          <div className="p-1 flex flex-col justify-between h-20">
            <span className="font-bold uppercase">Penerima / Supir</span>
            <div className="text-[8px] text-gray-500 italic">(Tanda Tangan)</div>
            <span className="border-t border-black pt-0.5 font-bold uppercase truncate px-1">
              ( {customerDisplay.split(" ")[0]} )
            </span>
          </div>

          <div className="p-1 flex flex-col justify-between h-20">
            <span className="font-bold uppercase">Petugas Timbang</span>
            <div className="text-[8px] text-gray-500 italic">(Weigher)</div>
            <span className="border-t border-black pt-0.5 font-bold uppercase truncate px-1">
              ( {transaction.cashierName.split(" ")[0]} )
            </span>
          </div>

          <div className="p-1 flex flex-col justify-between h-20">
            <span className="font-bold uppercase">Kasir / Sales</span>
            <div className="text-[8px] text-gray-500 italic">(Penjualan)</div>
            <span className="border-t border-black pt-0.5 font-bold uppercase truncate px-1">
              ( {transaction.cashierName} )
            </span>
          </div>

          <div className="p-1 flex flex-col justify-between h-20 relative">
            <span className="font-bold uppercase">Disetujui / Cap</span>
            {/* Visual Circular Stamp CV Banong Farms */}
            <div className="w-11 h-11 rounded-full border-2 border-black/80 mx-auto flex items-center justify-center text-[6px] font-black uppercase text-center leading-none rotate-[-12deg] select-none opacity-85">
              BANONG<br/>FARMS<br/>LUNAS
            </div>
            <span className="border-t border-black pt-0.5 font-bold uppercase truncate px-1">
              ( Bagian Gudang )
            </span>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-2 pt-1 border-t border-dashed border-black flex justify-between text-[8px] text-gray-700">
          <span>* Lembar 1: Kantor/Kasir | Lembar 2: Supir/Customer | Lembar 3: Gudang</span>
          <span>Dicetak otomatis oleh Sistem PoS CV Banong Farms</span>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. FORMAT STRUK THERMAL MINI (80MM & 58MM)
  // Untuk printer kasir kas thermal bluetooth / roll kasir
  // --------------------------------------------------------------------------
  const is58mm = paperSize === "58mm";
  const widthClass =
    is58mm ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]";
  const paddingClass = is58mm ? "p-2.5 text-[10px]" : "p-4 text-xs";

  return (
    <div
      id="printable-receipt"
      className={`bg-white text-slate-900 font-mono mx-auto leading-snug ${widthClass} ${paddingClass} ${className}`}
      style={{
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Colored CV Banong Farms Logo Header */}
      <div className="flex flex-col items-center text-center border-b-2 border-dashed border-slate-300 pb-3 mb-2.5">
        <div className="mb-1.5 flex justify-center">
          <HpLogo size={is58mm ? "sm" : "md"} showText={false} />
        </div>
        <h1 className="font-sans font-black text-base tracking-tight text-slate-900">
          {STORE_INFO.name}
        </h1>
        <p className="font-sans text-[10px] font-bold text-slate-700">
          {STORE_INFO.legalName}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">{STORE_INFO.address}</p>
        <p className="text-[10px] text-slate-600">WA/Telp: {STORE_INFO.phone}</p>
      </div>

      {/* Meta Transaksi */}
      <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span className="text-slate-500">No. Nota:</span>
          <span className="font-bold text-slate-900">{transaction.invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Waktu:</span>
          <span>{formatDateTimeID(transaction.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Kasir / Sales:</span>
          <span className="font-semibold">{transaction.cashierName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tipe Pembeli:</span>
          <span className="font-bold">{transaction.orderType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Pengiriman:</span>
          <span className="font-semibold">{transaction.tableNumber || "Ambil di Toko"}</span>
        </div>
        {transaction.customerName && (
          <div className="flex justify-between">
            <span className="text-slate-500">Pembeli:</span>
            <span className="truncate max-w-[140px] font-semibold">
              {transaction.customerName}
            </span>
          </div>
        )}
      </div>

      {/* Tabel Rincian Barang Pakan */}
      <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
        <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-1.5">
          <span>Barang Pakan &amp; Qty</span>
          <span>Subtotal</span>
        </div>
        <div className="space-y-2">
          {transaction.items.map((item, idx) => {
            const netLine = getCartItemNetTotal(item);
            const unitPrice = getCartItemUnitBasePrice(item);
            return (
              <div key={`${item.cartItemId}-${idx}`} className="text-[11px]">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{item.product.name}</span>
                  <span>{formatRupiah(netLine)}</span>
                </div>
                <div className="text-[10px] text-slate-600 flex justify-between">
                  <span>
                    {item.qty} x {formatRupiah(unitPrice)}{" "}
                    {item.priceTier === "Grosir" ? "(Grosir)" : "(Eceran)"}
                  </span>
                  {item.discountItem > 0 && (
                    <span className="text-rose-600 font-semibold">
                      Diskon -{formatRupiah(item.discountItem)}
                    </span>
                  )}
                </div>
                {item.modifiers.length > 0 && (
                  <div className="pl-2 text-[10px] text-slate-600 space-y-0.5 mt-0.5">
                    {item.modifiers.map((mod) => (
                      <div key={mod.id} className="flex justify-between">
                        <span>+ {mod.name}</span>
                        <span>{mod.price > 0 ? formatRupiah(mod.price) : "Rp 0"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {item.note && (
                  <div className="pl-2 text-[10px] italic text-slate-500">
                    Ket: {item.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {transaction.globalNote && (
        <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-[10px]">
          <span className="font-bold text-slate-700">Catatan DO/Pengiriman: </span>
          <span className="italic text-slate-600">{transaction.globalNote}</span>
        </div>
      )}

      {/* Totals & Payment */}
      <div className="border-b-2 border-dashed border-slate-300 pb-2.5 mb-2.5 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-600">Subtotal</span>
          <span>{formatRupiah(transaction.subtotal)}</span>
        </div>
        {transaction.totalDiscount > 0 && (
          <div className="flex justify-between text-rose-600 font-medium">
            <span>Total Potongan Diskon</span>
            <span>-{formatRupiah(transaction.totalDiscount)}</span>
          </div>
        )}
        {transaction.taxAmount > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>PPN / Pajak</span>
            <span>{formatRupiah(transaction.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
          <span>GRAND TOTAL</span>
          <span>{formatRupiah(transaction.grandTotal)}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-slate-600">Metode Bayar</span>
          <span className="font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 text-[10px]">
            {transaction.paymentMethod}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Nominal Bayar</span>
          <span className="font-semibold">{formatRupiah(transaction.amountPaid)}</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900">
          <span>Kembalian (Change)</span>
          <span>{formatRupiah(transaction.changeAmount)}</span>
        </div>
      </div>

      {/* Footer & Verification Barcode */}
      <div className="text-center space-y-1.5 pt-1">
        <p className="font-sans font-bold text-[11px] text-slate-800">
          Terima Kasih Telah Berbelanja di CV Banong Farms!
        </p>
        <p className="font-sans text-[10px] text-slate-500">
          Barang yang sudah dibeli &amp; ditimbang telah diperiksa bersama.
        </p>

        <div className="pt-2 flex flex-col items-center">
          <svg
            width={is58mm ? "140" : "180"}
            height={is58mm ? "30" : "38"}
            viewBox="0 0 180 38"
            className="mx-auto"
            aria-label={`Barcode ${transaction.invoiceNo}`}
          >
            <rect width="180" height="38" fill="#ffffff" />
            {invoiceChars.map((ch, i) => {
              const code = ch.charCodeAt(0);
              const xBase = 8 + i * 10;
              const w1 = (code % 3) + 1.5;
              const w2 = ((code >> 2) % 2) + 1;
              return (
                <g key={i} fill="#0f172a">
                  <rect x={xBase} y="2" width={w1} height="28" />
                  <rect x={xBase + w1 + 2} y="2" width={w2} height="28" />
                </g>
              );
            })}
            <rect x="4" y="2" width="2" height="30" fill="#0f172a" />
            <rect x="174" y="2" width="2" height="30" fill="#0f172a" />
          </svg>
          <span className="text-[9px] tracking-[0.22em] text-slate-500 font-semibold mt-0.5">
            *{transaction.invoiceNo}*
          </span>
        </div>
      </div>
    </div>
  );
};
