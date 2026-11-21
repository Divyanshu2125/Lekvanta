// Vercel Serverless Function entry point
// Connects Vercel /api requests to the compiled Express application

const app = require('../backend/dist/index').default;

module.exports = app;
