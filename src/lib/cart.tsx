"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CartItemInput } from "@/lib/types";

export interface CartLine extends CartItemInput {
  product_name: string;
  variant_name: string;
  unit_price_cents: number;
}

type CartCtx = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (index: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartCtx | null>(null);
const KEY = "blockticket_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  function add(line: CartLine) {
    setLines((prev) => [...prev, line]);
  }
  function remove(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }
  function clear() {
    setLines([]);
  }

  return (
    <CartContext.Provider value={{ lines, add, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
