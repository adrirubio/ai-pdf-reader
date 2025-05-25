const { aiConfig } = require('../config/aiConfig.js'); // Changed from import to require
const OpenAI = require('openai');

// Placeholder for the AI API client (e.g., OpenAI library)
// You'll need to install the appropriate SDK, e.g., `npm install openai`

// --- Custom Error Types ---
class AIAPIError extends Error {
  constructor(message, statusCode, originalError = null) {
    super(message);
    this.name = 'AIAPIError';
    this.statusCode = statusCode; // e.g., 401, 429, 500
    this.originalError = originalError;
  }
}

class AINetworkError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'AINetworkError';
    this.originalError = originalError;
  }
}

class AIConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AIConfigError';
  }
}

// --- API Key Management ---
let storedApiKey = null;

const getApiKey = () => {
  // Use stored API key first, then fallback to environment variable
  const apiKey = storedApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('API Key not found in stored configuration or environment variables.');
    return null;
  }
  return apiKey;
};

const updateApiKey = (newApiKey) => {
  storedApiKey = newApiKey;
  console.log('Updated stored API key');
  
  // Reinitialize OpenAI client with new key
  try {
    if (newApiKey && newApiKey.trim()) {
      openai = new OpenAI({
        apiKey: newApiKey,
      });
      console.log('OpenAI client reinitialized with new API key');
    } else {
      openai = null;
      console.warn('OpenAI client set to null due to empty API key');
    }
  } catch (error) {
    console.error('Failed to reinitialize OpenAI client with new API key:', error.message);
    openai = null;
  }
};

const callAiApi = async (promptOrMessages, modelConfig, isChat = false, streamCallback = null) => {
  const apiKey = getApiKey();

  // Simulate API key missing for fallback testing
  if (promptOrMessages.includes && promptOrMessages.includes('test_no_api_key')) {
     console.log('callAiApi: Simulating missing API key scenario.');
     // This doesn't directly throw here, getApiKey() handles it.
     // We'll rely on apiKey being null below.
  } else if (!apiKey) {
    // If API key is genuinely missing and getApiKey returned null
    throw new AIConfigError('API key is missing. Cannot call AI API.');
  }


  // --- TODO: Replace this entire block with actual API SDK calls ---
  // This simulation block will be replaced by your chosen AI provider's SDK interaction
  console.log(`callAiApi: Simulating ${isChat ? 'Chat' : 'Explain'} API call. ${streamCallback ? 'Streaming enabled.' : 'No streaming.'}`);

  // Simulate different error types for testing
  if (typeof promptOrMessages === 'string' && promptOrMessages.includes('test_api_error_429')) {
    throw new AIAPIError('Rate limit exceeded', 429);
  }
  if (typeof promptOrMessages === 'string' && promptOrMessages.includes('test_api_error_500')) {
    throw new AIAPIError('Internal server error from AI API', 500);
  }
  if (typeof promptOrMessages === 'string' && promptOrMessages.includes('test_network_error')) {
    throw new AINetworkError('Simulated network failure');
  }
  // --- End of simulation block to be replaced ---

  // Actual SDK calls would go here, e.g., for OpenAI:
  /*
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    if (isChat) {
      const completion = await openai.chat.completions.create({
        messages: promptOrMessages, // expects array of {role, content}
        model: modelConfig.model,
        // ... other params
      });
      return completion.choices[0].message.content;
    } else {
      const completion = await openai.chat.completions.create({ // Or a different endpoint if available/suitable
        messages: [{ role: "user", content: promptOrMessages }], // promptOrMessages is a string here
        model: modelConfig.model,
        // ... other params
      });
      return completion.choices[0].message.content;
    }
  } catch (error) {
    if (error.response) { // Axios-like error structure, OpenAI SDK might have different structure
      throw new AIAPIError(error.message, error.response.status, error);
    } else if (error.request) { // Network error
      throw new AINetworkError(error.message, error);
    } else { // Other errors
      throw new Error(`Unexpected error during AI API call: ${error.message}`);
    }
  }
  */

  // Fallback to simple simulation if no error was thrown by test cases
  if (streamCallback && !isChat) { // Simulate streaming for explainText
    const fullText = `This is a simulated, streamed explanation for: "${promptOrMessages.substring(0, 60)}..." It will arrive in several chunks. This helps make the UI feel more responsive. The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.`;
    const chunks = fullText.match(/.{1,20}/g) || []; // Split into small chunks
    let aggregatedResponse = "";

    for (let i = 0; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay for each chunk
      streamCallback(chunks[i], false); // Not the last chunk yet
      aggregatedResponse += chunks[i];
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    streamCallback("", true); // Send final empty chunk to signal end
    return aggregatedResponse; // Return the full aggregated text
  } else if (isChat) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const lastUserMessage = promptOrMessages.filter(m => m.role === 'user').pop();
    return `(Simulated) AI thinks about: "${lastUserMessage ? lastUserMessage.content.substring(0, 40) : 'your message'}"`;
  } else {
  await new Promise(resolve => setTimeout(resolve, 1000));
    return `(Simulated) Detailed thoughts on: "${promptOrMessages.substring(0, 60)}..."`;
  }
};

