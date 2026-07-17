// Dinheiro é sempre armazenado em centavos (integer). Formatação só na borda.
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

export function formatDateBR(iso: string): string {
  // iso = "YYYY-MM-DD"; evita fuso construindo em UTC.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
