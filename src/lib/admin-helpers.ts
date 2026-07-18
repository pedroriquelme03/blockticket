// Helpers do painel admin (parsing de formulários).

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Converte um valor em reais digitado ("150", "150,00", "1.500,00") para centavos.
export function parseBRLToCents(input: string): number {
  const s = (input ?? "").trim().replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  // Se tem vírgula, ela é o separador decimal e pontos são milhar.
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : s;
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? NaN : Math.round(value * 100);
}

// Formata a lista de dias da semana (0=Dom..6=Sáb) de uma regra.
export function formatWeekdays(weekdays: number[] | null): string {
  if (!weekdays || weekdays.length === 0) return "Todos os dias";
  if (weekdays.length === 7) return "Todos os dias";
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ");
}
