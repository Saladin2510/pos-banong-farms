import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  INITIAL_HELD_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
} from "@/data/initialData";
import { HeldOrder, Product, Transaction } from "@/types/pos";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "banong-pos-db.json");

interface PosDatabaseState {
  products: Product[];
  transactions: Transaction[];
  heldOrders: HeldOrder[];
  updatedAt: string;
}

async function readServerDb(): Promise<PosDatabaseState> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as PosDatabaseState;
    return {
      products: parsed.products?.length ? parsed.products : INITIAL_PRODUCTS,
      transactions: parsed.transactions || INITIAL_TRANSACTIONS,
      heldOrders: parsed.heldOrders || INITIAL_HELD_ORDERS,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    const initial: PosDatabaseState = {
      products: INITIAL_PRODUCTS,
      transactions: INITIAL_TRANSACTIONS,
      heldOrders: INITIAL_HELD_ORDERS,
      updatedAt: new Date().toISOString(),
    };
    await writeServerDb(initial);
    return initial;
  }
}

async function writeServerDb(state: PosDatabaseState): Promise<void> {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    await fs.writeFile(
      DB_FILE,
      JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch {
    // Ignore read-only filesystem errors in serverless edge environments
  }
}

export async function GET() {
  const db = await readServerDb();
  return NextResponse.json(db);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readServerDb();

    if (body.action === "RESET") {
      const resetState: PosDatabaseState = {
        products: INITIAL_PRODUCTS,
        transactions: INITIAL_TRANSACTIONS,
        heldOrders: [],
        updatedAt: new Date().toISOString(),
      };
      await writeServerDb(resetState);
      return NextResponse.json(resetState);
    }

    const updated: PosDatabaseState = {
      products: Array.isArray(body.products) ? body.products : current.products,
      transactions: Array.isArray(body.transactions)
        ? body.transactions
        : current.transactions,
      heldOrders: Array.isArray(body.heldOrders)
        ? body.heldOrders
        : current.heldOrders,
      updatedAt: new Date().toISOString(),
    };

    await writeServerDb(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menyimpan ke database server", details: String(err) },
      { status: 500 }
    );
  }
}

