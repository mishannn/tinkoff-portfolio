export function getError(maybeError: unknown): Error {
  if (maybeError instanceof Error) {
    return maybeError;
  }

  return maybeError
    ? new Error(JSON.stringify(maybeError))
    : new Error("Неизвестная ошибка");
}

export function getFormattedPriceValue(value: number) {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getYieldPercents(price: number, yield_: number): number {
  return (yield_ / (price - yield_)) * 100;
}