// --- Fallback Responses ---
const getFallbackResponse = (error, context = 'general') => {
  console.warn(`aiService: Generating fallback due to error: ${error.name} - ${error.message}`);
  if (error instanceof AIConfigError) {
    return `I seem to be misconfigured. Please check my settings. (Details: ${error.message})`;
  }
  if (error instanceof AIAPIError) {
    if (error.statusCode === 401) return "My access to the AI service was denied. Please check the API key.";
    if (error.statusCode === 429) return "I'm a bit overwhelmed right now (rate limit). Please try again in a moment.";
    return `The AI service seems to be having trouble (Error ${error.statusCode}). Please try again later.`;
  }
  if (error instanceof AINetworkError) {
    return "I couldn't reach the AI service. Please check your internet connection.";
  }
  // Generic fallback
  if (context === 'chat') {
    return "I'm having a little trouble thinking right now. Let's try that again in a bit?";
  }
  return "Sorry, I couldn't process that request due to an unexpected issue. Please try again.";
};

let explainCount = 0;
let chatCount = 0;

// Helper function to simulate delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let openai;
try {
    const initialApiKey = getApiKey();
    if (!initialApiKey) {
        console.warn('API Key not found at initial load. AI service will require API key configuration.');
        openai = null;
    } else {
        openai = new OpenAI({
            apiKey: initialApiKey,
        });
    }
} catch (error) {
    console.error("Failed to initialize OpenAI client during initial load:", error.message);
    openai = null;
}

