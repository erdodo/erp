"use client";

import { InputHTMLAttributes, ChangeEvent } from "react";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export default function PhoneInput({ value, onChange, className, ...rest }: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(formatPhone(e.target.value));
  }
  return (
    <input
      {...rest}
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      placeholder="0xxx xxx xx xx"
      className={className}
    />
  );
}
