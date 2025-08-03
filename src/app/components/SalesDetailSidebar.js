"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Phone,
  Mail,
  Package,
  FileText,
  Download,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const SalesDetailSidebar = ({ sale, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!sale) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      shipped: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return colors[status?.toLowerCase()] || colors.active;
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: CheckCircle,
      pending: Clock,
      completed: CheckCircle,
      cancelled: AlertCircle,
      shipped: Package,
    };
    const Icon = icons[status?.toLowerCase()] || CheckCircle;
    return <Icon className="h-4 w-4" />;
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "customer", label: "Customer" },
    { id: "product", label: "Product" },
    { id: "payment", label: "Payment" },
  ];

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    console.log(`${label} copied to clipboard: ${text}`);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl transform transition-all duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } ${isOpen ? "w-full sm:w-[90vw] md:w-[500px] lg:w-[600px]" : "w-0"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Sale Details
              </h2>
              <p className="text-sm text-gray-600 mt-1 truncate">
                {sale.stove_serial_no || "Atmosfair Product"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/50 flex-shrink-0 ml-4"
            >
              <X className="h-5 w-5 text-gray-800" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === "overview" && (
              <div className="space-y-4 sm:space-y-6">
                {/* Status & Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <CardTitle className="text-base sm:text-lg">
                        Status & Actions
                      </CardTitle>
                      <Badge
                        className={getStatusColor(sale.status || "active")}
                      >
                        {getStatusIcon(sale.status || "active")}
                        <span className="ml-1">{sale.status || "Active"}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="text-xs sm:text-sm">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs sm:text-sm"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Export</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs sm:text-sm"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Copy ID</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs sm:text-sm"
                      >
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">External</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Image */}
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="relative h-32 sm:h-48 w-full bg-gray-100 rounded-lg overflow-hidden">
                      {sale.stove_image?.url ? (
                        <Image
                          src={sale.stove_image.url}
                          alt={sale.stove_serial_no || "Atmosfair Product"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 500px) 100vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <Package className="h-8 w-8 sm:h-16 sm:w-16 text-blue-400" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Sale Date
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatDate(sale.sales_date || sale.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-3 text-gray-400" />
                          <span className="text-sm text-gray-600">Amount</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(sale.amount || sale.price || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Customer
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {sale.end_user_name || sale.contact_person || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Location
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {sale.address?.state || sale.state_backup || "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "customer" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Full Name
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {sale.end_user_name || sale.contact_person || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Phone Number
                        </label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-900">
                            {sale.phone || sale.contact_phone || "N/A"}
                          </p>
                          {(sale.phone || sale.contact_phone) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  sale.phone || sale.contact_phone,
                                  "Phone"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Email
                        </label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-900">
                            {sale.email || sale.contact_email || "N/A"}
                          </p>
                          {(sale.email || sale.contact_email) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  sale.email || sale.contact_email,
                                  "Email"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Address
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {sale.address?.full_address ||
                            `${sale.address?.street || ""} ${
                              sale.address?.city || ""
                            } ${
                              sale.address?.state || sale.state_backup || ""
                            } ${sale.address?.country || "Nigeria"}`.trim() ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "product" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Serial Number
                        </label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-mono text-gray-900">
                            {sale.stove_serial_no || "N/A"}
                          </p>
                          {sale.stove_serial_no && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  sale.stove_serial_no,
                                  "Serial Number"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Product Type
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {sale.product_type ||
                            sale.stove_type ||
                            "Atmosfair Stove"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Partner
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {sale.partner_name || sale.partner || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Description
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {sale.description ||
                            sale.notes ||
                            "No description available"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Total Amount
                        </label>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                          {formatCurrency(sale.amount || sale.price || 0)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Payment Method
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {sale.payment_method || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Payment Status
                        </label>
                        <Badge
                          className={getStatusColor(
                            sale.payment_status || sale.status || "pending"
                          )}
                          size="sm"
                        >
                          {sale.payment_status || sale.status || "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Transaction ID
                        </label>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-mono text-gray-900">
                            {sale.transaction_id || sale.id || "N/A"}
                          </p>
                          {(sale.transaction_id || sale.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  sale.transaction_id || sale.id,
                                  "Transaction ID"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Payment Date
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {formatDate(
                            sale.payment_date ||
                              sale.sales_date ||
                              sale.created_at
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Receipt
                    </Button>
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesDetailSidebar;
