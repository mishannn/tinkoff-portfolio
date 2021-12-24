import { getCurrencySymbol } from "./currencies";
import { getYieldPercents } from "./math";

function getFormattedPriceValue(value: number, currency: string) {
  const formattedValue = value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const currencySymbol = getCurrencySymbol(currency);

  return `${formattedValue} ${currencySymbol}`;
}

function getFormattedYieldValue(yield_: number, currency: string) {
  const yieldSign = yield_ > 0 ? "+" : "";
  const yieldValue = getFormattedPriceValue(yield_, currency);

  return `${yieldSign}${yieldValue}`;
}

function getFormattedYieldPercents(percents: number) {
  const yieldSign = percents > 0 ? "+" : "";
  const fixedPercents = percents.toFixed(2);

  return `${yieldSign}${fixedPercents}%`;
}

function getYeildIcon(yieldPercents: number) {
  if (yieldPercents > 15) {
    return "✅";
  }

  if (yieldPercents > 3) {
    return "🔼";
  }

  if (yieldPercents > -3) {
    return "☯️";
  }

  if (yieldPercents > -15) {
    return "✴️";
  }

  return "🆘";
}

interface PriceStringOptions {
  cost: number;
  balance?: number;
  yield_?: number;
  currency: string;
}

export function getCostString({
  balance = 1,
  cost,
  currency,
  yield_ = 0,
}: PriceStringOptions) {
  let str = "💼 ";

  const formattedCostValue = getFormattedPriceValue(cost, currency);

  if (Math.abs(balance) > 1) {
    const formattedPriceValue = getFormattedPriceValue(
      cost / balance,
      currency
    );

    str += `${formattedCostValue} / ${formattedPriceValue} за шт.`;
  } else {
    str += formattedCostValue;
  }

  if (yield_) {
    const yieldPercents = getYieldPercents(cost, yield_);
    const yieldIcon = getYeildIcon(yieldPercents);
    const formattedYieldValue = getFormattedYieldValue(yield_, currency);
    const formattedYieldPercents = getFormattedYieldPercents(yieldPercents);

    if (Math.abs(balance) > 1) {
      const formattedItemYieldValue = getFormattedYieldValue(
        yield_ / balance,
        currency
      );

      str += `\n${yieldIcon} ${formattedYieldValue} / ${formattedItemYieldValue} на шт. (${formattedYieldPercents})`;
    } else {
      str += `\n${yieldIcon} ${formattedYieldValue} (${formattedYieldPercents})`;
    }
  }

  return str;
}
