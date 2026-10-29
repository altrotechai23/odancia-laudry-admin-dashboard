"use client";

import PhoneInput, { type Value } from "react-phone-number-input";

type InternationalPhoneInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  "aria-invalid"?: boolean;
};

/**
 * International phone entry.
 * Handles country calling codes, national formatting and E.164 output,
 * while defaulting new customers to South Africa.
 */
export default function InternationalPhoneInput({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
  autoComplete = "tel",
  "aria-invalid": ariaInvalid,
}: InternationalPhoneInputProps) {
  return (
    <PhoneInput
      id={id}
      defaultCountry="ZA"
      international
      withCountryCallingCode
      countryCallingCodeEditable={false}
      value={value ? (value as Value) : undefined}
      onChange={(nextValue: Value | undefined) => onChange(nextValue ?? "")}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      aria-invalid={ariaInvalid}
      className="odancia-phone-input"
    />
  );
}