import React from "react";
import { Transaction } from "@/types/pos";
import { STORE_INFO } from "@/data/initialData";
import {
  formatAccountingNumber,
  formatDateTimeID,
  formatInvoiceDateTime,
  formatInvoiceDueDate,
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

  // Calculate total quantity of items
  const totalItemQty = transaction.items.reduce((sum, it) => sum + it.qty, 0);

  const customerDisplay =
    transaction.customerName && transaction.customerName !== "Pembeli Umum"
      ? transaction.customerName
      : STORE_INFO.defaultCustomer;

  const addressDisplay =
    transaction.tableNumber && transaction.tableNumber !== "Ambil di Toko"
      ? transaction.tableNumber
      : STORE_INFO.defaultAddress;

  const cashierDisplay =
    transaction.cashierName?.split(" ")[0]?.toUpperCase() || "ADMIN";

  // --------------------------------------------------------------------------
  // 1. FORMAT FAKTUR PENJUALAN CONTINUOUS FORM (SPC SQ 300 / DOT MATRIX)
  // Desain 100% presisi sesuai standar faktur penjualan CV Fortuna Baru PS / Banong
  // --------------------------------------------------------------------------
  if (paperSize === "dot-matrix") {
    return (
      <div
        id="printable-receipt"
        className={`bg-white text-black text-[11px] sm:text-[12px] leading-tight p-4 sm:p-6 mx-auto w-full max-w-[215mm] border border-dashed border-slate-300 print:border-none print:p-0 ${className}`}
        style={{
          fontFamily:
            'Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif',
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* ===================================================================
            HEADER: LOGO & PERUSAHAAN (KIRI) | METADATA TRANSAKSI (KANAN)
        =================================================================== */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 pb-1">
          {/* Sisi Kiri: Logo Siluet Ternak + Header Perusahaan */}
          <div className="flex items-start gap-3">
            {/* Siluet Peternakan & Unggas (Rooster & Farm Cattle) */}
            <svg
              className="w-14 h-14 shrink-0 text-black fill-current"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Logo CV. Fortuna Baru PS"
            >
              {/* Burung Walet Terbang */}
              <path d="M10 22 C12 17, 16 18, 18 21 C20 18, 24 19, 26 22 C23 24, 21 26, 18 25 C16 27, 13 26, 10 22 Z" />
              <path d="M17 14 C19 11, 22 12, 23 14 C25 12, 28 13, 29 15 C27 16, 25 18, 23 17 C21 19, 19 18, 17 14 Z" />
              {/* Siluet Ayam / Jago */}
              <path d="M26 26 C25 21, 29 17, 34 19 C37 16, 42 17, 44 21 C48 19, 52 23, 50 27 C53 29, 55 34, 52 38 C56 37, 60 40, 58 45 C56 49, 51 51, 47 49 C45 53, 40 56, 36 54 C33 56, 28 54, 27 50 C24 50, 21 47, 22 43 C19 41, 18 36, 21 32 C23 29, 25 27, 26 26 Z" />
              {/* Siluet Sapi / Ternak Besar */}
              <path d="M28 50 C33 45, 42 44, 50 47 C58 50, 65 57, 68 65 C71 73, 68 81, 61 86 C55 90, 47 91, 41 87 C35 83, 30 76, 29 68 C27 63, 26 56, 28 50 Z" />
              <path
                d="M40 72 C42 70, 46 71, 48 74 C49 77, 47 81, 44 82 C41 83, 38 80, 38 77 C38 74, 39 73, 40 72 Z"
                fill="#ffffff"
              />
            </svg>

            <div className="space-y-0.5 leading-tight">
              <h1 className="text-base sm:text-lg font-black tracking-normal uppercase text-black">
                FAKTUR PENJUALAN
              </h1>
              <div className="font-extrabold text-xs sm:text-sm text-black uppercase">
                {STORE_INFO.name}
              </div>
              <div className="text-[10px] sm:text-[11px] text-black uppercase">
                {STORE_INFO.address}
              </div>
              <div className="text-[10px] sm:text-[11px] text-black">
                {STORE_INFO.phone}
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Metadata Faktur (No Transaksi, Tanggal, Pelanggan, Alamat, Dept, User) */}
          <div className="w-full sm:w-auto shrink-0 text-[10px] sm:text-[11px] text-black">
            <div className="grid grid-cols-12 gap-x-2">
              <div className="col-span-8 space-y-0.5">
                <div className="flex">
                  <span className="w-22 shrink-0">No Transaksi</span>
                  <span className="w-3 shrink-0 text-center">:</span>
                  <span className="font-bold">{transaction.invoiceNo}</span>
                </div>
                <div className="flex">
                  <span className="w-22 shrink-0">Tanggal</span>
                  <span className="w-3 shrink-0 text-center">:</span>
                  <span>{formatInvoiceDateTime(transaction.createdAt)}</span>
                </div>
                <div className="flex">
                  <span className="w-22 shrink-0">Pelanggan</span>
                  <span className="w-3 shrink-0 text-center">:</span>
                  <span className="font-bold uppercase truncate max-w-[150px] sm:max-w-[200px]">
                    {customerDisplay}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-22 shrink-0">Alamat</span>
                  <span className="w-3 shrink-0 text-center">:</span>
                  <span className="uppercase truncate max-w-[150px] sm:max-w-[200px]">
                    {addressDisplay}
                  </span>
                </div>
              </div>

              <div className="col-span-4 space-y-0.5 pl-2">
                <div className="flex">
                  <span className="w-10 shrink-0">Dept.</span>
                  <span className="w-3 shrink-0 text-center">:</span>
                  <span>{STORE_INFO.dept}</span>
                </div>
                <div className="flex">
                  <span className="w-10 shrink-0">User</span>
                  <span className="w-3 shrink-0 text-center">:</span>
                  <span className="uppercase">{cashierDisplay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            BARIS REKENING BANK & GARIS PEMBATAS TEGAS
        =================================================================== */}
        <div className="mt-2 pt-1 border-t border-black">
          <div className="text-[11px] sm:text-[12px] font-black text-black">
            <span>Rekening : </span>
            <span>{STORE_INFO.rekeningText}</span>
          </div>
        </div>

        {/* ===================================================================
            TABEL DAFTAR ITEM BARANG PAKAN (LINE ITEMS)
            Kolom: No. | Kode Item | Nama Item | Jml Satuan | Harga | Pot | Total
        =================================================================== */}
        <div className="mt-1">
          {/* Garis batas atas & bawah header tabel */}
          <div className="border-t border-b border-black py-1 flex items-center font-bold text-[10px] sm:text-[11px] text-black">
            <span className="w-[5%] text-left">No.</span>
            <span className="w-[12%] text-left">Kode Item</span>
            <span className="w-[32%] text-left">Nama Item</span>
            <span className="w-[18%] text-right">Jml Satuan</span>
            <span className="w-[14%] text-right">Harga</span>
            <span className="w-[6%] text-right">Pot</span>
            <span className="w-[13%] text-right">Total</span>
          </div>

          {/* Baris-baris data barang */}
          <div className="divide-y-0 text-[10px] sm:text-[11px] text-black py-0.5">
            {transaction.items.map((item, idx) => {
              const netLine = getCartItemNetTotal(item);
              const unitPrice = getCartItemUnitBasePrice(item);
              const unitLabel = item.product.unit
                ? item.product.unit
                    .replace(/sak 50 kg/i, "KARUNG")
                    .replace(/1 kg/i, "KG")
                    .replace(/sak/i, "KARUNG")
                    .toUpperCase()
                : "KARUNG";

              return (
                <div
                  key={`${item.cartItemId || item.product.id}-${idx}`}
                  className="py-0.5 flex items-center text-black"
                >
                  <span className="w-[5%] text-left tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="w-[12%] text-left font-mono truncate">
                    {item.product.sku || "00" + (idx + 26)}
                  </span>
                  <span className="w-[32%] text-left truncate font-medium">
                    {item.product.name}
                  </span>
                  <span className="w-[18%] text-right tabular-nums">
                    {formatAccountingNumber(item.qty)} {unitLabel}
                  </span>
                  <span className="w-[14%] text-right tabular-nums">
                    {formatAccountingNumber(unitPrice)}
                  </span>
                  <span className="w-[6%] text-right tabular-nums">
                    {formatAccountingNumber(item.discountItem)}
                  </span>
                  <span className="w-[13%] text-right tabular-nums font-semibold">
                    {formatAccountingNumber(netLine)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Garis batas bawah tabel item barang */}
          <div className="border-b border-black mt-0.5"></div>
        </div>

        {/* ===================================================================
            SECTION RINGKASAN: KETERANGAN & TERBILANG | TOTAL | TANDA TANGAN
        =================================================================== */}
        <div className="pt-2 grid grid-cols-12 gap-x-2 text-[10px] sm:text-[11px] text-black">
          {/* Kolom 1 (Kiri): Keterangan & Terbilang */}
          <div className="col-span-5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-start">
                <span className="w-20 shrink-0">Keterangan</span>
                <span className="w-3 shrink-0 text-center">:</span>
                <span className="flex-1">
                  {transaction.globalNote || ""}
                </span>
              </div>
              <div className="flex items-start">
                <span className="w-20 shrink-0">Terbilang</span>
                <span className="w-3 shrink-0 text-center">:</span>
                <span className="flex-1 italic leading-tight">
                  {formatTerbilang(transaction.grandTotal).toLowerCase()}
                </span>
              </div>
            </div>

            {/* Tanda Tangan: Bagian Gudang, Pengirim, Penerima (Di Bawah Kolom Kiri) */}
            <div className="pt-10 grid grid-cols-3 text-center text-[10px] sm:text-[11px] text-black">
              <div>Bagian Gudang</div>
              <div>Pengirim</div>
              <div>Penerima</div>
            </div>
          </div>

          {/* Kolom 2 (Tengah): Jml Item, Potongan, Biaya Lain, Tanggal Jt */}
          <div className="col-span-3 space-y-1 pl-1">
            <div className="flex items-center">
              <span className="w-18 shrink-0">Jml Item</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatAccountingNumber(totalItemQty)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-18 shrink-0">Potongan</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <div className="flex-1 flex justify-between tabular-nums">
                <span>0,00 %</span>
                <span>{formatAccountingNumber(transaction.totalDiscount)}</span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="w-18 shrink-0">Biaya Lain</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatAccountingNumber(transaction.taxAmount)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-18 shrink-0">Tanggal Jt</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatInvoiceDueDate(transaction.createdAt)}
              </span>
            </div>
          </div>

          {/* Kolom 3 (Kanan): Sub Total, Total Akhir, DP PO, Deposit, Tunai, Kredit, Kembali */}
          <div className="col-span-4 space-y-1 pl-2">
            <div className="flex items-center">
              <span className="w-20 shrink-0">Sub Total</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatAccountingNumber(transaction.subtotal)}
              </span>
            </div>
            <div className="flex items-center font-bold">
              <span className="w-20 shrink-0">Total Akhir</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums font-black">
                {formatAccountingNumber(transaction.grandTotal)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-20 shrink-0">DP PO</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">0,00</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 shrink-0">Deposit</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">0,00</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 shrink-0">Tunai</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatAccountingNumber(
                  transaction.paymentMethod === "Tunai"
                    ? transaction.amountPaid
                    : 0
                )}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-20 shrink-0">Kredit</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatAccountingNumber(
                  transaction.paymentMethod !== "Tunai"
                    ? transaction.grandTotal
                    : 0
                )}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-20 shrink-0">Kembali</span>
              <span className="w-3 shrink-0 text-center">:</span>
              <span className="flex-1 text-right tabular-nums">
                {formatAccountingNumber(transaction.changeAmount)}
              </span>
            </div>
          </div>
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
  const invoiceChars = transaction.invoiceNo.split("");

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
