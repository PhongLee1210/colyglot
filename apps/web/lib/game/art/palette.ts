export function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")
  );
}

// amount < 0 darkens toward black, > 0 lightens toward white.
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    rgb.map((channel) =>
      amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount
    ) as [number, number, number]
  );
}

export function mix(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as [number, number, number]
  );
}
