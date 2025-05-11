const aiConfig = {
  // Default model configurations
  model_configs: {
    default_chat: {
      model: "gpt-3.5-turbo", // Default model for chat and explanations
      temperature: 0.7,       // Default creativity/randomness
      max_tokens: 1000,       // Default max length of the response
    },
    // }
  },

  // System prompts for different explanation styles
  // The '{text}' placeholder will be replaced with the actual selected text by aiService.js
  explanation_system_prompts: {
    default: "You are a helpful AI assistant. Please address the following text:",
    Summarize: "You are an expert summarizer. Provide a concise summary of the following text:",
    "Explain simply": "You are an expert at explaining complex topics simply. Explain the following text in a very easy to understand way, as if to a beginner:",
    "Funny analogy": "You are an AI with a great sense of humor. Explain the following text using a creative and funny analogy:",
    Expand: "You are an AI that elaborates on topics. Expand on the following text, providing more detail, context, and examples:",
  },

  // Default system prompt for general chat interactions
  chat_default_system_prompt: "You are a helpful AI assistant. Engage in a natural conversation."
};

module.exports = aiConfig;