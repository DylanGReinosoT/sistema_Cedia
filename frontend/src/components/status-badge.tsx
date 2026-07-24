import { Badge } from "@/components/ui/badge";
import type { StatusMeta } from "@/lib/status-meta";

export function StatusBadge({
  value,
  metaFn,
}: {
  value: string;
  metaFn: (value: string) => StatusMeta;
}) {
  const { label, tone } = metaFn(value);
  return <Badge tone={tone}>{label}</Badge>;
}