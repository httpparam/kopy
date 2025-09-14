// Test script for KOPY API endpoint
// Run with: node test-api.js

const testAPI = async () => {
  console.log("🧪 Testing KOPY API with curl equivalent...\n");

  // Create FormData equivalent to the curl command
  const formData = new FormData();
  formData.append("content", "Hello, this is my secure paste!");
  formData.append("senderName", "Your Name");
  formData.append("expirationMinutes", "60");

  try {
    console.log(
      "📤 Sending POST request to https://kopy.httpparam.me/api/post",
    );
    console.log("📋 Data being sent:");
    console.log('  - content: "Hello, this is my secure paste!"');
    console.log('  - senderName: "Your Name"');
    console.log('  - expirationMinutes: "60"');
    console.log("");

    const response = await fetch("https://kopy.httpparam.me/api/post", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ API Test Successful!");
      console.log("📊 Response:");
      console.log("  - URL:", result.url);
      console.log("  - ID:", result.id);
      console.log("  - Expires at:", result.expiresAt);
      console.log("  - Content type:", result.contentType);
      console.log("  - Has password:", result.hasPassword);
      console.log("");
      console.log("🔗 You can view your paste at:", result.url);
    } else {
      console.log("❌ API Test Failed!");
      console.log("📊 Error Response:");
      console.log("  - Status:", response.status);
      console.log("  - Error:", result.error);
    }
  } catch (error) {
    console.log("❌ Network Error:", error.message);
    console.log("💡 Make sure the server is running: npm run dev");
  }
};

// Run the test
testAPI();
