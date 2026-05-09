const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

// Middleware to handle AI errors globally for these routes
const handleAIError = (res, error) => {
  console.error('AI Route Error:', error.message);
  if (error.message.includes('API_KEY')) {
    return res.status(500).json({ message: 'Server configuration error: AI key missing.' });
  }
  res.status(500).json({ message: 'The AI is currently busy. Please try again in a few seconds.', details: error.message });
};

router.post('/', async (req, res) => {
  try {
    const { query, product, profile } = req.body;
    const reply = await aiService.chat(query, profile, product);
    res.json({ reply });
  } catch (error) {
    handleAIError(res, error);
  }
});

router.post('/insight', async (req, res) => {
  try {
    const { product, profile } = req.body;
    if (!product) return res.status(400).json({ message: 'No product data provided.' });
    const insight = await aiService.generateInsight(product, profile);
    res.json(insight);
  } catch (error) {
    handleAIError(res, error);
  }
});

router.post('/diet-plan', async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ message: 'No profile data provided.' });
    const plan = await aiService.generateDietPlan(profile);
    res.json(plan);
  } catch (error) {
    handleAIError(res, error);
  }
});

module.exports = router;
