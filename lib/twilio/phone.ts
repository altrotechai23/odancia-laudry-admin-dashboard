import "server-only";

/** Normalize a phone number to E.164 without a phone-input library.
 * South African local numbers default to +27. Other countries must include
 * an international + or 00 country prefix so we never guess a country code.
 */
export function normalizeSouthAfricanPhone(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact || !/^\+?\d+$/.test(compact)) return null;

  let international = compact;
  if (international.startsWith("00")) international = `+${international.slice(2)}`;
  if (international.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
  }

  const digits = international.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `+27${digits.slice(1)}`;
  if (/^27\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
