const { GoogleGenerativeAI } = require('@google/generative-ai');

async function verifyKey() {
  const key = "AIzaSyBN1apFv0V_baZjq8viDtYeF38GfpV6TIo";
  console.log("Testing Key:", key.substring(0, 8) + "...");
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Test connection. Reply with 'OK'.");
    const text = result.response.text();
    console.log("Result:", text);
    if (text.includes("OK")) {
      console.log("SUCCESS: Key is working and authorized for Gemini 1.5 Flash.");
    } else {
      console.log("PARTIAL: Key worked but response was unexpected:", text);
    }
  } catch (error) {
    console.error("FAILURE: Key is NOT working.");
    console.error("Error Detail:", error.message);
    if (error.message.includes("API_KEY_INVALID")) {
      console.log("Reason: The API key is invalid or has been deleted.");
    } else if (error.message.includes("429")) {
      console.log("Reason: Quota exceeded or limit is 0.");
    } else if (error.message.includes("403")) {
      console.log("Reason: Permission denied (Check regional restrictions or API enablement).");
    } else if (error.message.includes("404")) {
      console.log("Reason: Model not found (1.5-flash-latest might not be available for this key).");
    }
  }
}

verifyKey();