async function explainTextAndStream(text, style, streamId, streamChunkCallback) {
    console.log(`aiService.explainTextAndStream: ENTER - StreamId: ${streamId}, Style: "${style}"`);

    if (typeof streamChunkCallback !== 'function') {
        console.error("aiService.explainTextAndStream: CRITICAL ERROR - streamChunkCallback is not a function.");
        return;
    }

    if (!openai || !getApiKey()) {
        const errorMsg = !openai ? 'OpenAI client not initialized (check API key configuration).' : 'OpenAI API Key not configured for explanation.';
        console.warn(`aiService.explainTextAndStream: ${errorMsg}`);
        streamChunkCallback({ streamId, type: 'error', content: errorMsg });
        return;
    }

    let systemPrompt = "You are a helpful AI assistant.";
    if (style === 'Summarize') {
        systemPrompt = "You are an expert summarizer. Provide a concise summary of the following text.";
    } else if (style === 'Explain simply') {
        systemPrompt = "You are an expert at explaining complex topics simply. Explain the following text in a very easy to understand way, as if to a beginner.";
    } else if (style === 'Funny analogy') {
        systemPrompt = "You are an AI with a great sense of humor. Explain the following text using a creative and funny analogy.";
    } else if (style === 'Expand') {
        systemPrompt = "You are an AI that elaborates on topics. Expand on the following text, providing more detail, context, and examples.";
    } else {
        // Use the custom prompt directly if it's not a predefined style
        systemPrompt = style;
    }

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please address the following text:\n\n${text}` }
    ];

    try {
        console.log(`aiService.explainTextAndStream: Attempting OpenAI API call for streamId: ${streamId}`);
        // streamChunkCallback({ streamId, type: 'status', content: 'Contacting AI for explanation...' });

        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 500,
        });

        for await (const chunk of stream) {
            const contentPiece = chunk.choices[0]?.delta?.content || "";
            if (contentPiece) {
                streamChunkCallback({
                    streamId,
                    type: 'content',
                    content: contentPiece,
                    isLastChunk: false
                });
            }
            if (chunk.choices[0]?.finish_reason) break;
        }
        console.log(`aiService.explainTextAndStream: OpenAI API call finished for streamId: ${streamId}`);

    } catch (error) {
        console.error(`aiService.explainTextAndStream: Error during OpenAI API call for streamId ${streamId}:`, error.message);
        let errorMessage = 'An unknown error occurred with the AI explanation service.';
         if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('connection error')) {
            errorMessage = `Connection error (Explain): Could not connect to AI. (Details: ${error.message})`;
        } else if (error.response) {
            errorMessage = `AI API Error (Explain): ${error.response.status} - ${error.response.data?.error?.message || error.message}`;
        } else if (error.message) {
            errorMessage = error.message; // General error
        }
        streamChunkCallback({ streamId, type: 'error', content: errorMessage });
    }
}

async function startChatStream(messages, streamId, streamChunkCallback) {
    console.log(`aiService.startChatStream: ENTER - StreamId: ${streamId}, Messages count: ${messages?.length}`);

    if (typeof streamChunkCallback !== 'function') {
        console.error("aiService.startChatStream: CRITICAL ERROR - streamChunkCallback is not a function.");
        return;
    }

    if (!openai || !getApiKey()) {
        const errorMsg = !openai ? 'OpenAI client not initialized (check API key configuration).' : 'OpenAI API Key not configured for chat.';
        console.warn(`aiService.startChatStream: ${errorMsg}`);
        streamChunkCallback({ streamId, type: 'error', content: errorMsg });
        return;
    }

    // Log the messages received by startChatStream for inspection
    console.log(`aiService.startChatStream: Messages received for OpenAI (length ${messages?.length}):`, JSON.stringify(messages, null, 2));

    let finalMessages = [...messages]; // Make a copy to modify

    // Ensure there's a system message. If not, prepend a default one.
    if (!finalMessages.find(msg => msg.role === 'system')) {
      finalMessages.unshift({ role: "system", content: "Address the user\'s last message directly." });
      console.log(`aiService.startChatStream: Prepended VERY direct system message. Updated messages (length ${finalMessages?.length}):`, JSON.stringify(finalMessages, null, 2));
    } else {
      console.log(`aiService.startChatStream: Existing system message found. Messages (length ${finalMessages?.length}):`, JSON.stringify(finalMessages, null, 2));
    }

    try {
        console.log(`aiService.startChatStream: Attempting OpenAI API call for streamId: ${streamId}. Messages payload:`, JSON.stringify(messages, null, 2));
        // streamChunkCallback({ streamId, type: 'status', content: 'Contacting AI for chat...' });

        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Consider making this configurable
            messages: finalMessages, // Use the potentially modified messages array
            stream: true,
            temperature: 0.7, // Consider making this configurable
            max_tokens: 1500,  // Explicitly set max_tokens for the completion
        });

        for await (const chunk of stream) {
            const contentPiece = chunk.choices[0]?.delta?.content || "";
            if (contentPiece) {
                streamChunkCallback({
                    streamId,
                    type: 'content',
                    content: contentPiece,
                    isLastChunk: false
                });
            }
            if (chunk.choices[0]?.finish_reason) break;
        }
        console.log(`aiService.startChatStream: OpenAI API call finished for streamId: ${streamId}`);

    } catch (error) {
        console.error(`aiService.startChatStream: Error during OpenAI API call for streamId ${streamId}:`, error.message);
        let errorMessage = 'An unknown error occurred with the AI chat service.';
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('connection error')) {
            errorMessage = `Connection error (Chat): Could not connect to AI. (Details: ${error.message})`;
        } else if (error.response) {
            errorMessage = `AI API Error (Chat): ${error.response.status} - ${error.response.data?.error?.message || error.message}`;
        } else if (error.message) {
            errorMessage = error.message; // General error
        }
        streamChunkCallback({ streamId, type: 'error', content: errorMessage });
    }
}

// --- AI Service Public Methods ---
const aiService = {
  async explainText(textToExplain, customPrompt) {
    if (!textToExplain || !customPrompt) {
      // This is more of an input validation, should ideally be caught before calling
      return getFallbackResponse(new Error("Missing text or prompt for explanation."));
    }
    const template = aiConfig.prompt_templates.custom_explain;
    const modelConfig = aiConfig.model_configs.default;
    const filledPrompt = template
      .replace('{custom_prompt}', customPrompt)
      .replace('{text_to_explain}', textToExplain);
    try {
      console.log(`aiService.explainText: Calling API for prompt: "${filledPrompt.substring(0, 100)}..."`);
      const explanation = await callAiApi(filledPrompt, modelConfig, false, null);
      // TODO: Add to usage tracking
      return explanation;
    } catch (error) {
      return getFallbackResponse(error, 'explain');
    }
  },

  async chat(messages) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { role: 'assistant', content: getFallbackResponse(new Error("No messages provided for chat.")) };
    }
    console.log(`aiService.chat: Processing ${messages.length} messages. Last user: "${messages.filter(m=>m.role==='user').pop()?.content.substring(0,50)}..."`);
    const modelConfig = aiConfig.model_configs.default;
    try {
      const aiResponseContent = await callAiApi(messages, modelConfig, true, null);
      // TODO: Add to usage tracking
      return { role: 'assistant', content: aiResponseContent };
    } catch (error) {
      return { role: 'assistant', content: getFallbackResponse(error, 'chat') };
    }
  },

  // Placeholder for usage tracking related functions
  getUsageStats: async () => {
    // TODO: Retrieve and return usage statistics (e.g., from database or internal counters)
    return { tokens_used_today: 0, requests_made: 0 };
  },
  checkQuota: async () => {
    // TODO: Implement quota checking logic
    return { under_quota: true, remaining: Infinity };
  },
  startChatStream
};

module.exports = {
    explainTextAndStream,
    startChatStream,
    updateApiKey
};