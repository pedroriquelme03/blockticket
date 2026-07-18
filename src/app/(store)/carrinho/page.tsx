import Link from "next/link";
import { CartCheckout } from "./cart-checkout";

export default function CarrinhoPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/" className="text-sm text-blue-600">
        ← Continuar comprando
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-bold">Carrinho</h1>
      <CartCheckout />
    </div>
  );
}
