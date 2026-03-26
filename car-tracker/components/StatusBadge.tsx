import type { ListingStatus } from "@/types";

const config: Record<
  ListingStatus,
  { label: string; classes: string }
> = {
  live: {
    label: "Live",
    classes: "bg-green-500/15 text-green-400 border border-green-500/30",
  },
  price_drop: {
    label: "↓ Price Drop",
    classes: "bg-green-500/15 text-green-300 border border-green-500/30",
  },
  price_increase: {
    label: "↑ Price Up",
    classes: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  gone: {
    label: "Gone",
    classes: "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30",
  },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const { label, classes } = config[status] ?? config.live;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
