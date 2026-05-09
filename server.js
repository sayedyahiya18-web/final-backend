require('dotenv').config();
const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/product');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes with strict routing disabled for flexibility
app.use('/api/product', productRoutes);
app.use('/api/chat', chatRoutes);

// Additional test endpoint to verify chat route reachability
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
    hasKey: !!process.env.GEMINI_API_KEY,
    keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'NOT SET',
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
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'SET (' + process.env.GEMINI_API_KEY.substring(0, 8) + '...)' : 'NOT SET'}`);
});
