// Vercel Serverless Function Entry Point
// This wraps the Express app for serverless deployment

// Import the Express app from the built backend
const app = require('../packages/backend/dist/app.js').default;

// Export as a Vercel serverless function
module.exports = app;
