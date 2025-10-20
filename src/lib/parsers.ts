import type { ColorValue } from "../types";

/**
 * Convert RGB color object to hex string
 */
export const toHex = (color: {
  a: number;
  b: number;
  g: number;
  r: number;
}) => {
  const { r, g, b, a } = color;

  // Convert 0-1 range to 0-255 range and ensure integers
  const r255 = Math.round(r * 255);
  const g255 = Math.round(g * 255);
  const b255 = Math.round(b * 255);
  const a255 = Math.round(a * 255);

  // Convert each component to hex and pad with zeros if needed
  const rHex = r255.toString(16).padStart(2, "0");
  const gHex = g255.toString(16).padStart(2, "0");
  const bHex = b255.toString(16).padStart(2, "0");
  const aHex = a255.toString(16).padStart(2, "0");

  // Return with or without alpha based on opacity
  const hex =
    a === 1 ? `#${rHex}${gHex}${bHex}` : `#${rHex}${gHex}${bHex}${aHex}`;

  return hex;
};

/**
 * Convert pixels to rem units
 */
export const toRem = (px: number, base: number = 16) => {
  const rem = px / base;
  return `${rem}rem`;
};

/**
 * Parse a variable value based on its type
 */
export const parseValue = (
  value: ColorValue | number | string,
  type: string
): string => {
  switch (type) {
    case "COLOR": {
      const { r, g, b, a } = value as ColorValue;
      return toHex({
        r: Number(r),
        g: Number(g),
        b: Number(b),
        a: Number(a),
      });
    }
    case "FLOAT":
      return toRem(value as number);
    case "STRING":
      return value as string;
    default:
      return String(value);
  }
};
