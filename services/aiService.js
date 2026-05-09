class AIService {
  constructor() {
    this.apiKey = process.env.SCRAPINGDOG_API_KEY;
  }

  // Helper to ensure the key is alive
  checkReady() {
    if (!this.apiKey) throw new Error("SCRAPINGDOG_API_KEY is missing on server.");
    return true;
  }

  // Extract text from Scrapingdog ChatGPT response format
  extractText(data) {
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
      return "Sorry, I couldn't process the AI response.";
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
    const url = `https://api.scrapingdog.com/chatgpt?api_key=${this.apiKey}&prompt=${encodeURIComponent(prompt)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Scrapingdog API Error: ${response.status} - ${err}`);
    }
    
    const data = await response.json();
    return this.extractText(data);
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
