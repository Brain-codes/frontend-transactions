/**
 * CSV Export Utilities
 * Formats sales data for CSV export according to specific requirements
 */

/**
 * Formats sales data into the specified CSV format
 * @param {Array} salesData - Array of SuperAdminSale objects
 * @returns {string} CSV formatted string
 */
export const formatSalesDataToCSV = (salesData) => {
  if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
    return getCSVHeaders().join(",") + "\n"; // Return headers only if no data
  }

  const headers = getCSVHeaders();
  const rows = salesData.map((sale) => formatSaleToCSVRow(sale));

  return [headers.join(","), ...rows].join("\n");
};

/**
 * Gets the CSV headers in the specified format
 * @returns {Array} Array of header strings
 */
const getCSVHeaders = () => {
  return [
    "Serial Number",
    "Sales Date",
    "Created",
    "State",
    "District/LGA",
    "Address",
    "Latitude",
    "Longitude",
    "Phone",
    "Contact Person",
    "Other Contact Phone",
    "Sales Partner/Field Assistant",
    "User Name",
    "User Surname",
  ];
};

/**
 * Formats a single sale object into a CSV row
 * @param {Object} sale - SuperAdminSale object
 * @returns {string} CSV formatted row
 */
const formatSaleToCSVRow = (sale) => {
  // Extract user name parts
  const { firstName, lastName } = extractUserName(
    sale.end_user_name || sale.contact_person || ""
  );

  // Format the row data
  const rowData = [
    cleanCSVValue(sale.stove_serial_no || ""),
    formatDateForCSV(sale.sales_date),
    formatDateTimeForCSV(new Date()), // Created date is when sheet was downloaded
    cleanCSVValue(sale.state_backup || sale.addresses?.state || ""),
    cleanCSVValue(sale.lga_backup || sale.addresses?.city || ""),
    cleanCSVValue(getFullAddress(sale.addresses)),
    cleanCSVValue(sale.addresses?.latitude || ""),
    cleanCSVValue(sale.addresses?.longitude || ""),
    cleanCSVValue(formatPhoneNumber(sale.phone || sale.contact_phone || "")),
    cleanCSVValue(sale.contact_person || sale.end_user_name || ""),
    cleanCSVValue(formatPhoneNumber(sale.other_phone || "")),
    cleanCSVValue(getSalesPartner(sale)),
    cleanCSVValue(firstName),
    cleanCSVValue(lastName),
  ];

  return rowData.join(",");
};

/**
 * Extracts first and last name from a full name string
 * @param {string} fullName - Full name string
 * @returns {Object} Object with firstName and lastName
 */
const extractUserName = (fullName) => {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }

  const nameParts = fullName
    .trim()
    .split(" ")
    .filter((part) => part.length > 0);

  if (nameParts.length === 0) {
    return { firstName: "", lastName: "" };
  } else if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: "" };
  } else {
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" "),
    };
  }
};

/**
 * Gets the full address string, avoiding [Object Object] issues
 * @param {Object} address - Address object
 * @returns {string} Formatted address string
 */
const getFullAddress = (address) => {
  if (!address || typeof address !== "object") {
    return "";
  }

  // If there's a full_address field, use it
  if (address.full_address && typeof address.full_address === "string") {
    return address.full_address;
  }

  // Otherwise, construct address from parts
  const addressParts = [];

  if (address.street && typeof address.street === "string") {
    addressParts.push(address.street);
  }
  if (address.city && typeof address.city === "string") {
    addressParts.push(address.city);
  }
  if (address.state && typeof address.state === "string") {
    addressParts.push(address.state);
  }
  if (address.country && typeof address.country === "string") {
    addressParts.push(address.country);
  }

  return addressParts.join(", ");
};

/**
 * Gets the sales partner name
 * @param {Object} sale - Sale object
 * @returns {string} Sales partner name
 */
