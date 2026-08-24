import type { ProjectAddress } from "../api";
import { Chip } from "./bits";

function projectAddressLabel(address: ProjectAddress | undefined): string | undefined {
  const label = address?.slice(1).join("/");
  return label || undefined;
}

export function ProjectChip({ address }: { address: ProjectAddress | undefined }) {
  const label = projectAddressLabel(address);
  return label ? <Chip>{label}</Chip> : null;
}
