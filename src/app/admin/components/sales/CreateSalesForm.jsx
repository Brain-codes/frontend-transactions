"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Package,
  MapPin,
  Camera,
  PenTool,
  CheckCircle2,
  ArrowLeft,
  Upload,
  FileText,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import DateRangePicker from "@/app/components/ui/date-range-picker";
import GooglePlacesInput from "@/app/components/ui/google-places-input";
import { lgaAndStates } from "../../../constants";
import adminSalesService from "../../../services/adminSalesService";
import profileService from "../../../services/profileService";
import { validateSalesForm } from "../../../utils/salesFormValidation";
import {
  createInitialFormData,
  populateFormDataForEdit,
  transformFormDataForAPI,
  hasFormDataChanged,
} from "../../../utils/salesFormUtils";
import {
  loadProfileData,
  getOrganizationId,
} from "../../../utils/profileUtils";
import ImageUploadSection from "../../../components/ui/ImageUploadSection";
import SignatureCanvas from "../../../components/ui/SignatureCanvas";

const CreateSalesForm = ({
  onSuccess,
  onCancel,
  isModal = false,
  showSuccessState = true,
  mode = "create", // "create" or "edit"
  initialData = null, // existing sale data for edit mode
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableStoves, setAvailableStoves] = useState([]);
  const [stovesLoading, setStovesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form data based on mode
  const [formData, setFormData] = useState(createInitialFormData());
  const [originalFormData, setOriginalFormData] = useState(null); // For edit mode comparison
  const initializedRef = useRef(false); // Track if form has been initialized
  const [isInitializing, setIsInitializing] = useState(false); // Track if we're currently initializing

  // File refs and states - now using extracted components
  const [stoveImagePreview, setStoveImagePreview] = useState(null);
  const [agreementImagePreview, setAgreementImagePreview] = useState(null);
  const [uploadingImages, setUploadingImages] = useState({
    stove: false,
    agreement: false,
  });

  // Validation state
  const [errors, setErrors] = useState({});

  // Stove search state
  const [stoveSearchTerm, setStoveSearchTerm] = useState("");
  const [showStoveDropdown, setShowStoveDropdown] = useState(false);
  const [filteredStoves, setFilteredStoves] = useState([]);

  // Determine if this is edit mode
  const isEditMode = mode === "edit" && initialData;

  // Get states from constants
  const nigerianStates = Object.keys(lgaAndStates).sort();

  // Filter stoves based on search term
  useEffect(() => {
    if (stoveSearchTerm.trim() === "") {
      setFilteredStoves(availableStoves);
    } else {
      const filtered = availableStoves.filter((stove) =>
        stove.stove_id.toLowerCase().includes(stoveSearchTerm.toLowerCase())
      );
      setFilteredStoves(filtered);
    }
  }, [stoveSearchTerm, availableStoves]);

  // Close stove dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".stove-search-container")) {
        setShowStoveDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize form data on mount
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return;

    const initializeForm = async () => {
      try {
        setIsInitializing(true); // Start initialization
        if (isEditMode && initialData) {
          // Edit mode: populate form with existing data
          const populatedData = await populateFormDataForEdit(initialData);
          setFormData(populatedData);
          setOriginalFormData(populatedData);

          // Set image previews if they exist
          if (initialData.stove_image_id?.url) {
            setStoveImagePreview(initialData.stove_image_id.url);
          } else if (initialData.stove_image) {
            setStoveImagePreview(initialData.stove_image);
          }

          if (initialData.agreement_image_id?.url) {
            setAgreementImagePreview(initialData.agreement_image_id.url);
          } else if (initialData.agreement_image) {
            setAgreementImagePreview(initialData.agreement_image);
          }

          // Set stove search term to current stove serial
          if (initialData.stove_serial_no) {
            setStoveSearchTerm(initialData.stove_serial_no);
          }

          // For edit mode, create a single-item stove list with current stove
          if (initialData?.stove_serial_no) {
            setAvailableStoves([{ stove_id: initialData.stove_serial_no }]);
            setFilteredStoves([{ stove_id: initialData.stove_serial_no }]);
          }
          setStovesLoading(false);
        } else if (!isEditMode) {
          // Create mode: load profile data and generate transaction ID
          const profileData = await loadProfileData();

          // Generate transaction ID
          const generateTransactionId = () => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let result = "";
            for (let i = 0; i < 6; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
          };

          setFormData((prev) => ({
            ...prev,
            transactionId: generateTransactionId(),
            partnerName: profileData?.organizationName || "",
          }));

          // Fetch available stoves for create mode
          fetchAvailableStoves();
        }

        initializedRef.current = true;
        setIsInitializing(false); // End initialization
      } catch (error) {
        console.error("Error initializing form:", error);
        setError("Failed to initialize form data");
        setIsInitializing(false); // End initialization even on error
      }
    };

    initializeForm();
  }, [isEditMode, initialData?.id]); // Only depend on the ID to prevent infinite loops

  // Reset initialization flag when mode or data changes
  useEffect(() => {
    initializedRef.current = false;
  }, [mode, initialData?.id]);

  // Check and fetch profile if not already stored
  useEffect(() => {
    const checkProfile = async () => {
      const profile = profileService.getStoredProfileData();
      if (!profile) {
        // If no profile is stored, try to fetch it
        const result = await profileService.fetchAndStoreProfile();
        if (!result.success) {
          setError("Failed to load user profile. Please log in again.");
        }
      }
    };

    checkProfile();
  }, []);

  const fetchAvailableStoves = async () => {
    try {
      setStovesLoading(true);

      // Get organization ID from stored profile
      const organizationId = profileService.getOrganizationId();

      if (!organizationId) {
        setError("Organization ID not found. Please log in again.");
        return;
      }

      // Fetch stoves with organization ID and "available" status
      const response = await adminSalesService.getAvailableStoveIds(
        organizationId,
        "available"
      );

      if (response.success) {
        setAvailableStoves(response.data || []);
      } else {
        setError("Failed to load available stoves");
      }
    } catch (err) {
      console.error("Error fetching stoves:", err);
      setError("An error occurred while loading available stoves");
    } finally {
      setStovesLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleAddressSelect = (addressData) => {
    setFormData((prev) => ({
      ...prev,
      addressData: {
        fullAddress: addressData.fullAddress || "",
        street: addressData.street || "",
        city: addressData.city || "",
        state: addressData.state || "",
        country: addressData.country || "Nigeria",
        latitude: addressData.latitude || null,
        longitude: addressData.longitude || null,
      },
    }));

    // Clear address error when valid address is selected
    if (errors.address || errors.location) {
      setErrors((prev) => ({
        ...prev,
        address: null,
        location: null,
      }));
    }
  };

  const handleStateChange = (stateValue) => {
    setFormData((prev) => ({
      ...prev,
      stateBackup: stateValue,
      // Only reset LGA if we're not initializing the form
      lgaBackup: isInitializing ? prev.lgaBackup : "",
    }));
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;

    try {
      setUploadingImages((prev) => ({ ...prev, [type]: true }));

      // Use the correct type names to match Flutter
      const uploadType = type === "stove" ? "stoveImage" : "agreementImage";

      // Upload image using form data (matching Flutter implementation)
      const response = await adminSalesService.uploadImage(file, uploadType);

      if (response.success) {
        const field = type === "stove" ? "stoveImageId" : "agreementImageId";
        // The response should contain the upload data with id
        const uploadData = response.data.upload || response.data;
        setFormData((prev) => ({ ...prev, [field]: uploadData.id }));

        // Set preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (type === "stove") {
            setStoveImagePreview(e.target.result);
          } else {
            setAgreementImagePreview(e.target.result);
          }
        };
        reader.readAsDataURL(file);
      } else {
        setError(`Failed to upload ${type} image`);
      }
    } catch (err) {
      console.error(`Error uploading ${type} image:`, err);
      setError(`An error occurred while uploading ${type} image`);
    } finally {
      setUploadingImages((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Signature handlers - now handled by SignatureCanvas component
  const handleSignatureChange = (signatureData) => {
    setFormData((prev) => ({ ...prev, signature: signatureData }));
  };

  const validateForm = () => {
    const newErrors = validateSalesForm(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // For edit mode, check if any changes were made
    if (
      isEditMode &&
      originalFormData &&
      !hasFormDataChanged(formData, originalFormData)
    ) {
      setError("No changes detected to save");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Transform form data for API
      const apiData = transformFormDataForAPI(formData);

      let response;
      if (isEditMode) {
        response = await adminSalesService.updateSale(initialData.id, apiData);
      } else {
        response = await adminSalesService.createSale(apiData);
      }

      if (response.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(response.data);
        }
        // If it's a modal, don't show success state, let parent handle it
        if (isModal && onSuccess) {
          return;
        }
      } else {
        setError(
          response.error || `Failed to ${isEditMode ? "update" : "create"} sale`
        );
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} sale:`, err);
      setError(
        `An unexpected error occurred while ${
          isEditMode ? "updating" : "creating"
        } the sale`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (!isModal) {
      router.push("/admin/sales");
    }
  };

  // Success state - only show if showSuccessState is true and not modal
  if (success && showSuccessState && !isModal) {
    return (
      <div className="h-[70dvh] flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sale Created Successfully!
          </h2>
          <p className="text-gray-600 mb-4">
            The sale has been recorded and will be processed.
          </p>
          <Button onClick={() => router.push("/admin/sales")}>
            View Sales
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isModal ? "max-w-4xl mx-auto" : "max-w-4xl mx-auto"} p-6`}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Transaction Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Transaction Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionId">
                  Transaction ID (Invoice Number)
                  {isEditMode && (
                    <span className="text-gray-500 text-sm ml-2">
                      (Not editable)
                    </span>
                  )}
                </Label>
                <Input
                  id="transactionId"
                  value={formData.transactionId}
                  placeholder="Auto-generated"
                  className="bg-gray-50"
                  readOnly
                />
                {errors.transactionId && (
                  <p className="text-sm text-red-600">{errors.transactionId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesDate">Sales Date *</Label>
                <Input
                  id="salesDate"
                  type="date"
                  value={formData.salesDate}
                  onChange={(e) =>
                    handleInputChange("salesDate", e.target.value)
                  }
                  className={errors.salesDate ? "border-red-500" : ""}
                />
                {errors.salesDate && (
                  <p className="text-sm text-red-600">{errors.salesDate}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Person / Buyer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Person / Buyer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">
                  Contact Person / Buyer Name *
                </Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) =>
                    handleInputChange("contactPerson", e.target.value)
                  }
                  placeholder="Enter contact person name"
                  className={errors.contactPerson ? "border-red-500" : ""}
                />
                {errors.contactPerson && (
                  <p className="text-sm text-red-600">{errors.contactPerson}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone Number *</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    handleInputChange("contactPhone", e.target.value)
                  }
                  placeholder="e.g., +234 803 123 4567"
                  className={errors.contactPhone ? "border-red-500" : ""}
                />
                {errors.contactPhone && (
                  <p className="text-sm text-red-600">{errors.contactPhone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* End User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              End User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endUserName">End User Name *</Label>
                <Input
                  id="endUserName"
                  value={formData.endUserName}
                  onChange={(e) =>
                    handleInputChange("endUserName", e.target.value)
                  }
                  placeholder="Enter end user name"
                  className={errors.endUserName ? "border-red-500" : ""}
                />
                {errors.endUserName && (
                  <p className="text-sm text-red-600">{errors.endUserName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="aka">AKA (Also Known As)</Label>
                <Input
                  id="aka"
                  value={formData.aka}
                  onChange={(e) => handleInputChange("aka", e.target.value)}
                  placeholder="Enter any alias or nickname"
                />
                {errors.aka && (
                  <p className="text-sm text-red-600">{errors.aka}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">End User Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="e.g., +234 803 123 4567"
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sale Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sale Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Sale Amount (₦) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="Enter sale amount"
                  min="0"
                  step="0.01"
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stoveSerialNo">
                  Stove Serial Number *
                  {isEditMode && (
                    <span className="text-gray-500 text-sm ml-2">
                      (Not editable)
                    </span>
                  )}
                </Label>
                {isEditMode ? (
                  // Read-only display for edit mode
                  <Input
                    id="stoveSerialNo"
                    value={formData.stoveSerialNo || stoveSearchTerm}
                    placeholder="Stove Serial Number"
                    className="bg-gray-50"
                    readOnly
                    disabled
                  />
                ) : (
                  // Searchable dropdown for create mode
                  <div className="relative stove-search-container">
                    <Input
                      id="stoveSerialNo"
                      value={stoveSearchTerm}
                      onChange={(e) => {
                        setStoveSearchTerm(e.target.value);
                        setShowStoveDropdown(true);
                      }}
                      onFocus={() => setShowStoveDropdown(true)}
                      placeholder={
                        stovesLoading
                          ? "Loading stoves..."
                          : "Type to search stoves..."
                      }
                      className={errors.stoveSerialNo ? "border-red-500" : ""}
                      disabled={stovesLoading}
                    />
                    {showStoveDropdown && filteredStoves.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredStoves.map((stove) => (
                          <div
                            key={stove.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                stoveSerialNo: stove.stove_id,
                              }));
                              setStoveSearchTerm(stove.stove_id);
                              setShowStoveDropdown(false);
                              // Clear error
                              if (errors.stoveSerialNo) {
                                setErrors((prev) => ({
                                  ...prev,
                                  stoveSerialNo: null,
                                }));
                              }
                            }}
                          >
                            {stove.stove_id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {errors.stoveSerialNo && (
                  <p className="text-sm text-red-600">{errors.stoveSerialNo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="partnerName">Partner Name</Label>
                <Input
                  id="partnerName"
                  value={formData.partnerName}
                  onChange={(e) =>
                    handleInputChange("partnerName", e.target.value)
                  }
                  //   placeholder="Loaded from profile"
                  className="bg-gray-50"
                  readOnly
                />
                {errors.partnerName && (
                  <p className="text-sm text-red-600">{errors.partnerName}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.stateBackup}
                  onValueChange={handleStateChange}
                >
                  <SelectTrigger
                    className={errors.stateBackup ? "border-red-500" : ""}
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
                {errors.stateBackup && (
                  <p className="text-sm text-red-600">{errors.stateBackup}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lga">LGA *</Label>
                <Select
                  value={formData.lgaBackup}
                  onValueChange={(value) =>
                    handleInputChange("lgaBackup", value)
                  }
                  disabled={!formData.stateBackup}
                >
                  <SelectTrigger
                    className={errors.lgaBackup ? "border-red-500" : ""}
                  >
                    <SelectValue
                      placeholder={
                        formData.stateBackup
                          ? "Select LGA"
                          : "Select state first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.stateBackup &&
                      lgaAndStates[formData.stateBackup]?.map((lga) => (
                        <SelectItem key={lga} value={lga}>
                          {lga}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.lgaBackup && (
                  <p className="text-sm text-red-600">{errors.lgaBackup}</p>
                )}
              </div>
            </div>

            {/* Google Places Address Input */}
            <div className="space-y-2">
              <Label htmlFor="address">Residential Address *</Label>
              <GooglePlacesInput
                value={formData.addressData.fullAddress}
                onChange={handleAddressSelect}
                placeholder="Start typing to search for address in Nigeria..."
                className={`w-full ${errors.address ? "border-red-500" : ""}`}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address}</p>
              )}
              {errors.location && (
                <p className="text-sm text-red-600">{errors.location}</p>
              )}

              {/* Display GPS coordinates if available (non-editable) */}
              {formData.addressData.latitude &&
                formData.addressData.longitude && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Full Address:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4 w-full">
                      {formData.addressData.fullAddress}
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      GPS Coordinates:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Latitude:</span>{" "}
                        {formData.addressData.latitude}
                      </div>
                      <div>
                        <span className="font-medium">Longitude:</span>{" "}
                        {formData.addressData.longitude}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Images and Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stove Image */}
            <ImageUploadSection
              label="Stove Photo *"
              preview={stoveImagePreview}
              uploading={uploadingImages.stove}
              onUpload={(file) => handleImageUpload(file, "stove")}
              placeholder="Upload a clear photo of the stove"
              error={errors.stoveImage}
            />

            {/* Agreement Document */}
            <ImageUploadSection
              label="Agreement Document *"
              preview={agreementImagePreview}
              uploading={uploadingImages.agreement}
              onUpload={(file) => handleImageUpload(file, "agreement")}
              placeholder="Upload the signed agreement document"
              error={errors.agreementImage}
              uploadIcon={FileText}
              buttonText="Upload Agreement"
              changeButtonText="Change Document"
            />
          </CardContent>
        </Card>

        {/* Digital Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Digital Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignatureCanvas
              signature={formData.signature}
              onSignatureChange={handleSignatureChange}
              error={errors.signature}
              label="Customer Signature *"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-brand hover:bg-brand-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? "Updating Sale..." : "Creating Sale..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? "Update Sale" : "Create Sale"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateSalesForm;