const getSalesPartner = (sale) => {
  // Try different possible fields for sales partner
  if (sale.partner_name && typeof sale.partner_name === "string") {
    return sale.partner_name;
  }

  if (sale.organizations?.name && typeof sale.organizations.name === "string") {
    return sale.organizations.name;
  }

  if (sale.organization?.name && typeof sale.organization.name === "string") {
    return sale.organization.name;
  }

  if (sale.organization_name && typeof sale.organization_name === "string") {
    return sale.organization_name;
  }

  if (sale.creator?.full_name && typeof sale.creator.full_name === "string") {
    return sale.creator.full_name;
  }

  if (sale.profiles?.full_name && typeof sale.profiles.full_name === "string") {
    return sale.profiles.full_name;
  }

  return "";
};

/**
 * Formats phone number to ensure it's a proper string
 * @param {any} phone - Phone number (could be string, number, or scientific notation)
 * @returns {string} Properly formatted phone number string
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  // Convert to string first
  let phoneStr = String(phone);

  // Handle scientific notation (e.g., "2.34908+12", "2.34908e+12", or direct scientific notation)
  // Check for patterns that indicate scientific notation
  const isScientificNotation =
    phoneStr.includes("e") ||
    phoneStr.includes("E") ||
    /^\d+\.\d+\+\d+$/.test(phoneStr) || // Pattern like "2.34908+12"
    /^\d+\.\d+-\d+$/.test(phoneStr); // Pattern like "2.34908-12"

  if (isScientificNotation) {
    try {
      // Try to parse as scientific notation
      let phoneNumber;

      // Handle the "2.34908+12" format (missing 'e')
      if (/^\d+\.\d+[+-]\d+$/.test(phoneStr)) {
        phoneStr = phoneStr.replace("+", "e+").replace(/-(\d+)$/, "e-$1");
      }

      phoneNumber = parseFloat(phoneStr);
      if (!isNaN(phoneNumber) && phoneNumber > 0) {
        // Convert to fixed decimal notation (no scientific notation)
        phoneStr = phoneNumber.toFixed(0);
      }
    } catch (error) {
      console.warn("Error parsing phone number:", phone, error);
      // Fallback: just remove non-phone characters
      phoneStr = String(phone).replace(/[^0-9+\-() ]/g, "");
    }
  }

  // Clean up the string - keep only valid phone characters
  // Allow digits, plus sign, hyphens, parentheses, and spaces
  phoneStr = phoneStr.replace(/[^0-9+\-() ]/g, "");

  return phoneStr.trim();
};

/**
 * Formats a date for CSV output (LocalDate format)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
const formatDateForCSV = (dateString) => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD format
  } catch (error) {
    console.warn("Error formatting date:", dateString, error);
    return "";
  }
};

/**
 * Formats a datetime for CSV output (LocalDateTime format)
 * @param {string|Date} dateTime - DateTime to format
 * @returns {string} Formatted datetime string (YYYY-MM-DD HH:mm:ss)
 */
const formatDateTimeForCSV = (dateTime) => {
  if (!dateTime) return "";

  try {
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return "";

    // Format as YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn("Error formatting datetime:", dateTime, error);
    return "";
  }
};

/**
 * Cleans a value for CSV output, handling quotes and commas
 * @param {any} value - Value to clean
 * @returns {string} Cleaned value safe for CSV
 */
const cleanCSVValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  let stringValue = String(value);

  // Handle potential [Object Object] issues
  if (stringValue === "[object Object]") {
    return "";
  }

  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    stringValue = stringValue.replace(/"/g, '""'); // Escape quotes
    return `"${stringValue}"`; // Wrap in quotes
  }

  return stringValue;
};

/**
 * Downloads CSV content as a file
 * @param {string} csvContent - CSV content to download
 * @param {string} filename - Filename for the download
 */
export const downloadCSV = (csvContent, filename = null) => {
  if (typeof window === "undefined") return;

  const blob = new window.Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  const downloadFilename =
    filename || `sales-export-${new Date().toISOString().split("T")[0]}.csv`;

  link.href = url;
  link.download = downloadFilename;
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
};

/**
 * Exports sales data to CSV with the specified format
 * @param {Array} salesData - Array of SuperAdminSale objects
 * @param {string} filename - Optional filename
 */
export const exportSalesDataToCSV = (salesData, filename = null) => {
  const csvContent = formatSalesDataToCSV(salesData);
  downloadCSV(csvContent, filename);
};
