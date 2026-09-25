const express = require('express');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for single-page application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🌐 Frontend Web Dashboard running at http://localhost:${PORT}`);
  console.log('====================================================');
});

module.exports = app;
