import type { Numeric } from "../types";

export type CurrencyMode = "crore" | "full";

export const CRORE = 10_000_000;

const indianInteger = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const croreOneDecimal = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const croreTwoDecimals = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(
  value: Numeric | undefined,
  mode: CurrencyMode = "crore",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not reported";
  }

  if (mode === "full") {
    return `₹${indianInteger.format(value)}`;
  }

  if (value < CRORE) {
    return `₹${croreOneDecimal.format(value / 1_00_000)} L`;
  }

  if (value < CRORE * 10) {
    return `₹${croreTwoDecimals.format(value / CRORE)} Cr`;
  }

  return `₹${croreOneDecimal.format(value / CRORE)} Cr`;
}
