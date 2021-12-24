const currencySymbols: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
};

export function getCurrencySymbol(currency: string): string {
  return currency in currencySymbols ? currencySymbols[currency] : currency;
}
