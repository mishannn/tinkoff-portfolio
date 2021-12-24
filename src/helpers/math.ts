export function getYieldPercents(price: number, yield_: number): number {
  return (yield_ / (price - yield_)) * 100;
}
