require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const pantryRoutes = require('./routes/pantry');
const emailRoutes = require('./routes/email');
const walmartOrdersRoutes = require('./routes/walmartOrders');
const { initExpiryChecker } = require('./jobs/expiryChecker');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'Life AI' });
});

// Routes
app.use('/api/pantry', pantryRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/walmart-orders', walmartOrdersRoutes);

// Serve React client
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      initExpiryChecker();
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
