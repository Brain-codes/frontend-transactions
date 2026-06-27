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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#4a5d0f] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-white text-sm font-semibold">Sales by State</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white/95 hover:bg-white text-gray-700 border-0 text-xs gap-2"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateLabel}
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white/95 hover:bg-white text-gray-700 border-0 text-xs gap-2"
              >
                {monthLabel}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white text-gray-800 border-2 border-white text-xs gap-2 font-semibold"
              >
                Top {topN}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
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
      <div className="p-4">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-12">Loading sales by state…</p>
        ) : chartData.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-12">No data for selected filters</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                formatter={(v) => [Number(v).toLocaleString(), "Sales"]}
                contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="value" barSize={22} radius={[0, 3, 3, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={GREEN_SHADES[i % GREEN_SHADES.length]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  fontSize={11}
                  fill="#374151"
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
