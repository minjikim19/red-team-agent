import type { Severity } from "@/types";

const CONFIG: Record<
  Severity,
  { label: string; className: string; dot: string }
> = {
  Critical: {
    label: "Critical",
    className:
      "bg-red-500/10 text-red-400 border border-red-500/25 ring-1 ring-red-500/10",
    dot: "bg-red-400",
  },
  High: {
    label: "High",
    className:
      "bg-orange-500/10 text-orange-400 border border-orange-500/25 ring-1 ring-orange-500/10",
    dot: "bg-orange-400",
  },
  Medium: {
    label: "Medium",
    className:
      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 ring-1 ring-yellow-500/10",
    dot: "bg-yellow-400",
  },
  Low: {
    label: "Low",
    className:
      "bg-blue-500/10 text-blue-400 border border-blue-500/25 ring-1 ring-blue-500/10",
    dot: "bg-blue-400",
  },
};

interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
}

export default function SeverityBadge({
  severity,
  size = "md",
}: SeverityBadgeProps) {
  const config = CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.className} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
