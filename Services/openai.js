// services/openai.js
const { fillTemplate } = require('../templateProcessor');  // Assuming templateProcessor.js handles this
const { sendToOpenAI } = require('../api/gpt');  // Assuming gpt.js exists for OpenAI interactions
module.exports = { fillTemplate, sendToOpenAI };
