"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  Plus,
  Search,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Save,
  Calendar,
  CreditCard as CreditCardIcon,
  Clock,
  Building2,
} from "lucide-react";
import paymentModelService from "../services/paymentModelService";

interface PaymentModel {
  id: string;
  name: string;
  description: string | null;
  duration_months: number;
  fixed_price: number;
  min_down_payment: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: { id: string; full_name: string; email: string };
  assigned_organizations_count?: number;
}

interface FormData {
  name: string;
  description: string;
  duration_months: string;
  fixed_price: string;
  min_down_payment: string;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  duration_months: "",
  fixed_price: "",
  min_down_payment: "0",
};

export default function PaymentModelsPage() {
  const { userRole } = useAuth();
  const { toast } = useToast();

  const [models, setModels] = useState<PaymentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<PaymentModel | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const result = await paymentModelService.getPaymentModels({
        show_all: showAll ? "true" : "false",
        search: searchTerm,
      });
      setModels(result.data || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Failed to load payment models" });
    } finally {
      setLoading(false);
    }
  }, [showAll, searchTerm, toast]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      setFormError("");

      if (!formData.name.trim()) { setFormError("Name is required"); return; }
      if (!formData.duration_months || parseInt(formData.duration_months) < 1) { setFormError("Duration must be at least 1 month"); return; }
      if (!formData.fixed_price || parseFloat(formData.fixed_price) <= 0) { setFormError("Fixed price must be greater than 0"); return; }

      await paymentModelService.createPaymentModel({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration_months: parseInt(formData.duration_months),
        fixed_price: parseFloat(formData.fixed_price),
        min_down_payment: parseFloat(formData.min_down_payment) || 0,
      });

      toast({ variant: "success", title: "Payment model created successfully" });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchModels();
    } catch (err: any) {
      setFormError(err.message || "Failed to create payment model");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedModel) return;
    try {
      setSaving(true);
      setFormError("");

      await paymentModelService.updatePaymentModel(selectedModel.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration_months: parseInt(formData.duration_months),
        fixed_price: parseFloat(formData.fixed_price),
        min_down_payment: parseFloat(formData.min_down_payment) || 0,
      });

      toast({ variant: "success", title: "Payment model updated successfully" });
      setShowEditModal(false);
      setSelectedModel(null);
      fetchModels();
    } catch (err: any) {
      setFormError(err.message || "Failed to update payment model");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedModel) return;
    try {
      setSaving(true);
      await paymentModelService.deletePaymentModel(selectedModel.id);
      toast({ variant: "success", title: "Payment model deleted/deactivated" });
      setShowDeleteModal(false);
      setSelectedModel(null);
      fetchModels();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Failed to delete" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (model: PaymentModel) => {
    try {
      await paymentModelService.updatePaymentModel(model.id, {
        is_active: !model.is_active,
      });
      toast({
        variant: "success",
        title: `Payment model ${model.is_active ? "deactivated" : "activated"}`,
      });
      fetchModels();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Failed to toggle status" });
    }
  };

  const openEditModal = (model: PaymentModel) => {
    setSelectedModel(model);
    setFormData({
      name: model.name,
      description: model.description || "",
      duration_months: String(model.duration_months),
      fixed_price: String(model.fixed_price),
      min_down_payment: String(model.min_down_payment),
    });
    setFormError("");
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setFormData(initialFormData);
    setFormError("");
    setShowCreateModal(true);
  };

  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  // Format a raw number string with commas for display in inputs
  const formatAmountInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-NG");
  };

  // Strip commas to get raw number string for state
  const parseAmountInput = (value: string) => {
    return value.replace(/[^0-9]/g, "");
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // Stats
  const activeCount = models.filter((m) => m.is_active).length;
  const inactiveCount = models.filter((m) => !m.is_active).length;

  return (
    <ProtectedRoute requireSuperAdmin>
      <DashboardLayout currentRoute="payment-models">
        <div className="p-6 space-y-6">
          {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-7 w-7 text-brand" />
            Payment Models
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage installment payment plans for partner organizations
          </p>
        </div>
        {userRole === "super_admin" && (
          <Button onClick={openCreateModal} className="bg-brand hover:bg-brand/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Model
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-lg">
              <Layers className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Models</p>
              <p className="text-xl font-bold text-gray-900">{models.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <ToggleRight className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-xl font-bold text-green-600">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-xl font-bold text-gray-400">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className={showAll ? "bg-brand hover:bg-brand/90 text-white" : ""}
          >
            {showAll ? "All Models" : "Active Only"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-brand/5">
              <TableHead className="font-semibold text-brand">Name</TableHead>
              <TableHead className="font-semibold text-brand">Fixed Price</TableHead>
              <TableHead className="font-semibold text-brand">Duration</TableHead>
              <TableHead className="font-semibold text-brand">Min Down Payment</TableHead>
              <TableHead className="font-semibold text-brand">Status</TableHead>
              <TableHead className="font-semibold text-brand">Created</TableHead>
              <TableHead className="font-semibold text-brand text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand" />
                  <p className="text-sm text-gray-500 mt-2">Loading payment models...</p>
                </TableCell>
              </TableRow>
            ) : models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Layers className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No payment models found</p>
                </TableCell>
              </TableRow>
            ) : (
              models.map((model, idx) => (
                <TableRow
                  key={model.id}
                  className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} ${
                    !model.is_active ? "opacity-60" : ""
                  }`}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{model.name}</p>
                      {model.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                          {model.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {formatCurrency(model.fixed_price)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {model.duration_months} month{model.duration_months !== 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {model.min_down_payment > 0
                      ? formatCurrency(model.min_down_payment)
                      : "None"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        model.is_active
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }
                    >
                      {model.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(model.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(model)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(model)}>
                          {model.is_active ? (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedModel(model);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <Dialog
          open={showCreateModal || showEditModal}
          onOpenChange={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedModel(null);
            setFormError("");
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-brand" />
                {showCreateModal ? "Create Payment Model" : "Edit Payment Model"}
              </DialogTitle>
              <DialogDescription>
                {showCreateModal
                  ? "Define a new installment payment plan."
                  : `Update "${selectedModel?.name}" payment model.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name *</Label>
                <Input
                  id="model-name"
                  placeholder="e.g., Amina Model"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-desc">Description</Label>
                <Input
                  id="model-desc"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model-price" className="flex items-center gap-1">
                    <CreditCardIcon className="h-3 w-3" />
                    Price (₦) *
                  </Label>
                  <Input
                    id="model-price"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g., 80,000"
                    value={formatAmountInput(formData.fixed_price)}
                    onChange={(e) => setFormData({ ...formData, fixed_price: parseAmountInput(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model-duration" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Duration (months) *
                  </Label>
                  <Input
                    id="model-duration"
                    type="number"
                    placeholder="e.g., 6"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-downpayment">Minimum Down Payment (₦)</Label>
                <Input
                  id="model-downpayment"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatAmountInput(formData.min_down_payment)}
                  onChange={(e) => setFormData({ ...formData, min_down_payment: parseAmountInput(e.target.value) })}
                />
                <p className="text-xs text-gray-500">Leave at 0 if no minimum is required</p>
              </div>

              {formData.fixed_price && formData.duration_months && (
                <div className="bg-brand/5 border border-brand/20 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    Monthly payment:{" "}
                    <span className="font-semibold text-brand">
                      {formatCurrency(
                        Math.ceil(
                          parseFloat(formData.fixed_price) /
                            parseInt(formData.duration_months)
                        )
                      )}
                    </span>
                    <span className="text-gray-500"> / month</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={showCreateModal ? handleCreate : handleEdit}
                disabled={saving}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {showCreateModal ? "Create" : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedModel && (
        <Dialog open onOpenChange={() => setShowDeleteModal(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Payment Model
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedModel.name}&quot;? If this
                model has associated sales, it will be deactivated instead.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
