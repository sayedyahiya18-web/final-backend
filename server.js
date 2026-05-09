require('dotenv').config();
const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/product');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow all origins (this automatically handles pre-flight)

app.use(express.json());

// Routes with strict routing disabled for flexibility
app.use('/api/product', productRoutes);

// DIRECT CHAT HANDLER (Moving out of routes to avoid Express 5 router issues)
const aiService = require('./services/aiService');

// Main Chatbot
app.post('/api/chat', async (req, res) => {
  console.log('--- NEW CHAT REQUEST ---');
  try {
    const { query, profile, product } = req.body;
    if (!query) return res.status(400).json({ message: 'No query provided' });
    const reply = await aiService.chat(query, profile, product);
    res.json({ reply });
  } catch (error) {
    console.error('SERVER CHAT ERROR:', error.message);
    res.status(500).json({ message: 'AI Service Error', details: error.message });
  }
});

// Product Insights (Scanner)
app.post('/api/chat/insight', async (req, res) => {
  console.log('--- NEW INSIGHT REQUEST ---');
  try {
    const { product, profile } = req.body;
    if (!product) return res.status(400).json({ message: 'No product data provided.' });
    const insight = await aiService.generateInsight(product, profile);
    res.json(insight);
  } catch (error) {
    console.error('SERVER INSIGHT ERROR:', error.message);
    res.status(500).json({ message: 'AI Insight Error', details: error.message });
  }
});

// Diet Plan Generator
app.post('/api/chat/diet-plan', async (req, res) => {
  console.log('--- NEW DIET PLAN REQUEST ---');
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ message: 'No profile data provided.' });
    const plan = await aiService.generateDietPlan(profile);
    res.json(plan);
  } catch (error) {
    console.error('SERVER DIET ERROR:', error.message);
    res.status(500).json({ message: 'AI Diet Plan Error', details: error.message });
  }
});

// Location Health Alerts (Added for completeness)
app.post('/api/chat/location-health', async (req, res) => {
  try {
    const { city } = req.body;
    const prompt = `Provide health alerts for ${city}. Return ONLY a JSON object: { "heatwaveRisk": "low/med/high", "waterGoalLitres": number, "diseaseAlerts": ["string"], "summary": "string" }`;
    const text = await aiService.callAI(prompt);
    res.json(aiService.cleanJSON(text));
  } catch (e) {
    res.json({ heatwaveRisk: 'low', waterGoalLitres: 2.5, diseaseAlerts: [], summary: 'Stay hydrated.' });
  }
});

app.get('/api/chat', (req, res) => {
  res.json({ message: 'Chat endpoint is reachable. Use POST to talk to AI.' });
});

// Health check
app.get('/', (req, res) => {
  res.send('NutriScan AI Backend is Running');
});

// Diagnostic check
app.get('/api/check', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v2-scrapingdog',
    hasKey: !!process.env.SCRAPINGDOG_API_KEY,
    keyPrefix: process.env.SCRAPINGDOG_API_KEY ? process.env.SCRAPINGDOG_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    timestamp: Date.now()
  });
});

// 404 Catch-all for unhandled routes
app.use((req, res, next) => {
  console.log(`404 Unhandled Request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route ${req.originalUrl} not found on this server.` });
});

// Global Error Handler (Express 5 compatible)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Version: v2-scrapingdog`);
  console.log(`SCRAPINGDOG_API_KEY: ${process.env.SCRAPINGDOG_API_KEY ? 'SET (' + process.env.SCRAPINGDOG_API_KEY.substring(0, 8) + '...)' : 'NOT SET'}`);
});
