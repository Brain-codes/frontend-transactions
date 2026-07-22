import React from "react";
import { CalendarClock, CalendarDays, Clock, AlertCircle, AlertTriangle, X } from "lucide-react";

export type TrackingKey = "none" | "due30" | "due14" | "due7" | "dueToday" | "overdue";

interface Props {
  active: TrackingKey;
  counts: Record<Exclude<TrackingKey, "none">, number>;
  onChange: (key: TrackingKey) => void;
}

const chips: Array<{
  key: Exclude<TrackingKey, "none">;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  pill: string; // outer pill classes when inactive
  activePill: string; // outer pill classes when active
  badge: string; // count badge classes
  iconColor: string;
}> = [
  {
    key: "due30",
    label: "Due in 30 days",
    Icon: CalendarClock,
    pill: "bg-white border-blue-200 text-blue-700 hover:bg-blue-50",
    activePill: "bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-200",
    badge: "bg-blue-600 text-white",
    iconColor: "text-blue-600",
  },
  {
    key: "due14",
    label: "Due in 14 days",
    Icon: CalendarDays,
    pill: "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50",
    activePill: "bg-indigo-50 border-indigo-400 text-indigo-800 ring-2 ring-indigo-200",
    badge: "bg-indigo-600 text-white",
    iconColor: "text-indigo-600",
  },
  {
    key: "due7",
    label: "Due in 7 days",
    Icon: CalendarDays,
    pill: "bg-white border-teal-200 text-teal-700 hover:bg-teal-50",
    activePill: "bg-teal-50 border-teal-400 text-teal-800 ring-2 ring-teal-200",
    badge: "bg-teal-600 text-white",
    iconColor: "text-teal-600",
  },
  {
    key: "dueToday",
    label: "Due Today",
    Icon: Clock,
    pill: "bg-white border-amber-200 text-amber-700 hover:bg-amber-50",
    activePill: "bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-200",
    badge: "bg-amber-500 text-white",
    iconColor: "text-amber-600",
  },
  {
    key: "overdue",
    label: "Overdue",
    Icon: AlertTriangle,
    pill: "bg-white border-red-200 text-red-700 hover:bg-red-50",
    activePill: "bg-red-50 border-red-400 text-red-800 ring-2 ring-red-200",
    badge: "bg-red-600 text-white",
    iconColor: "text-red-600",
  },
];

const SalesTrackingBar: React.FC<Props> = ({ active, counts, onChange }) => {
  return (
    <div className="bg-blue-50/40 border border-blue-100 rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-2">
      {chips.map(({ key, label, Icon, pill, activePill, badge, iconColor }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(isActive ? "none" : key)}
            className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
              isActive ? activePill : pill
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "" : iconColor}`} />
            <span>{label}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-semibold ${badge}`}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}

      {active !== "none" && (
        <button
          type="button"
          onClick={() => onChange("none")}
          className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      )}
    </div>
  );
};

export default SalesTrackingBar;
