// Quick test for phone number formatting
const testPhoneNumbers = [
  "2.34908+12", // Scientific notation (your case)
  "2.34908e+12", // Alternative scientific notation
  "2.34908E+12", // Capital E scientific notation
  "+234-123-456", // Normal phone format
  "08012345678", // Nigerian phone format
  "", // Empty
  null, // Null
  undefined, // Undefined
  123456789, // Regular number
];

console.log("Testing phone number formatting:");
testPhoneNumbers.forEach((phone, index) => {
  console.log(
    `${index + 1}. Input: ${phone} | Output: "${formatPhoneNumber(phone)}"`
  );
});

function formatPhoneNumber(phone) {
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
}
