import "server-only";

export function normalizeSouthAfricanPhone(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .trim()
    .replace(/[^\d+]/g, "");

  if (!cleaned) {
    return null;
  }

  // Already E.164 South African number.
  if (
    cleaned.startsWith("+27") &&
    /^(\+27)\d{9}$/.test(cleaned)
  ) {
    return cleaned;
  }

  // 27xxxxxxxxx without +
  if (
    cleaned.startsWith("27") &&
    cleaned.length === 11
  ) {
    return `+${cleaned}`;
  }

  // South African local mobile number.
  // 0xxxxxxxxx -> +27xxxxxxxxx
  if (
    /^0\d{9}$/.test(cleaned)
  ) {
    return `+27${cleaned.slice(1)}`;
  }

  return null;
}