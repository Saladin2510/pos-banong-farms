import { HeldOrder, Product, Transaction } from "@/types/pos";
import { createClient, saveSupabaseRuntimeCookies } from "@/lib/supabase/client";

export interface CloudConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  enabled: boolean;
}

const CLOUD_CONFIG_KEY = "cb_banong_cloud_config_v1";

export function getSavedCloudConfig(): CloudConfig {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (typeof window === "undefined") {
    return {
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey,
      enabled: Boolean(envUrl && envKey),
    };
  }

  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CloudConfig;
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage error
  }

  return {
    supabaseUrl: envUrl,
    supabaseAnonKey: envKey,
    enabled: Boolean(envUrl && envKey),
  };
}

export function saveCloudConfig(config: CloudConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
  if (config.supabaseUrl && config.supabaseAnonKey) {
    saveSupabaseRuntimeCookies(config.supabaseUrl, config.supabaseAnonKey);
  }
}

async function getAuthHeaders(anonKey: string) {
  let bearerToken = anonKey;
  try {
    const supabase = createClient();
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        bearerToken = session.access_token;
      }
    }
  } catch {
    // Fallback to anonKey if session check fails
  }

  return {
    apikey: anonKey,
    Authorization: `Bearer ${bearerToken}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
}

// Fetch all POS state from Supabase Cloud PostgreSQL if configured, else from Next.js API DB
export async function fetchPosDataFromCloud(): Promise<{
  products: Product[];
  transactions: Transaction[];
  heldOrders: HeldOrder[];
  source: "SUPABASE_CLOUD" | "SERVER_API";
} | null> {
  const cfg = getSavedCloudConfig();

  if (cfg.enabled && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    try {
      const baseUrl = cfg.supabaseUrl.replace(/\/$/, "");
      const headers = await getAuthHeaders(cfg.supabaseAnonKey);

      const [prodRes, txRes, heldRes] = await Promise.all([
        fetch(`${baseUrl}/rest/v1/products?select=*&order=id.asc`, { headers }),
        fetch(`${baseUrl}/rest/v1/transactions?select=*&order=created_at.desc`, {
          headers,
        }),
        fetch(`${baseUrl}/rest/v1/held_orders?select=*&order=created_at.desc`, {
          headers,
        }),
      ]);

      if (prodRes.ok && txRes.ok && heldRes.ok) {
        const rawProds = await prodRes.json();
        const rawTxs = await txRes.json();
        const rawHeld = await heldRes.json();

        const products: Product[] = rawProds.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          sku: String(r.sku),
          name: String(r.name),
          category: String(r.category) as Product["category"],
          sellPrice: Number(r.sell_price),
          wholesalePrice: Number(r.wholesale_price || r.sell_price),
          unit: String(r.unit || "1 Kg"),
          costPrice: Number(r.cost_price),
          stock: Number(r.stock),
          image: String(r.image),
          isAvailable: Boolean(r.is_available),
        }));

        const transactions: Transaction[] = rawTxs.map(
          (t: Record<string, unknown>) => ({
            id: String(t.id),
            invoiceNo: String(t.invoice_no),
            createdAt: String(t.created_at),
            cashierName: String(t.cashier_name),
            waiterName: String(t.waiter_name),
            customerName: String(t.customer_name),
            tableNumber: String(t.table_number),
            orderType: String(t.order_type) as Transaction["orderType"],
            globalNote: String(t.global_note || ""),
            items: Array.isArray(t.items) ? t.items : [],
            subtotal: Number(t.subtotal),
            totalDiscount: Number(t.total_discount),
            taxAmount: Number(t.tax_amount),
            grandTotal: Number(t.grand_total),
            paymentMethod: String(t.payment_method) as Transaction["paymentMethod"],
            amountPaid: Number(t.amount_paid),
            changeAmount: Number(t.change_amount),
          })
        );

        const heldOrders: HeldOrder[] = rawHeld.map(
          (h: Record<string, unknown>) => ({
            id: String(h.id),
            createdAt: String(h.created_at),
            customerName: String(h.customer_name),
            waiterName: String(h.waiter_name),
            tableNumber: String(h.table_number),
            orderType: String(h.order_type) as HeldOrder["orderType"],
            globalNote: String(h.global_note || ""),
            items: Array.isArray(h.items) ? h.items : [],
          })
        );

        return {
          products,
          transactions,
          heldOrders,
          source: "SUPABASE_CLOUD",
        };
      }
    } catch {
      // Fallback to Next.js Server API if Supabase is unreachable
    }
  }

  // Fallback to Next.js Fullstack API Route (/api/pos)
  try {
    const res = await fetch("/api/pos", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return {
        products: data.products || [],
        transactions: data.transactions || [],
        heldOrders: data.heldOrders || [],
        source: "SERVER_API",
      };
    }
  } catch {
    // Offline fallback
  }

  return null;
}

// Sync POS state to both Next.js Server API (/api/pos) AND Supabase Cloud PostgreSQL
export async function syncPosDataToCloud(payload: {
  products: Product[];
  transactions: Transaction[];
  heldOrders: HeldOrder[];
}): Promise<{ syncedToSupabase: boolean; syncedToServer: boolean }> {
  let syncedToServer = false;
  let syncedToSupabase = false;

  // 1. Save to Next.js Backend API (/api/pos)
  try {
    const res = await fetch("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    syncedToServer = res.ok;
  } catch {
    syncedToServer = false;
  }

  // 2. If Supabase Cloud is enabled, upsert to Supabase PostgreSQL tables
  const cfg = getSavedCloudConfig();
  if (cfg.enabled && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    try {
      const baseUrl = cfg.supabaseUrl.replace(/\/$/, "");
      const headers = await getAuthHeaders(cfg.supabaseAnonKey);

      const dbProducts = payload.products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        sell_price: p.sellPrice,
        wholesale_price: p.wholesalePrice || p.sellPrice,
        unit: p.unit || "1 Kg",
        cost_price: p.costPrice,
        stock: p.stock,
        image: p.image,
        is_available: p.isAvailable,
        updated_at: new Date().toISOString(),
      }));

      const dbTransactions = payload.transactions.map((t) => ({
        id: t.id,
        invoice_no: t.invoiceNo,
        created_at: t.createdAt,
        cashier_name: t.cashierName,
        waiter_name: t.waiterName,
        customer_name: t.customerName,
        table_number: t.tableNumber,
        order_type: t.orderType,
        global_note: t.globalNote || "",
        items: t.items,
        subtotal: t.subtotal,
        total_discount: t.totalDiscount,
        tax_amount: t.taxAmount,
        grand_total: t.grandTotal,
        payment_method: t.paymentMethod,
        amount_paid: t.amountPaid,
        change_amount: t.changeAmount,
      }));

      const dbHeld = payload.heldOrders.map((h) => ({
        id: h.id,
        created_at: h.createdAt,
        customer_name: h.customerName,
        waiter_name: h.waiterName,
        table_number: h.tableNumber,
        order_type: h.orderType,
        global_note: h.globalNote || "",
        items: h.items,
      }));

      const [r1, r2] = await Promise.all([
        fetch(`${baseUrl}/rest/v1/products`, {
          method: "POST",
          headers,
          body: JSON.stringify(dbProducts),
        }),
        dbTransactions.length > 0
          ? fetch(`${baseUrl}/rest/v1/transactions`, {
              method: "POST",
              headers,
              body: JSON.stringify(dbTransactions),
            })
          : Promise.resolve({ ok: true }),
      ]);

      if (dbHeld.length > 0) {
        await fetch(`${baseUrl}/rest/v1/held_orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(dbHeld),
        });
      }

      syncedToSupabase = r1.ok && r2.ok;
    } catch {
      syncedToSupabase = false;
    }
  }

  return { syncedToSupabase, syncedToServer };
}
