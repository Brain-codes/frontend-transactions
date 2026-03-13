"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
}

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
}) => {
  return (
    <div className="bg-brand-light p-4 rounded-lg ">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative md:w-[400px] w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by customer, transaction ID, phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Payment Status */}
        <div className="flex-1 min-w-[150px] max-w-[200px]">
          <Select
            value={paymentStatusFilter}
            onValueChange={onPaymentStatusChange}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-white w-[150px]"
            placeholder="Start Date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-white w-[150px]"
            placeholder="End Date"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center gap-1"
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
