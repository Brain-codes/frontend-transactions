/**
 * Sales Form Data Utilities
 * Handles data transformation between API and form formats
 * Base64 is the universal format for signature data
 */

import { extractBase64FromSignature, base64ToDataURL } from "./signatureUtils";

/**
 * Creates initial form data structure
 * @returns {Object} Initial form data with empty values
 */
export const createInitialFormData = () => ({
  transactionId: "",
  stoveSerialNo: "",
  salesDate: new Date().toISOString().split("T")[0],
  contactPerson: "",
  contactPhone: "",
  endUserName: "",
  aka: "",
  stateBackup: "",
  lgaBackup: "",
  phone: "",
  otherPhone: "",
  partnerName: "",
  amount: "",
  addressData: {
    fullAddress: "",
    street: "",
    city: "",
    state: "",
    country: "Nigeria",
    latitude: null,
    longitude: null,
  },
  signature: "",
  stoveImageId: "",
  agreementImageId: "",
});

/**
 * Populates form data with existing sale data for editing
 * @param {Object} saleData - Existing sale data from API
 * @returns {Object} Form data populated with sale values
 */
export const populateFormDataForEdit = (saleData) => {
  if (!saleData) return createInitialFormData();

  const result = {
    transactionId: saleData.transactionId || saleData.transaction_id || "",
    stoveSerialNo: saleData.stoveSerialNo || saleData.stove_serial_no || "",
    salesDate:
      saleData.salesDate ||
      saleData.sales_date ||
      new Date().toISOString().split("T")[0],
    contactPerson: saleData.contactPerson || saleData.contact_person || "",
    contactPhone: saleData.contactPhone || saleData.contact_phone || "",
    endUserName: saleData.endUserName || saleData.end_user_name || "",
    aka: saleData.aka || "",
    stateBackup: saleData.stateBackup || saleData.state_backup || "",
    lgaBackup: saleData.lgaBackup || saleData.lga_backup || "",
    phone: saleData.phone || "",
    otherPhone: saleData.otherPhone || saleData.other_phone || "",
    partnerName: saleData.partnerName || saleData.partner_name || "",
    amount: saleData.amount ? saleData.amount.toString() : "",
    addressData: {
      fullAddress:
        saleData.addressData?.fullAddress ||
        saleData.address_data?.full_address ||
        saleData.address?.full_address ||
        "",
      street:
        saleData.addressData?.street ||
        saleData.address_data?.street ||
        saleData.address?.street ||
        "",
      city:
        saleData.addressData?.city ||
        saleData.address_data?.city ||
        saleData.address?.city ||
        "",
      state:
        saleData.addressData?.state ||
        saleData.address_data?.state ||
        saleData.address?.state ||
        "",
      country:
        saleData.addressData?.country ||
        saleData.address_data?.country ||
        saleData.address?.country ||
        "Nigeria",
      latitude:
        saleData.addressData?.latitude ||
        saleData.address_data?.latitude ||
        saleData.address?.latitude ||
        null,
      longitude:
        saleData.addressData?.longitude ||
        saleData.address_data?.longitude ||
        saleData.address?.longitude ||
        null,
    },
    // For edit mode: API returns base64, convert to data URL for canvas display
    // For create mode: this will be empty string initially
    signature: saleData.signature ? base64ToDataURL(saleData.signature) : "",
    stoveImageId:
      saleData.stoveImageId ||
      saleData.stove_image_id?.id ||
      saleData.stove_image_id ||
      "",
    agreementImageId:
      saleData.agreementImageId ||
      saleData.agreement_image_id?.id ||
      saleData.agreement_image_id ||
      "",
  };

  return result;
};

/**
 * Transforms form data to API format for submission
 * @param {Object} formData - Form data from state
 * @param {boolean} isEdit - Whether this is an edit operation
 * @returns {Object} Data formatted for API submission
 */
export const transformFormDataForAPI = (formData, isEdit = false) => {
  // Convert signature to pure base64 format for API (universal format)
  // Handles both new signatures (base64) and edited signatures (data URL)
  const processedSignature = extractBase64FromSignature(formData.signature);

  const baseData = {
    transactionId: formData.transactionId,
    salesDate: formData.salesDate,
    contactPerson: formData.contactPerson,
    contactPhone: formData.contactPhone,
    endUserName: formData.endUserName,
    aka: formData.aka,
    phone: formData.phone,
    otherPhone: formData.otherPhone,
    partnerName: formData.partnerName,
    amount: parseFloat(formData.amount),
    stoveSerialNo: formData.stoveSerialNo,
    stateBackup: formData.stateBackup,
    lgaBackup: formData.lgaBackup,
    addressData: formData.addressData,
    signature: processedSignature, // Always send pure base64 to API
    stoveImageId: formData.stoveImageId,
    agreementImageId: formData.agreementImageId,
  };

  // For edit operations, you might want to include additional fields like ID
  if (isEdit) {
    // Add any edit-specific fields here
    return baseData;
  }

  return baseData;
};

/**
 * Generates a random transaction ID
 * @returns {string} Random transaction ID
 */
export const generateTransactionId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Checks if form data has been modified from original
 * @param {Object} currentData - Current form data
 * @param {Object} originalData - Original form data
 * @returns {boolean} True if data has been modified
 */
export const hasFormDataChanged = (currentData, originalData) => {
  if (!originalData) return true;

  // Deep comparison of form data (excluding generated fields like transactionId for new forms)
  const fieldsToCompare = [
    "salesDate",
    "contactPerson",
    "contactPhone",
    "endUserName",
    "aka",
    "phone",
    "otherPhone",
    "partnerName",
    "amount",
    "stoveSerialNo",
    "stateBackup",
    "lgaBackup",
    "signature",
    "stoveImageId",
    "agreementImageId",
  ];

  for (const field of fieldsToCompare) {
    if (currentData[field] !== originalData[field]) {
      return true;
    }
  }

  // Check address data
  const addressFields = [
    "fullAddress",
    "street",
    "city",
    "state",
    "country",
    "latitude",
    "longitude",
  ];
  for (const field of addressFields) {
    if (
      currentData.addressData?.[field] !== originalData.addressData?.[field]
    ) {
      return true;
    }
  }

  return false;
};
