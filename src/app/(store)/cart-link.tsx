"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { lines } = useCart();
  const qty = lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <Link href="/carrinho" className="font-medium text-blue-600 hover:underline">
      Carrinho{qty > 0 ? ` (${qty})` : ""}
    </Link>
  );
}
