import type { Diagnostic } from "./api";

export function diagnosticTone(
  severity: Diagnostic["severity"],
): "risk" | "warn" | "info" {
  if (severity === "error") return "risk";
  if (severity === "warning") return "warn";
  return "info";
}
