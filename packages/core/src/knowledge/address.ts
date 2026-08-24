import type { ProjectAddress } from "./types.ts";

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareProjectAddress(
  left: ProjectAddress,
  right: ProjectAddress,
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = compareText(left[index]!, right[index]!);
    if (comparison !== 0) return comparison;
  }
  return left.length - right.length;
}

export function compareCanonicalProjectAddress(
  left: ProjectAddress,
  right: ProjectAddress,
): number {
  return left.length - right.length || compareProjectAddress(left, right);
}
