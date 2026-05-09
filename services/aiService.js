const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
  }

  // Helper to ensure the key is alive
  checkReady() {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY is missing on server.");
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
    return true;
  }

  // Safe JSON extraction from AI response
  cleanJSON(text) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : text);
    } catch (e) {
      console.error("AI JSON Parse Error:", text);
      throw new Error("AI returned invalid data format.");
    }
  }

  async generateInsight(product, profile) {
    this.checkReady();
    const prompt = `
      Analyze food product: ${product.name || 'Unknown'}. 
      Ingredients: ${product.ingredients || 'N/A'}. 
      Nutrition: ${JSON.stringify(product.nutrition || {})}.
      User Profile: ${JSON.stringify(profile || {})}.
      
      Return ONLY valid JSON:
      {
        "isSafe": boolean,
        "warning": string | null,
        "recommendation": string,
        "score": number,
        "realityCheck": { "sugarTeaspoons": number, "exerciseToBurn": { "activity": string, "minutes": number } },
        "smartSwap": { "productName": string, "reason": string },
        "ingredientInsights": [],
        "voiceSummary": string
      }
    `;

    const result = await this.model.generateContent(prompt);
    return this.cleanJSON(result.response.text());
  }

  async chat(query, profile, product) {
    this.checkReady();
    const prompt = `
      Assistant for NutriScan. 
      User Profile: ${JSON.stringify(profile || {})}.
      Scanned Product: ${product ? (product.name || 'N/A') : 'None'}.
      Question: ${query}
      
      Instructions: Concise, healthy advice, no emojis, markdown format.
    `;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async generateDietPlan(profile) {
    this.checkReady();
    const prompt = `
      Generate 1-day diet plan.
      Profile: ${JSON.stringify(profile || {})}.
      
      Return ONLY valid JSON:
      {
        "dailyCalories": number,
        "proteinTarget": number,
        "meals": [{ "type": string, "name": string, "time": string, "calories": number }],
        "tips": string[]
      }
    `;

    const result = await this.model.generateContent(prompt);
    return this.cleanJSON(result.response.text());
  }
}

module.exports = new AIService();
