require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Generic Chat Endpoint
router.post('/', async (req, res) => {
  const { query, product, profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured on server' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are NutriScan AI assistant. Your goal is to provide simple, actionable health advice based on food products.
      
      User Profile: ${JSON.stringify(profile || {})}
      Product: ${product ? (product.product_name || product.name || 'Unknown') : 'No product scanned yet'}
      Ingredients: ${product ? (product.ingredients || product.ingredients_text || 'N/A') : 'N/A'}
      Nutrition (per 100g): ${product ? JSON.stringify(product.nutriments || product.nutrition || {}) : 'N/A'}
      
      User Question: ${query}
      
      Formatting Instructions:
      1. Keep the response concise, friendly, and focused.
      2. Use clear, simple language. Avoid medical jargon.
      3. Use a single bullet point (*) for lists, do not over-use bolding (**).
      4. Avoid repeating symbols like '*' excessively.
      5. Structure with clear paragraphs or lists.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ message: 'AI failed to respond', error: error.message });
  }
});

// Diet Plan Endpoint
router.post('/diet-plan', async (req, res) => {
  const { profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured on server' });
  }

  if (!profile) {
    return res.status(400).json({ message: 'Profile data is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const allergies = Array.isArray(profile.allergies) ? profile.allergies.join(', ') : (profile.allergies || 'None');
    const conditions = Array.isArray(profile.conditions) ? profile.conditions.join(', ') : (profile.conditions || 'None');

    const prompt = `
      Generate a 1-day personalized diet plan based on:
      Diet Type: ${profile.dietType || 'Balanced'}
      Routine: ${profile.routine || 'Normal'}
      Allergies: ${allergies}
      Conditions: ${conditions}
      Physical Stats: ${profile.gender || 'Not specified'}, ${profile.weight || 70}kg, ${profile.height || 170}cm

      Return JSON format ONLY: 
      {
        "dailyCalories": number,
        "proteinTarget": number,
        "meals": [
          { "type": "Breakfast" | "Lunch" | "Snack" | "Dinner", "name": string, "time": string, "calories": number }
        ],
        "tips": string[]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    res.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error('Diet plan error:', error.message);
    res.status(500).json({
      dailyCalories: 2000,
      proteinTarget: 50,
      meals: [
        { type: 'Breakfast', name: 'Oatmeal with fruits', time: '8:00 AM', calories: 350 },
        { type: 'Lunch', name: 'Grilled chicken salad', time: '1:00 PM', calories: 500 },
        { type: 'Snack', name: 'Mixed nuts', time: '4:00 PM', calories: 200 },
        { type: 'Dinner', name: 'Steamed fish with vegetables', time: '7:00 PM', calories: 450 }
      ],
      tips: ['Server had an issue generating your plan. This is a default plan.']
    });
  }
});

// Health Insight Endpoint (The one called after scanning)
router.post('/insight', async (req, res) => {
  const { product, profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured on server' });
  }

  if (!product) {
    return res.status(400).json({ message: 'Product data is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analyze this food product:
      Product: ${product.name || 'Unknown Product'}
      Ingredients: ${product.ingredients || 'Not available'}
      Nutrition (per 100g): ${JSON.stringify(product.nutrition || {})}
      User Profile: ${JSON.stringify(profile || {})}
      
      Return JSON format ONLY: 
      { 
        "isSafe": boolean, 
        "warning": string | null, 
        "recommendation": string, 
        "score": number,
        "realityCheck": {
          "sugarTeaspoons": number,
          "exerciseToBurn": { "activity": string, "minutes": number }
        },
        "smartSwap": {
          "productName": string,
          "reason": string
        },
        "ingredientInsights": [
          { "ingredient": string, "explanation": string }
        ],
        "voiceSummary": string
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    res.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error('Insight error:', error.message);
    res.status(500).json({
      isSafe: true,
      warning: 'Could not generate AI insight at this time.',
      recommendation: 'Please try again in a moment.',
      score: 50,
      realityCheck: { sugarTeaspoons: 0, exerciseToBurn: { activity: 'walking', minutes: 0 } },
      smartSwap: { productName: 'N/A', reason: 'AI temporarily unavailable' },
      ingredientInsights: [],
      voiceSummary: 'AI analysis temporarily unavailable.'
    });
  }
});

// Location Health Alerts Endpoint
router.post('/location-health', async (req, res) => {
  const { city } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      heatwaveRisk: 'low',
      waterGoalLitres: 2.5,
      diseaseAlerts: [],
      summary: 'Stay hydrated and eat balanced meals.'
    });
  }

  if (!city) {
    return res.json({
      heatwaveRisk: 'low',
      waterGoalLitres: 2.5,
      diseaseAlerts: [],
      summary: 'Stay hydrated and eat balanced meals.'
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const prompt = `
      You are a public health advisor. Based on the city "${city}" and the current time (${currentMonth} ${currentYear}), analyze:
      1. Heatwave risk level for this location and season
      2. Recommended daily water intake in litres (accounting for heat)
      3. Any commonly spreading viral or seasonal diseases in or near this region right now

      Be realistic and practical. Consider the geography and climate of the city.
      
      Return ONLY valid JSON in this exact format:
      {
        "heatwaveRisk": "low" | "medium" | "high",
        "waterGoalLitres": number,
        "diseaseAlerts": ["string", "string"],
        "summary": "one short sentence of overall advice"
      }
      
      diseaseAlerts should be an array of 0-3 concise alert strings (e.g. "Dengue risk elevated in ${city} area").
      If no notable disease risk, return an empty array [].
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    res.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error('Location health error:', error.message);
    res.json({
      heatwaveRisk: 'low',
      waterGoalLitres: 2.5,
      diseaseAlerts: [],
      summary: 'Stay hydrated and eat balanced meals.'
    });
  }
});

module.exports = router;
