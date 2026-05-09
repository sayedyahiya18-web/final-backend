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
      You are a clinical nutrition expert. Analyze the following food product with extreme precision.
      Product: ${product.name || 'Unknown'}
      Brand: ${product.brand || 'Unknown'}
      Ingredients: ${product.ingredients || 'Not provided'}
      Nutrition Data: ${JSON.stringify(product.nutrition || {})}
      
      User Health Profile:
      - Allergies: ${profile.allergies?.join(', ') || 'None'}
      - Conditions: ${profile.conditions?.join(', ') || 'None'}
      - Diet Type: ${profile.dietType || 'Omnivore'}
      
      Task: Provide a critical health analysis. Be direct and scientific.
      
      Return ONLY a JSON object:
      {
        "isSafe": boolean (false if any allergy or condition conflict exists),
        "warning": "Detailed clinical warning or null",
        "recommendation": "Specific advice on consumption frequency",
        "score": number (0-100, where 100 is optimal health),
        "realityCheck": { 
          "sugarTeaspoons": number (equivalent teaspoons of sugar), 
          "exerciseToBurn": { "activity": "e.g., Running", "minutes": number } 
        },
        "smartSwap": { 
          "productName": "A specific healthier alternative", 
          "reason": "Scientific reason why it's better" 
        },
        "ingredientInsights": ["Insight 1", "Insight 2"],
        "voiceSummary": "A professional 20-word summary for audio feedback"
      }
    `;

    const result = await this.model.generateContent(prompt);
    return this.cleanJSON(result.response.text());
  }

  async chat(query, profile, product) {
    this.checkReady();
    
    let searchContext = "";
    // Trigger search for specific keywords or if the query is complex
    const needsSearch = /latest|news|research|benefit|compare|new|2024|2025|price|review/i.test(query);
    
    if (needsSearch) {
      try {
        const searchService = require('./searchService');
        searchContext = await searchService.search(query);
      } catch (e) {
        console.error("Search integration failed:", e);
      }
    }

    const prompt = `
      You are NutriScan AI, a professional health consultant.
      
      User Profile: ${JSON.stringify(profile || {})}
      Context: ${product ? `User is asking about ${product.name}` : 'General health query'}
      
      ${searchContext ? `Real-time Web Search Results:\n${searchContext}\n\nNote: Incorporate the most relevant info from above into your answer.` : ''}
      
      Question: ${query}
      
      Instructions: 
      - Provide exact, scientifically backed advice.
      - If search results are provided, use them to be as current as possible.
      - Maintain a minimalist, professional tone.
      - Use markdown for structure.
      - Do NOT use emojis.
    `;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async generateDietPlan(profile) {
    this.checkReady();
    const prompt = `
      Create a high-precision 1-day therapeutic diet plan.
      User Profile: ${JSON.stringify(profile || {})}.
      
      Requirements:
      - Align with ${profile.dietType || 'standard'} dietary requirements.
      - Factor in ${profile.conditions?.join(' and ') || 'general wellness'}.
      
      Return ONLY a JSON object:
      {
        "dailyCalories": number,
        "proteinTarget": number,
        "meals": [
          { "type": "Breakfast", "name": "Exact meal name", "time": "08:00 AM", "calories": number },
          { "type": "Lunch", "name": "Exact meal name", "time": "01:00 PM", "calories": number },
          { "type": "Dinner", "name": "Exact meal name", "time": "07:30 PM", "calories": number }
        ],
        "tips": ["Clinical tip 1", "Clinical tip 2"]
      }
    `;

    const result = await this.model.generateContent(prompt);
    return this.cleanJSON(result.response.text());
  }
}

module.exports = new AIService();
