const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.geminiKey = process.env.GEMINI_API_KEY;
    this.scrapingdogKey = process.env.SCRAPINGDOG_API_KEY;
    
    if (this.geminiKey) {
      this.genAI = new GoogleGenerativeAI(this.geminiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
  }

  // Helper to ensure at least one key is alive
  checkReady() {
    if (!this.geminiKey && !this.scrapingdogKey) {
      throw new Error("Missing AI API Keys (GEMINI or SCRAPINGDOG) on server.");
    }
    return true;
  }

  // Extract text from Scrapingdog ChatGPT response format
  extractScrapingdogText(data) {
    try {
      if (data.conversation && data.conversation.length > 0) {
        const assistantMsg = data.conversation[data.conversation.length - 1];
        if (assistantMsg.role === 'assistant' && assistantMsg.response) {
          return assistantMsg.response.map(item => {
            if (item.type === 'paragraph') return item.text;
            if (item.type === 'bullet_list') return item.items.map(i => `• ${i.text}`).join('\n');
            if (item.type === 'numbered_list') return item.items.map((i, idx) => `${idx + 1}. ${i.text}`).join('\n');
            return '';
          }).join('\n\n');
        }
      }
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch (e) {
      console.error("Scrapingdog Parse Error:", e);
      return "Error processing Scrapingdog response.";
    }
  }

  // Safe JSON extraction from text
  cleanJSON(text) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : text);
    } catch (e) {
      console.error("AI JSON Parse Error:", text);
      throw new Error("AI returned invalid data format.");
    }
  }

  async callAI(prompt) {
    this.checkReady();
    
    // Priority 1: Gemini (User requested for local/primary)
    if (this.geminiKey) {
      try {
        console.log('Using Gemini AI...');
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      } catch (e) {
        console.error('Gemini failed, falling back to Scrapingdog if available:', e.message);
        if (!this.scrapingdogKey) throw e;
      }
    }

    // Priority 2: Scrapingdog
    if (this.scrapingdogKey) {
      console.log('Using Scrapingdog AI...');
      const url = `https://api.scrapingdog.com/chatgpt?api_key=${this.scrapingdogKey}&prompt=${encodeURIComponent(prompt)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Scrapingdog API Error: ${response.status} - ${err}`);
      }
      const data = await response.json();
      return this.extractScrapingdogText(data);
    }
    
    throw new Error("No available AI provider succeeded.");
  }

  async generateInsight(product, profile) {
    const prompt = `
      You are a clinical nutrition expert. Analyze the following food product.
      Product: ${product.name || 'Unknown'}
      Ingredients: ${product.ingredients || 'Not provided'}
      Nutrition Data: ${JSON.stringify(product.nutrition || {})}
      User Profile: ${JSON.stringify(profile || {})}
      
      Return ONLY a JSON object:
      {
        "isSafe": boolean,
        "warning": "string or null",
        "recommendation": "string",
        "score": number,
        "realityCheck": { "sugarTeaspoons": number, "exerciseToBurn": { "activity": "string", "minutes": number } },
        "smartSwap": { "productName": "string", "reason": "string" },
        "ingredientInsights": ["string"],
        "voiceSummary": "string"
      }
    `;

    const text = await this.callAI(prompt);
    return this.cleanJSON(text);
  }

  async chat(query, profile, product) {
    let searchContext = "";
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
      You are NutriScan AI. 
      Profile: ${JSON.stringify(profile || {})}
      Context: ${product ? `Product ${product.name}` : 'General'}
      ${searchContext ? `Web Info: ${searchContext}` : ''}
      Question: ${query}
      Instructions: Professional, no emojis, markdown format.
    `;

    return await this.callAI(prompt);
  }

  async generateDietPlan(profile) {
    const prompt = `
      Create a 1-day therapeutic diet plan for this profile: ${JSON.stringify(profile || {})}.
      Return ONLY a JSON object:
      {
        "dailyCalories": number,
        "proteinTarget": number,
        "meals": [
          { "type": "Breakfast", "name": "string", "time": "08:00 AM", "calories": number },
          { "type": "Lunch", "name": "string", "time": "01:00 PM", "calories": number },
          { "type": "Dinner", "name": "string", "time": "07:30 PM", "calories": number }
        ],
        "tips": ["string"]
      }
    `;

    const text = await this.callAI(prompt);
    return this.cleanJSON(text);
  }
}

module.exports = new AIService();
