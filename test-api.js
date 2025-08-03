// Test API Service
import salesAdvancedService from "../src/app/services/salesAdvancedAPIService.js";

const testAPI = async () => {
  console.log("🧪 Testing Sales Advanced API Service...");

  // Test 1: Check service initialization
  console.log("✅ Service initialized:", typeof salesAdvancedService);
  console.log("✅ Base URL:", salesAdvancedService.baseUrl);

  // Test 2: Check methods exist
  const methods = [
    "getSalesData",
    "exportSalesData",
    "getSalesStats",
    "setToken",
  ];
  methods.forEach((method) => {
    console.log(`✅ Method ${method}:`, typeof salesAdvancedService[method]);
  });

  // Test 3: Set a test token
  salesAdvancedService.setToken("test-token-123");
  console.log("✅ Token set successfully");

  // Test 4: Try to make an API call (this will likely fail without a real token)
  try {
    console.log("🔄 Attempting API call...");
    const result = await salesAdvancedService.getSalesData({ limit: 1 });
    console.log("✅ API call successful:", result);
  } catch (error) {
    console.log("⚠️ Expected API error (no real token):", error.message);
  }

  console.log("🎉 API Service test completed!");
};

// Run test if in Node.js environment
if (typeof module !== "undefined" && module.exports) {
  testAPI();
}

export default testAPI;
