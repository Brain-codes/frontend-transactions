"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Info,
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
import paymentModelService from "../../../services/paymentModelService";

const SectionCard = ({ title, children, className = "" }) => (
  <div className={`bg-muted/30 rounded-lg p-3 border border-border/50 ${className}`}>
    <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-0.5 mb-2">
      {title}
    </h3>
    {children}
  </div>
);

const FieldLabel = ({ children }) => (
  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
    {children}
  </p>
);

const FormField = ({ label, error, children }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    {children}
    {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
  </div>
);

const ReadOnlyTile = ({ label, value }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <p className="text-xs font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
  </div>
);

const CreateSalesForm = ({
  onSuccess,
  onCancel = null,
  cancelHref = "",
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

  // Installment payment state
  const [paymentModels, setPaymentModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("");
  const [initialPaymentProofImageId, setInitialPaymentProofImageId] = useState("");
  const [initialPaymentProofPreview, setInitialPaymentProofPreview] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

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
          // get-sale returns stove_image / agreement_image as objects { url, ... }
          // financial report list returns stove_image_id { url, ... }
          const stoveUrl =
            initialData.stove_image?.url ||
            initialData.stove_image_id?.url ||
            (typeof initialData.stove_image === "string" ? initialData.stove_image : null);
          if (stoveUrl) setStoveImagePreview(stoveUrl);

          const agreementUrl =
            initialData.agreement_image?.url ||
            initialData.agreement_image_id?.url ||
            (typeof initialData.agreement_image === "string" ? initialData.agreement_image : null);
          if (agreementUrl) setAgreementImagePreview(agreementUrl);

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

          // For super admin / ACSL agent, partner name comes from the selection step stored in sessionStorage
          const saaPartnerName =
            typeof sessionStorage !== "undefined"
              ? sessionStorage.getItem("saa_selected_org_name")
              : null;

          setFormData((prev) => ({
            ...prev,
            transactionId: generateTransactionId(),
            partnerName: saaPartnerName || profileData?.partnerName || "",
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

      // Get organization ID from stored profile (or SAA sessionStorage fallback)
      const organizationId =
        profileService.getOrganizationId() ||
        (typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("saa_selected_org_id")
          : null);

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

  // Fetch payment models for the organization (create mode only)
  useEffect(() => {
    if (isEditMode) return;

    const fetchPaymentModels = async () => {
      try {
        setModelsLoading(true);
        const organizationId =
          profileService.getOrganizationId() ||
          (typeof sessionStorage !== "undefined"
            ? sessionStorage.getItem("saa_selected_org_id")
            : null);

        if (!organizationId) return;

        const result = await paymentModelService.getOrgPaymentModels(organizationId);
        if (result.data && result.data.length > 0) {
          // Extract the payment_model from each assignment
          const models = result.data
            .map((a) => a.payment_model)
            .filter((m) => m && m.is_active !== false);
          setPaymentModels(models);
        }
      } catch (err) {
        console.error("Error fetching payment models:", err);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchPaymentModels();
  }, [isEditMode]);

  // Update selected model details when model ID changes
  useEffect(() => {
    if (selectedModelId) {
      const model = paymentModels.find((m) => m.id === selectedModelId);
      setSelectedModel(model || null);
      if (model) {
        // Auto-fill amount with model's fixed price
        handleInputChange("amount", model.fixed_price.toString());
      }
    } else {
      setSelectedModel(null);
    }
  }, [selectedModelId, paymentModels]);

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

  // Handle initial payment proof image upload
  const handleProofImageUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingProof(true);
      const response = await adminSalesService.uploadImage(file, "paymentProof");
      if (response.success) {
        const uploadData = response.data.upload || response.data;
        setInitialPaymentProofImageId(uploadData.id);
        const reader = new FileReader();
        reader.onload = (e) => setInitialPaymentProofPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setError("Failed to upload payment proof image");
      }
    } catch (err) {
      console.error("Error uploading proof image:", err);
      setError("An error occurred while uploading payment proof image");
    } finally {
      setUploadingProof(false);
    }
  };

  // Handle payment type dropdown change
  const handlePaymentTypeChange = (value) => {
    if (value === "full_payment") {
      setIsInstallment(false);
      setSelectedModelId("");
      setSelectedModel(null);
      setInitialPaymentAmount("");
      setInitialPaymentMethod("");
      setInitialPaymentProofImageId("");
      setInitialPaymentProofPreview(null);
      handleInputChange("amount", "");
    } else {
      // value is a payment model ID
      setIsInstallment(true);
      setSelectedModelId(value);
    }
  };

  const formatCurrency = (amount) =>
    `₦${Number(amount).toLocaleString("en-NG")}`;

  // Format a raw number string with commas for display in inputs
  const formatAmountInput = (value) => {
    const digits = String(value).replace(/[^0-9]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-NG");
  };

  // Strip commas to get raw number string
  const parseAmountInput = (value) => {
    return value.replace(/[^0-9]/g, "");
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

    // Validate installment-specific fields
    if (isInstallment) {
      if (!selectedModelId) {
        setError("Please select a payment model for installment payment");
        return;
      }
      if (
        initialPaymentAmount &&
        selectedModel?.min_down_payment > 0 &&
        parseFloat(initialPaymentAmount) < parseFloat(selectedModel.min_down_payment)
      ) {
        setError(
          `Initial payment must be at least ${formatCurrency(selectedModel.min_down_payment)}`
        );
        return;
      }
      if (initialPaymentAmount && parseFloat(initialPaymentAmount) > 0 && !initialPaymentMethod) {
        setError("Please select a payment method for the initial payment");
        return;
      }
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

      // For SAA users who have no profile org_id, include the org from sessionStorage
      const saaOrgId =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("saa_selected_org_id")
          : null;
      if (saaOrgId) {
        apiData.organizationId = saaOrgId;
      }

      // Add installment payment data if applicable
      if (isInstallment && selectedModelId) {
        apiData.isInstallment = true;
        apiData.paymentModelId = selectedModelId;
        if (initialPaymentAmount && parseFloat(initialPaymentAmount) > 0) {
          apiData.initialPaymentAmount = parseFloat(initialPaymentAmount);
          apiData.initialPaymentMethod = initialPaymentMethod || "cash";
          if (initialPaymentProofImageId) {
            apiData.initialPaymentProofImageId = initialPaymentProofImageId;
          }
        }
      }

      let response;
      if (isEditMode) {
        response = await adminSalesService.updateSale(initialData.id, apiData);
      } else {
        response = await adminSalesService.createSale(apiData);
      }

      if (response.success) {
        // Clean up SAA org selection from sessionStorage
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("saa_selected_org_id");
        }
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
    <div className="max-w-4xl mx-auto p-5">
      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Row 1: Transaction Info + Buyer Info */}
        <div className="grid grid-cols-2 gap-3">
          <SectionCard title="Transaction Information">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Transaction ID</FieldLabel>
                <p className="text-xs font-medium text-primary">{formData.transactionId || "Auto-generated"}</p>
                {errors.transactionId && <p className="text-[10px] text-red-500">{errors.transactionId}</p>}
              </div>
              <FormField label="Sales Date *" error={errors.salesDate}>
                <Input
                  type="date"
                  value={formData.salesDate}
                  onChange={(e) => handleInputChange("salesDate", e.target.value)}
                  className={`h-7 text-xs ${errors.salesDate ? "border-red-500" : ""}`}
                />
              </FormField>
              <ReadOnlyTile label="Partner" value={formData.partnerName} />
              <FormField label="Retailer / Branch / CSO" error={null}>
                <Input
                  value={formData.retailerBranch}
                  onChange={(e) => handleInputChange("retailerBranch", e.target.value)}
                  placeholder="Branch or agency"
                  className="h-7 text-xs"
                />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Buyer & End User">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Contact Person / Buyer *" error={errors.contactPerson}>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                  placeholder="Buyer name"
                  className={`h-7 text-xs ${errors.contactPerson ? "border-red-500" : ""}`}
                />
              </FormField>
              <FormField label="Contact Phone *" error={errors.contactPhone}>
                <Input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                  placeholder="+234 803 123 4567"
                  className={`h-7 text-xs ${errors.contactPhone ? "border-red-500" : ""}`}
                />
              </FormField>
              <FormField label="End User Name *" error={errors.endUserName}>
                <Input
                  value={formData.endUserName}
                  onChange={(e) => handleInputChange("endUserName", e.target.value)}
                  placeholder="End user name"
                  className={`h-7 text-xs ${errors.endUserName ? "border-red-500" : ""}`}
                />
              </FormField>
              <FormField label="End User Phone *" error={errors.phone}>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+234 803 123 4567"
                  className={`h-7 text-xs ${errors.phone ? "border-red-500" : ""}`}
                />
              </FormField>
              <FormField label="AKA" error={null}>
                <Input
                  value={formData.aka}
                  onChange={(e) => handleInputChange("aka", e.target.value)}
                  placeholder="Alias or nickname"
                  className="h-7 text-xs"
                />
              </FormField>
            </div>
          </SectionCard>
        </div>

        {/* Row 2: Sale & Payment */}
        <SectionCard title="Sale & Payment">
          <div className="grid grid-cols-4 gap-2">
            {/* Stove serial */}
            <FormField label={`Stove Serial No *${isEditMode ? " (locked)" : ""}`} error={errors.stoveSerialNo}>
              {isEditMode ? (
                <p className="text-xs font-medium">{formData.stoveSerialNo || stoveSearchTerm || <span className="text-muted-foreground">—</span>}</p>
              ) : (
                <div className="relative stove-search-container">
                  <Input
                    value={stoveSearchTerm}
                    onChange={(e) => { setStoveSearchTerm(e.target.value); setShowStoveDropdown(true); }}
                    onFocus={() => setShowStoveDropdown(true)}
                    placeholder={stovesLoading ? "Loading..." : "Search stove ID..."}
                    className={`h-7 text-xs ${errors.stoveSerialNo ? "border-red-500" : ""}`}
                    disabled={stovesLoading}
                  />
                  {showStoveDropdown && filteredStoves.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                      {filteredStoves.map((stove) => (
                        <div
                          key={stove.id}
                          className="px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, stoveSerialNo: stove.stove_id }));
                            setStoveSearchTerm(stove.stove_id);
                            setShowStoveDropdown(false);
                            if (errors.stoveSerialNo) setErrors((prev) => ({ ...prev, stoveSerialNo: null }));
                          }}
                        >
                          {stove.stove_id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </FormField>

            {/* Edit mode: payment type display */}
            {isEditMode && initialData?.is_installment && initialData?.payment_model ? (
              <div className="col-span-2">
                <FieldLabel>Payment Model</FieldLabel>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">
                    {initialData.payment_model.name} — ₦{Number(initialData.payment_model.fixed_price).toLocaleString("en-NG")} / {initialData.payment_model.duration_months} mo
                  </p>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-1.5 py-0">Installment</Badge>
                </div>
              </div>
            ) : isEditMode ? (
              <ReadOnlyTile label="Payment Type" value="Full Payment" />
            ) : paymentModels.length > 0 ? (
              <FormField label="Payment Type *" error={null}>
                <Select value={isInstallment ? selectedModelId : "full_payment"} onValueChange={handlePaymentTypeChange}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_payment">Full Payment</SelectItem>
                    {paymentModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} — {formatCurrency(model.fixed_price)} / {model.duration_months} mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}

            {/* Sale amount */}
            <FormField label={`Sale Amount (₦) *${isInstallment && selectedModel ? " — by model" : ""}`} error={errors.amount}>
              <Input
                type="text"
                inputMode="numeric"
                value={formatAmountInput(formData.amount)}
                onChange={(e) => handleInputChange("amount", parseAmountInput(e.target.value))}
                placeholder="Enter amount"
                className={`h-7 text-xs ${errors.amount ? "border-red-500" : ""} ${(isInstallment && selectedModel) || isEditMode ? "bg-muted/50" : ""}`}
                readOnly={(isInstallment && !!selectedModel) || isEditMode}
              />
            </FormField>
          </div>

          {/* Installment model summary */}
          {isInstallment && selectedModel && (
            <div className="mt-3 space-y-2">
              <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">{selectedModel.name}</p>
                {selectedModel.description && <p className="text-[10px] text-muted-foreground mb-2">{selectedModel.description}</p>}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Price</p>
                    <p className="text-xs font-semibold">{formatCurrency(selectedModel.fixed_price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</p>
                    <p className="text-xs font-semibold">{selectedModel.duration_months} months</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly ~</p>
                    <p className="text-xs font-semibold">{formatCurrency((selectedModel.fixed_price / selectedModel.duration_months).toFixed(0))}</p>
                  </div>
                </div>
                {selectedModel.min_down_payment > 0 && (
                  <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Min. down payment: {formatCurrency(selectedModel.min_down_payment)}
                  </p>
                )}
              </div>

              {/* Initial payment fields */}
              <div className="border-t pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Initial Payment (Optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Amount (₦)" error={null}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatAmountInput(initialPaymentAmount)}
                      onChange={(e) => {
                        const raw = parseAmountInput(e.target.value);
                        if (raw === "" || parseFloat(raw) <= parseFloat(selectedModel.fixed_price)) setInitialPaymentAmount(raw);
                      }}
                      placeholder={selectedModel.min_down_payment > 0 ? `Min: ${formatCurrency(selectedModel.min_down_payment)}` : "Enter amount"}
                      className="h-7 text-xs"
                    />
                    {initialPaymentAmount && selectedModel.min_down_payment > 0 && parseFloat(initialPaymentAmount) < parseFloat(selectedModel.min_down_payment) && (
                      <p className="text-[10px] text-amber-600">Min. {formatCurrency(selectedModel.min_down_payment)}</p>
                    )}
                  </FormField>
                  <FormField label="Method" error={null}>
                    <Select value={initialPaymentMethod} onValueChange={(v) => setInitialPaymentMethod(v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="pos">POS</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
                {initialPaymentAmount && parseFloat(initialPaymentAmount) > 0 && (
                  <div className="mt-2">
                    <ImageUploadSection
                      label="Proof of Payment"
                      preview={initialPaymentProofPreview}
                      uploading={uploadingProof}
                      onUpload={handleProofImageUpload}
                      placeholder="Upload proof of initial payment"
                      uploadIcon={FileText}
                      buttonText="Upload Proof"
                      changeButtonText="Change Proof"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Row 3: Location */}
        <SectionCard title="Location">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="State *" error={errors.stateBackup}>
              <Select value={formData.stateBackup} onValueChange={handleStateChange}>
                <SelectTrigger className={`h-7 text-xs ${errors.stateBackup ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="LGA *" error={errors.lgaBackup}>
              <Select value={formData.lgaBackup} onValueChange={(v) => handleInputChange("lgaBackup", v)} disabled={!formData.stateBackup}>
                <SelectTrigger className={`h-7 text-xs ${errors.lgaBackup ? "border-red-500" : ""}`}>
                  <SelectValue placeholder={formData.stateBackup ? "Select LGA" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {formData.stateBackup && lgaAndStates[formData.stateBackup]?.map((lga) => (
                    <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="col-span-2">
              <FormField label="Residential Address *" error={errors.address || errors.location}>
                <GooglePlacesInput
                  value={formData.addressData}
                  onChange={handleAddressSelect}
                  placeholder="Search for address in Nigeria..."
                  className={`w-full text-xs ${errors.address ? "border-red-500" : ""}`}
                />
              </FormField>
            </div>
            {formData.addressData.latitude && formData.addressData.longitude && (
              <>
                <div>
                  <FieldLabel>Latitude</FieldLabel>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0 font-mono">
                    {formData.addressData.latitude}
                  </Badge>
                </div>
                <div>
                  <FieldLabel>Longitude</FieldLabel>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0 font-mono">
                    {formData.addressData.longitude}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </SectionCard>

        {/* Row 4: Stove Set + Cooking Habits */}
        <div className="grid grid-cols-2 gap-3">
          <SectionCard title="Stove Set">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Pots Quantity" error={null}>
                <Select value={formData.potQuantity.toString()} onValueChange={(v) => handleInputChange("potQuantity", v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 pots</SelectItem>
                    <SelectItem value="1">1 pot</SelectItem>
                    <SelectItem value="2">2 pots</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <div>
                <FieldLabel>Wonderbox (Heat Retention)</FieldLabel>
                <label className="flex items-center gap-1.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={formData.heatRetentionDevice}
                    onChange={(e) => handleInputChange("heatRetentionDevice", e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-brand"
                  />
                  <span className="text-xs text-muted-foreground">Included</span>
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Cooking Habits">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <FieldLabel>Previous Stove Type</FieldLabel>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {[
                    { value: "charcoal", label: "Charcoal" },
                    { value: "wood_stove", label: "Wood (3 stone)" },
                    { value: "other", label: "Other" },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="previousStoveType"
                        value={value}
                        checked={formData.previousStoveType === value}
                        onChange={(e) => handleInputChange("previousStoveType", e.target.value)}
                        className="h-3.5 w-3.5 text-brand"
                      />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </label>
                  ))}
                </div>
                {formData.previousStoveType === "other" && (
                  <Input
                    value={formData.previousStoveOther}
                    onChange={(e) => handleInputChange("previousStoveOther", e.target.value)}
                    placeholder="Describe stove type"
                    className="h-7 text-xs mt-1"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Meals per day" error={null}>
                  <Input value={formData.mealsPerDay} onChange={(e) => handleInputChange("mealsPerDay", e.target.value)} placeholder="e.g., 2 meals" className="h-7 text-xs" />
                </FormField>
                <FormField label="Fuel Source" error={null}>
                  <Input value={formData.cookingFuelSource} onChange={(e) => handleInputChange("cookingFuelSource", e.target.value)} placeholder="e.g., Local market" className="h-7 text-xs" />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Cooking Location" error={null}>
                    <Input value={formData.cookingLocation} onChange={(e) => handleInputChange("cookingLocation", e.target.value)} placeholder="e.g., Outdoors, kitchen" className="h-7 text-xs" />
                  </FormField>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Terms & Conditions */}
        <SectionCard title="Terms & Conditions *" className={errors.termsAccepted ? "border-red-400" : ""}>
          <p className="text-[10px] text-muted-foreground mb-2">All items below must be acknowledged before submitting.</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { key: "poaGoverned", label: "PoA / UNFCCC governed — stove subsidised by Carbon Credits" },
              { key: "monitoring", label: "Agreed to cooperate for monitoring purposes" },
              { key: "noResell", label: "Agreed not to resell the stove" },
              { key: "emissionReductions", label: "Ceded emission reductions to atmosfair gGmbH" },
              { key: "noExport", label: "Agreed not to take stove outside Nigeria" },
              { key: "demonstration", label: "Received demonstration for efficient firewood usage" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.termsAccepted?.[key] ?? false}
                  onChange={(e) => handleInputChange("termsAccepted", { ...formData.termsAccepted, [key]: e.target.checked })}
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-gray-300 text-brand"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground leading-tight">{label}</span>
              </label>
            ))}
          </div>
          {errors.termsAccepted && <p className="text-[10px] text-red-500 mt-1.5">{errors.termsAccepted}</p>}
        </SectionCard>

        {/* Images & Signature */}
        <div className="grid grid-cols-2 gap-3">
          <SectionCard title="Images & Documents">
            <div className="space-y-3">
              <ImageUploadSection
                label="Stove Photo *"
                preview={stoveImagePreview}
                uploading={uploadingImages.stove}
                onUpload={(file) => handleImageUpload(file, "stove")}
                placeholder="Upload a clear photo of the stove"
                error={errors.stoveImage}
              />
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
            </div>
          </SectionCard>

          <SectionCard title="Digital Signature">
            <SignatureCanvas
              signature={formData.signature}
              onSignatureChange={handleSignatureChange}
              error={errors.signature}
              label="Customer Signature *"
            />
          </SectionCard>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pb-1">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="h-8 text-xs px-4">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="h-8 text-xs px-4 bg-brand hover:bg-brand/90 text-white">
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                {isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
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
