/**
 * Sales Form Validation Utilities
 * Contains validation functions for sales form data
 */

/**
 * Validates the sales form data
 * @param {Object} formData - The form data to validate
 * @returns {Object} - Object containing validation errors (empty if valid)
 */
export const validateSalesForm = (formData) => {
  const errors = {};

  // Transaction ID validation (should be auto-generated)
  if (!formData.transactionId.trim()) {
    errors.transactionId = "Transaction ID is required";
  }

  // Sales date validation
  if (!formData.salesDate) {
    errors.salesDate = "Sales date is required";
  }

  // Contact person validation
  if (!formData.contactPerson.trim()) {
    errors.contactPerson = "Contact person/buyer is required";
  }

  // Contact phone validation
  if (!formData.contactPhone.trim()) {
    errors.contactPhone = "Contact phone number is required";
  }

  // End user name validation
  if (!formData.endUserName.trim()) {
    errors.endUserName = "End user name is required";
  }

  // State validation
  if (!formData.stateBackup) {
    errors.stateBackup = "State is required";
  }

  // LGA validation
  if (!formData.lgaBackup) {
    errors.lgaBackup = "LGA is required";
  }

  // Phone validation
  if (!formData.phone.trim()) {
    errors.phone = "End user phone number is required";
  }

  // Amount validation
  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    errors.amount = "Valid sale amount is required";
  }

  // Stove serial number validation
  if (!formData.stoveSerialNo) {
    errors.stoveSerialNo = "Stove serial number is required";
  }

  // Address validation - must be selected from Google Places
  if (!formData.addressData.fullAddress.trim()) {
    errors.address =
      "Residential address is required (select from suggestions)";
  }

  if (!formData.addressData.latitude || !formData.addressData.longitude) {
    errors.location =
      "Please select a valid address from the suggestions to get GPS coordinates";
  }

  // Image validation
  if (!formData.stoveImageId) {
    errors.stoveImage = "Stove photo is required";
  }

  if (!formData.agreementImageId) {
    errors.agreementImage = "Agreement document is required";
  }

  // Signature validation
  if (!formData.signature) {
    errors.signature = "Customer signature is required";
  }

  return errors;
};

/**
 * Checks if the form is valid (no validation errors)
 * @param {Object} formData - The form data to validate
 * @returns {boolean} - True if form is valid, false otherwise
 */
export const isValidSalesForm = (formData) => {
  const errors = validateSalesForm(formData);
  return Object.keys(errors).length === 0;
};

/**
 * Field-specific validation functions for real-time validation
 */
export const fieldValidators = {
  transactionId: (value) => {
    if (!value?.trim()) {
      return "Transaction ID is required";
    }
    return null;
  },

  salesDate: (value) => {
    if (!value) {
      return "Sales date is required";
    }
    return null;
  },

  contactPerson: (value) => {
    if (!value?.trim()) {
      return "Contact person/buyer is required";
    }
    return null;
  },

  contactPhone: (value) => {
    if (!value?.trim()) {
      return "Contact phone number is required";
    }
    return null;
  },

  endUserName: (value) => {
    if (!value?.trim()) {
      return "End user name is required";
    }
    return null;
  },

  stateBackup: (value) => {
    if (!value) {
      return "State is required";
    }
    return null;
  },

  lgaBackup: (value) => {
    if (!value) {
      return "LGA is required";
    }
    return null;
  },

  phone: (value) => {
    if (!value?.trim()) {
      return "End user phone number is required";
    }
    return null;
  },

  amount: (value) => {
    if (!value || parseFloat(value) <= 0) {
      return "Valid sale amount is required";
    }
    return null;
  },

  stoveSerialNo: (value) => {
    if (!value) {
      return "Stove serial number is required";
    }
    return null;
  },

  address: (addressData) => {
    if (!addressData?.fullAddress?.trim()) {
      return "Residential address is required (select from suggestions)";
    }
    return null;
  },

  location: (addressData) => {
    if (!addressData?.latitude || !addressData?.longitude) {
      return "Please select a valid address from the suggestions to get GPS coordinates";
    }
    return null;
  },

  stoveImage: (stoveImageId) => {
    if (!stoveImageId) {
      return "Stove photo is required";
    }
    return null;
  },

  agreementImage: (agreementImageId) => {
    if (!agreementImageId) {
      return "Agreement document is required";
    }
    return null;
  },

  signature: (signature) => {
    if (!signature) {
      return "Customer signature is required";
    }
    return null;
  },
};
