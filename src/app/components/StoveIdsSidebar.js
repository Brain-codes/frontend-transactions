"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { Loader2, X, FileText, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import SalesDetailSidebar from "./SalesDetailSidebar";
import { useToast } from "@/components/ui/toast";

const StoveIdsSidebar = ({ organization, isOpen, onClose }) => {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stoveIds, setStoveIds] = useState([]);
  const [totals, setTotals] = useState(null);
  const [status, setStatus] = useState("all");
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleSidebar, setShowSaleSidebar] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [loadingSaleId, setLoadingSaleId] = useState(null);

  useEffect(() => {
    if (isOpen && organization) {
      fetchStoveIds(status);
    }
    // eslint-disable-next-line
  }, [isOpen, organization, status]);

  const fetchStoveIds = async (statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/get-stove-ids`;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error("No authentication token found");
      const body = {
        organization_id: organization.id,
      };
      if (statusFilter && statusFilter !== "all") {
        body.status = statusFilter;
      }
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to fetch stove IDs");
      setStoveIds(data.data || []);
      setTotals(data.totals || null);
    } catch (err) {
      setError(err.message);
      setStoveIds([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Fetch sale by sale_id and show sidebar
  const handleViewSale = async (saleId) => {
    setLoadingSaleId(saleId);
    setSaleLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const functionUrl = `${baseUrl}/functions/v1/get-sale?id=${saleId}`;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error("No authentication token found");
      const response = await fetch(functionUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch sale");
      setSelectedSale(data.data || null);
      setShowSaleSidebar(true);
    } catch (err) {
      toast.error(
        "Failed to fetch sale",
        err.message || "An error occurred fetching sale details."
      );
    } finally {
      setSaleLoading(false);
    }
    setLoadingSaleId(null);
  };
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        onClose={onClose}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Stove IDs
          </SheetTitle>
          <SheetDescription className="text-start">
            View all stove IDs for this organization
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Totals and Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {totals && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Total: {totals.total_stove_ids}</Badge>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Available: {totals.total_stove_available}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Sold: {totals.total_stove_sold}
                </Badge>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500">Status:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          {/* Table or Loading/Error */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin h-6 w-6 text-brand-600" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">{error}</div>
          ) : stoveIds.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No stove IDs found for this organization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Stove ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stoveIds.map((stove) => (
                    <TableRow key={stove.id}>
                      <TableCell>
                        <span
                          className="truncate max-w-[80px] block cursor-pointer"
                          title={stove.id}
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {String(stove.id).length > 10
                            ? `${String(stove.id).slice(0, 10)}...`
                            : stove.id}
                        </span>
                      </TableCell>
                      <TableCell>{stove.stove_id}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            stove.status === "sold"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-green-100 text-green-800 border-green-200"
                          }
                        >
                          {stove.status.charAt(0).toUpperCase() +
                            stove.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {formatDate(stove.created_at)}
                        {stove.sale_id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="View Sale"
                            onClick={() => handleViewSale(stove.sale_id)}
                            className="ml-2"
                            disabled={
                              saleLoading && loadingSaleId !== stove.sale_id
                            }
                          >
                            {saleLoading && loadingSaleId === stove.sale_id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Sale Detail Sidebar */}
          {showSaleSidebar && selectedSale && (
            <SalesDetailSidebar
              sale={selectedSale}
              isOpen={showSaleSidebar}
              onClose={() => {
                setShowSaleSidebar(false);
                setSelectedSale(null);
              }}
            />
          )}

          {/* Close Button */}
          <Button variant="ghost" onClick={onClose} className="w-full mt-6">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StoveIdsSidebar;
