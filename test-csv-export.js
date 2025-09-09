// Test CSV Export with Object data
import { formatSalesDataToCSV } from "./src/utils/csvExportUtils.js";

// Sample problematic data that would cause [object Object] issues
const testSalesData = [
  {
    id: 1,
    stove_serial_no: "ABC123",
    sales_date: "2024-01-15",
    end_user_name: "John Doe",
    contact_person: "Jane Smith",
    phone: "08012345678",
    state_backup: "Lagos",
    lga_backup: "Ikeja",

    // Nested object addresses (common cause of [object Object])
    addresses: {
      street: "123 Main St",
      city: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
      latitude: "6.5244",
      longitude: "3.3792",
      full_address: "123 Main St, Ikeja, Lagos, Nigeria",
    },

    // Nested object organizations (another common cause)
    organizations: {
      id: "org-1",
      name: "Partner Organization",
      type: "NGO",
    },

    // Nested object profiles
    profiles: {
      id: "profile-1",
      full_name: "Sales Agent Name",
      email: "agent@example.com",
    },
  },

  // Test case with array addresses (edge case)
  {
    id: 2,
    stove_serial_no: "DEF456",
    sales_date: "2024-01-16",
    end_user_name: "Alice Johnson",

    // Array of addresses (edge case that could cause issues)
    addresses: [
      {
        city: "Abuja",
        state: "FCT",
        latitude: "9.0579",
        longitude: "7.4951",
      },
    ],

    // Object as string value (problematic case)
    partner_name: {
      name: "Complex Partner",
      id: "partner-2",
    },
  },

  // Test case with null/undefined values
  {
    id: 3,
    stove_serial_no: "GHI789",
    sales_date: null,
    addresses: null,
    organizations: undefined,
    partner_name: null,
  },
];

console.log("Testing CSV Export with problematic data...\n");

// Test the export
const csvResult = formatSalesDataToCSV(testSalesData);

console.log("Generated CSV:");
console.log("=".repeat(80));
console.log(csvResult);
console.log("=".repeat(80));

// Check for [object Object] in result
if (csvResult.includes("[object Object]")) {
  console.error("\n❌ FAILED: CSV contains [object Object]");
  console.log("Problematic lines:");
  csvResult.split("\n").forEach((line, index) => {
    if (line.includes("[object Object]")) {
      console.log(`Line ${index + 1}: ${line}`);
    }
  });
} else {
  console.log("\n✅ PASSED: No [object Object] found in CSV");
}

// Check for empty values handling
const lines = csvResult.split("\n");
console.log(`\nCSV has ${lines.length} lines (including header)`);
console.log("Sample data rows:");
lines.slice(1, 4).forEach((line, index) => {
  console.log(`Row ${index + 1}: ${line}`);
});
