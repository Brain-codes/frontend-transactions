"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import { X, Plus, Save } from "lucide-react";
import { lgaAndStates } from "../constants";

const OrganizationFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
  submitLoading = false, // Add separate prop for submit loading
}) => {
  const [formData, setFormData] = useState({
    organization_name: "",
    partner_name: "",
    partner_email: "",
    branch: "", // Required
    contact_phone: "", // Required
    state: "", // Required
    contact_person: "", // Optional
    alternative_phone: "", // Optional
    email: "", // Optional
    address: "",
    city: "",
    country: "Nigeria",
    description: "",
    status: "active",
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        organization_name:
          initialData.organization_name || initialData.name || "",
        partner_name: initialData.partner_name || "",
        partner_email: initialData.partner_email || "",
        branch: initialData.branch || "",
        contact_phone: initialData.contact_phone || "",
        state: initialData.state || "",
        contact_person: initialData.contact_person || "",
        alternative_phone: initialData.alternative_phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
        city: initialData.city || "",
        country: initialData.country || "Nigeria",
        description: initialData.description || "",
        status: initialData.status || "active",
      });
    } else {
      // Reset form for new organization
      setFormData({
        organization_name: "",
        partner_name: "",
        partner_email: "",
        branch: "",
        contact_phone: "",
        state: "",
        contact_person: "",
        alternative_phone: "",
        email: "",
        address: "",
        city: "",
        country: "Nigeria",
        description: "",
        status: "active",
      });
    }
    // Clear any existing errors when form data changes
    setErrors({});
  }, [initialData, isOpen]);

  const [errors, setErrors] = useState({});

  const nigerianStates = Object.keys(lgaAndStates).sort();

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.organization_name.trim()) {
      newErrors.organization_name = "Organization name is required";
    }

    if (!formData.partner_name.trim()) {
      newErrors.partner_name = "Partner name is required";
    }

    if (!formData.partner_email.trim()) {
      newErrors.partner_email = "Partner email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.partner_email)) {
      newErrors.partner_email = "Please enter a valid email address";
    }

    if (!formData.branch.trim()) {
      newErrors.branch = "Branch is required";
    }

    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = "Contact phone is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    // Field length validations
    if (formData.organization_name.length > 100) {
      newErrors.organization_name =
        "Organization name must be 100 characters or less";
    }

    if (formData.partner_name.length > 100) {
      newErrors.partner_name = "Partner name must be 100 characters or less";
    }

    if (formData.branch.length > 100) {
      newErrors.branch = "Branch must be 100 characters or less";
    }

    if (formData.contact_phone && formData.contact_phone.length > 20) {
      newErrors.contact_phone = "Contact phone must be 20 characters or less";
    }

    if (formData.contact_person && formData.contact_person.length > 100) {
      newErrors.contact_person =
        "Contact person must be 100 characters or less";
    }

    if (formData.alternative_phone && formData.alternative_phone.length > 20) {
      newErrors.alternative_phone =
        "Alternative phone must be 20 characters or less";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.address && formData.address.length > 255) {
      newErrors.address = "Address must be 255 characters or less";
    }

    if (formData.city && formData.city.length > 100) {
      newErrors.city = "City must be 100 characters or less";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up form data - remove empty strings
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    // Call onSubmit but don't close modal - parent will handle success/error
    onSubmit(cleanedData);
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <Modal
      open={isOpen}
      onOpenChange={handleClose}
      title={
        isEditing ? (
          <span className="flex items-center gap-2">
            <Save className="h-5 w-5" /> Edit Organization
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add New Organization
          </span>
        )
      }
      description={
        isEditing
          ? "Update the organization details below."
          : "Fill in the information below to create a new partner."
      }
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6 mt-2">
        {/* Required Fields */}
        <div className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="organization_name" className="text-gray-700">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="organization_name"
              value={formData.organization_name}
              onChange={(e) =>
                handleInputChange("organization_name", e.target.value)
              }
              placeholder="Enter organization name"
              maxLength={100}
              className={`text-sm text-gray-600 ${
                errors.organization_name ? "border-red-500" : ""
              }`}
            />
            {errors.organization_name && (
              <p className="text-xs text-red-500">{errors.organization_name}</p>
            )}
          </div>

          {/* Partner Name */}
          <div className="space-y-2">
            <Label htmlFor="partner_name" className="text-gray-700">
              Partner Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="partner_name"
              value={formData.partner_name}
              onChange={(e) =>
                handleInputChange("partner_name", e.target.value)
              }
              placeholder="Enter partner name"
              maxLength={100}
              className={`text-sm text-gray-600 ${
                errors.partner_name ? "border-red-500" : ""
              }`}
            />
            {errors.partner_name && (
              <p className="text-xs text-red-500">{errors.partner_name}</p>
            )}
          </div>

          {/* Partner Email */}
          <div className="space-y-2">
            <Label htmlFor="partner_email" className="text-gray-700">
              Partner Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="partner_email"
              type="email"
              value={formData.partner_email}
              onChange={(e) =>
                handleInputChange("partner_email", e.target.value)
              }
              placeholder="partner@organization.com"
              className={` text-sm text-gray-600 ${
                errors.partner_email ? "border-red-500" : ""
              }`}
            />
            {errors.partner_email && (
              <p className="text-xs text-red-500">{errors.partner_email}</p>
            )}
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label htmlFor="branch" className="text-gray-700">
              Branch <span className="text-red-500">*</span>
            </Label>
            <Input
              id="branch"
              value={formData.branch}
              onChange={(e) => handleInputChange("branch", e.target.value)}
              placeholder="Enter branch name"
              maxLength={100}
              className={`text-sm text-gray-600 ${
                errors.branch ? "border-red-500" : ""
              }`}
            />
            {errors.branch && (
              <p className="text-xs text-red-500">{errors.branch}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contact_phone" className="text-gray-700">
              Contact Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) =>
                handleInputChange("contact_phone", e.target.value)
              }
              placeholder="+234123456789"
              maxLength={20}
              className={`text-sm text-gray-600 ${
                errors.contact_phone ? "border-red-500" : ""
              }`}
            />
            {errors.contact_phone && (
              <p className="text-xs text-red-500">{errors.contact_phone}</p>
            )}
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state" className="text-gray-700">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.state}
              onValueChange={(value) => handleInputChange("state", value)}
            >
              <SelectTrigger
                className={`text-sm text-gray-600 ${
                  errors.state ? "border-red-500" : ""
                }`}
              >
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {nigerianStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-xs text-red-500">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Additional Contact Information */}
        <div className="space-y-4">
          {/* Contact Person */}
          <div className="space-y-2">
            <Label htmlFor="contact_person" className="text-gray-700">
              Contact Person
            </Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) =>
                handleInputChange("contact_person", e.target.value)
              }
              placeholder="John Doe"
              maxLength={100}
              className={`text-sm text-gray-600 ${
                errors.contact_person ? "border-red-500" : ""
              }`}
            />
            {errors.contact_person && (
              <p className="text-xs text-red-500">{errors.contact_person}</p>
            )}
          </div>

          {/* Alternative Phone */}
          <div className="space-y-2">
            <Label htmlFor="alternative_phone" className="text-gray-700">
              Alternative Phone
            </Label>
            <Input
              id="alternative_phone"
              value={formData.alternative_phone}
              onChange={(e) =>
                handleInputChange("alternative_phone", e.target.value)
              }
              placeholder="+234987654321"
              maxLength={20}
              className={`text-sm text-gray-600 ${
                errors.alternative_phone ? "border-red-500" : ""
              }`}
            />
            {errors.alternative_phone && (
              <p className="text-xs text-red-500">{errors.alternative_phone}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">
              Contact Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="contact@branch.com"
              className={`text-sm text-gray-600 ${
                errors.email ? "border-red-500" : ""
              }`}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700">
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="123 Business Street"
              maxLength={255}
              className={`text-sm text-gray-600 ${
                errors.address ? "border-red-500" : ""
              }`}
            />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city" className="text-gray-700">
              City
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              placeholder="Lagos"
              maxLength={100}
              className={`text-sm text-gray-600 ${
                errors.city ? "border-red-500" : ""
              }`}
            />
            {errors.city && (
              <p className="text-xs text-red-500">{errors.city}</p>
            )}
          </div>
        </div>

        {/* Additional Information */}
        {/* Description */}
        {/* <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the organization..."
              rows={3}
              maxLength={500}
              className={`text-sm text-gray-600 ${
                errors.description ? "border-red-500" : ""
              }`}
            />
            <div className="flex justify-between text-xs text-gray-500">
              {errors.description && (
                <span className="text-red-500">{errors.description}</span>
              )}
              <span
                className={`ml-auto ${
                  errors.description ? "text-red-500" : ""
                }`}
              >
                {formData.description.length}/500
              </span>
            </div>
          </div>
        </div> */}

        {/* Form Actions */}
        <div className="flex gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={submitLoading} // Disable cancel button when submitting
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={submitLoading}>
            {submitLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? "Updating..." : "Creating..."}
              </div>
            ) : (
              <>
                {isEditing ? (
                  <Save className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isEditing ? "Update" : "Create"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OrganizationFormModal;
