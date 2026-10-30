export function formatZAR(
  amount: number | string | null | undefined,
): string {
  const numericAmount = Number(amount ?? 0);

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatRands(
  amount: number | string | null | undefined,
): string {
  const numericAmount = Number(amount ?? 0);

  return `R ${numericAmount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}