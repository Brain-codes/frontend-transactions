import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import salesAdvancedService from "../../services/salesAdvancedAPIService";

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

const TOP_OPTIONS = [5, 10, 15, 20, 50];

const GREEN_SHADES = [
  "#4a5d0f",
  "#5a7012",
  "#6a8316",
  "#7a961a",
  "#8aa92a",
  "#9bbb3f",
  "#aecc5e",
  "#c1dd7e",
  "#d4ee9e",
  "#e2f3b8",
];

const SalesByStateChart = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [month, setMonth] = useState("all");
  const [topN, setTopN] = useState(10);
  const [calOpen, setCalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await salesAdvancedService.getSalesData(
          { limit: 10000, responseFormat: "format2" },
          "POST",
          "SalesByStateChart"
        );
        const data = Array.isArray(resp?.data) ? resp.data : (resp?.data?.sales ?? []);
        if (mounted) setRows(data);
      } catch (e) {
        console.error("Sales by state fetch failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const chartData = useMemo(() => {
    const counts = {};
    rows.forEach((r) => {
      const raw = r?.sales_date || r?.sale_date || r?.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      if (dateRange.from && d < dateRange.from) return;
      if (dateRange.to) {
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return;
      }
      if (month !== "all" && d.getMonth() !== Number(month)) return;
      const state = r?.state_backup || r?.state || r?.address?.state || "Unknown";
      const qty = Number(r?.quantity ?? 1) || 1;
      counts[state] = (counts[state] || 0) + qty;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
  }, [rows, dateRange, month, topN]);

  const dateLabel = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "Filter by date range";

  const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? "All Months";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="bg-[#4a5d0f] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl">
        <h3 className="text-white text-[15px] font-semibold tracking-wide">Sales by State</h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-white text-gray-600 text-[12.5px] font-medium shadow-sm hover:bg-gray-50 transition-colors"
              >
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span className={dateRange.from ? "text-gray-800" : "text-gray-400"}>{dateLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(r) => setDateRange(r || { from: undefined, to: undefined })}
                disabled={(d) => d > new Date()}
                numberOfMonths={2}
              />
              <div className="flex justify-end gap-2 p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDateRange({ from: undefined, to: undefined }); setCalOpen(false); }}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={() => setCalOpen(false)} className="bg-[#4a5d0f] hover:bg-[#3d4d0c] text-white">
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-white text-gray-700 text-[12.5px] font-medium shadow-sm hover:bg-gray-50 transition-colors"
              >
                {monthLabel}
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              {MONTHS.map((m) => (
                <DropdownMenuItem key={m.value} onClick={() => setMonth(m.value)}>
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-white text-gray-800 text-[12.5px] font-semibold ring-2 ring-white shadow-sm hover:bg-gray-50 transition-colors"
              >
                Top {topN}
                <ChevronDown className="h-4 w-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TOP_OPTIONS.map((n) => (
                <DropdownMenuItem key={n} onClick={() => setTopN(n)}>
                  Top {n}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pt-6 pb-5 bg-white">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-16">Loading sales by state…</p>
        ) : chartData.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-16">No data for selected filters</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 42)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 64, left: 4, bottom: 8 }}
              barCategoryGap="22%"
            >
              <defs>
                {chartData.map((_, i) => {
                  const t = chartData.length === 1 ? 0 : i / (chartData.length - 1);
                  const lerp = (a, b) => Math.round(a + (b - a) * t);
                  const r = lerp(74, 190);
                  const g = lerp(93, 215);
                  const b = lerp(15, 110);
                  const start = `rgb(${r}, ${g}, ${b})`;
                  const r2 = Math.min(255, r + 30);
                  const g2 = Math.min(255, g + 25);
                  const b2 = Math.min(255, b + 30);
                  const end = `rgb(${r2}, ${g2}, ${b2})`;
                  return (
                    <linearGradient key={i} id={`sbsBar-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={start} />
                      <stop offset="100%" stopColor={end} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tickMargin={6}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 13, fill: "#374151", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={86}
              />
              <Tooltip
                cursor={{ fill: "rgba(74, 93, 15, 0.06)" }}
                formatter={(v) => [Number(v).toLocaleString(), "Sales"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Bar dataKey="value" barSize={18} radius={[3, 6, 6, 3]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`url(#sbsBar-${i})`} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  fontSize={12}
                  fontWeight={600}
                  fill="#4a5d0f"
                  formatter={(v) => Number(v).toLocaleString()}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SalesByStateChart;

