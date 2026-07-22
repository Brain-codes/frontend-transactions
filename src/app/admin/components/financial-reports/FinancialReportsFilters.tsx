
import React from "react";
import { Search, X, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface FinancialReportsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  selectedState?: string;
  onStateChange?: (value: string) => void;
  selectedLGA?: string;
  onLGAChange?: (value: string) => void;
  orgFilter?: string;
  onOrgChange?: (value: string) => void;
  assignedOrgs?: { id: string; partner_name: string }[];
  approvalFilter?: string;
  onApprovalChange?: (value: string) => void;
  salesModelFilter?: string;
  onSalesModelChange?: (value: string) => void;
  salesModels?: { id: string; name: string }[];
  stateList?: string[];
  lgaList?: string[];
  selectedMonth?: string;
  onMonthChange?: (value: string) => void;
  yearFilter?: string;
  onYearFilterChange?: (value: string) => void;
  availableYears?: number[];
}


const toISO = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : "");
const fromISO = (s?: string) => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

const FinancialReportsFilters: React.FC<FinancialReportsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  paymentStatusFilter,
  onPaymentStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClearFilters,
  hasActiveFilters,
  selectedState,
  onStateChange,
  selectedLGA,
  onLGAChange,
  orgFilter,
  onOrgChange,
  assignedOrgs = [],
  approvalFilter,
  onApprovalChange,
  salesModelFilter,
  onSalesModelChange,
  salesModels = [],
  stateList = [],
  lgaList = [],
  selectedMonth,
  onMonthChange,
  yearFilter,
  onYearFilterChange,
  availableYears = [],
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const yearsForSelect = React.useMemo(() => {
    const set = new Set<number>(availableYears);
    set.add(currentYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, currentYear]);

  const selectedYearNum = yearFilter && yearFilter !== "all" ? Number(yearFilter) : null;
  const isMonthDisabled = (idx: number) => {
    if (selectedYearNum === null) return idx > currentMonth; // "all years" — restrict future months of current year
    if (selectedYearNum < currentYear) return false;
    if (selectedYearNum === currentYear) return idx > currentMonth;
    return true; // future year
  };


  const range: DateRange | undefined = React.useMemo(() => {
    const from = fromISO(startDate);
    const to = fromISO(endDate);
    if (!from && !to) return undefined;
    return { from, to };
  }, [startDate, endDate]);

  const dateLabel = (() => {
    const from = fromISO(startDate);
    const to = fromISO(endDate);
    if (from && to) return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
    if (from) return `${format(from, "MMM d, yyyy")} – …`;
    return "Date range";
  })();

  const handleRangeSelect = (r: DateRange | undefined) => {
    onStartDateChange(toISO(r?.from));
    onEndDateChange(toISO(r?.to));
  };

  return (
    <div className="bg-[#fafafa] p-3 rounded-lg shadow-none">
      <div className="flex items-center gap-2 flex-nowrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search customer, transaction ID, phone…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-white shadow-none h-9 text-sm"
          />
        </div>

        {/* Payment Status */}
        <Select value={paymentStatusFilter} onValueChange={onPaymentStatusChange}>
          <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[140px] shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        {/* Sales Model */}
        {onSalesModelChange && (
          <Select value={salesModelFilter} onValueChange={onSalesModelChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[150px] shrink-0">
              <SelectValue placeholder="Sales Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sales Models</SelectItem>
              {salesModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* State */}
        {onStateChange && (
          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[130px] shrink-0">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {stateList.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* LGA */}
        {onLGAChange && selectedState !== "all" && lgaList.length > 0 && (
          <Select value={selectedLGA} onValueChange={onLGAChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[130px] shrink-0">
              <SelectValue placeholder="LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {lgaList.map((lga) => (
                <SelectItem key={lga} value={lga}>{lga}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Month */}
        {onMonthChange && (
          <Select value={selectedMonth ?? "all"} onValueChange={onMonthChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[130px] shrink-0">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, idx) => (
                <SelectItem key={m} value={String(idx)} disabled={isMonthDisabled(idx)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Year */}
        {onYearFilterChange && (
          <Select value={yearFilter ?? "all"} onValueChange={onYearFilterChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[110px] shrink-0">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {yearsForSelect.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Partner */}
        {onOrgChange && (
          <Select value={orgFilter} onValueChange={onOrgChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[140px] shrink-0">
              <SelectValue placeholder="Partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {assignedOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.partner_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Approval */}
        {onApprovalChange && (
          <Select value={approvalFilter} onValueChange={onApprovalChange}>
            <SelectTrigger className="bg-white shadow-none h-9 text-sm w-[140px] shrink-0">
              <SelectValue placeholder="Approval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approvals</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Date Range Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 bg-white shadow-none text-sm font-normal justify-start gap-2 shrink-0",
                !startDate && !endDate && "text-muted-foreground",
                startDate || endDate ? "w-[240px]" : "w-[140px]"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="truncate">{dateLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              disabled={{ after: today }}
              defaultMonth={range?.from ?? today}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="flex items-center justify-between border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  onStartDateChange("");
                  onEndDateChange("");
                }}
              >
                Clear
              </Button>
              <span className="text-xs text-muted-foreground pr-2">
                {startDate && endDate ? "Range selected" : startDate ? "Pick an end date" : "Pick a start date"}
              </span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center gap-1 h-9 px-3 shadow-none shrink-0"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default FinancialReportsFilters;
