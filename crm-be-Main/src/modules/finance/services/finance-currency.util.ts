import { supabaseAdmin } from "../../../config/supabase.js";

export type FinanceCurrency = "USD" | "CAD" | "GBP" | "EUR" | "INR";

export async function getBaseCurrency(): Promise<FinanceCurrency> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("category", "finance")
    .eq("key", "base_currency")
    .maybeSingle();

  const raw = data?.value;
  const code =
    typeof raw === "string"
      ? raw.replace(/"/g, "")
      : (raw as { code?: string } | null)?.code;

  if (code && ["USD", "CAD", "GBP", "EUR", "INR"].includes(code)) {
    return code as FinanceCurrency;
  }
  return "INR";
}

export function toBaseAmount(
  amount: number,
  currency: string | null | undefined,
  exchangeRate: number | null | undefined,
  baseCurrency: FinanceCurrency,
): number {
  const value = Number(amount) || 0;
  const rate = Number(exchangeRate) || 1;
  const cur = (currency || baseCurrency) as FinanceCurrency;

  if (cur === baseCurrency) {
    return value;
  }

  // Invoice amounts are stored in invoice currency; exchange_rate converts to base.
  if (rate > 0) {
    return value * rate;
  }

  return value;
}

export function addToCurrencyMap(
  map: Record<string, number>,
  currency: string,
  amount: number,
) {
  const key = currency || "INR";
  map[key] = (map[key] || 0) + amount;
}
