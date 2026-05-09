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
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are NutriScan AI assistant. Your goal is to provide simple, actionable health advice based on food products.
      
      User Profile: ${JSON.stringify(profile)}
      Product: ${product ? product.product_name : 'No product scanned yet'}
      Ingredients: ${product ? product.ingredients : 'N/A'}
      Nutrition (per 100g): ${product ? JSON.stringify(product.nutriments) : 'N/A'}
      
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
    console.error('Chat error:', error);
    res.status(500).json({ message: 'AI failed to respond', error: error.message });
  }
});

// Diet Plan Endpoint
router.post('/diet-plan', async (req, res) => {
  const { profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Generate a 1-day personalized diet plan based on:
      Diet Type: ${profile.dietType}
      Routine: ${profile.routine}
      Allergies: ${profile.allergies.join(', ')}
      Conditions: ${profile.conditions.join(', ')}
      Physical Stats: ${profile.gender}, ${profile.weight}kg, ${profile.height}cm

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
    console.error('Diet plan error:', error);
    res.status(500).json({ message: 'Failed to generate diet plan', details: error.message });
  }
});

// Health Insight Endpoint (The one called after scanning)
router.post('/insight', async (req, res) => {
  const { product, profile } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this food product:
      Product: ${product.name}
      Ingredients: ${product.ingredients}
      Nutrition (per 100g): ${JSON.stringify(product.nutrition)}
      User Profile: ${JSON.stringify(profile)}
      
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
    console.error('Insight error:', error);
    res.status(500).json({ message: 'Failed to generate insight', details: error.message });
  }
});

// Location Health Alerts Endpoint
router.post('/location-health', async (req, res) => {
  const { city } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Gemini API key not configured' });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    console.error('Location health error:', error);
    res.status(500).json({
      heatwaveRisk: 'low',
      waterGoalLitres: 2.5,
      diseaseAlerts: [],
      summary: 'Stay hydrated and eat balanced meals.'
    });
  }
});

module.exports = router;
