import type { Numeric } from "../types";

export type CurrencyMode = "crore" | "full";

export const CRORE = 10_000_000;

const indianInteger = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
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

  // In "crore" mode, always normalize to ₹ Cr so all values are directly comparable.
  const inCr = value / CRORE;
  if (inCr < 10) {
    return `₹${croreTwoDecimals.format(inCr)} Cr`;
  }

  return `₹${croreTwoDecimals.format(inCr)} Cr`;
}

export function formatCrore(value: Numeric | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not reported";
  }
  const inCr = value / CRORE;
  return `₹${croreTwoDecimals.format(inCr)} Cr`;
}
