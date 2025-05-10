const aiConfig = {
  // Default model configurations
  modelConfigs: {
    defaultCompletion: {
      model: "gpt-3.5-turbo", // Default model for completions/explanations
      temperature: 0.7,
      max_tokens: 500, // Default max tokens for explanations
    },
    defaultChat: {
      model: "gpt-3.5-turbo", // Default model for chat
      temperature: 0.7,
    },
    // }
  },

  // System prompt templates for different explanation styles
  // The '{text}' placeholder will be replaced with the actual text to be explained.
  explanationStylePrompts: {
    default: "You are a helpful AI assistant. Please address the following text:",
    Summarize: "You are an expert summarizer. Provide a concise summary of the following text:",
    ExplainSimply: "You are an expert at explaining complex topics simply. Explain the following text in a very easy to understand way, as if to a beginner:",
    FunnyAnalogy: "You are an AI with a great sense of humor. Explain the following text using a creative and funny analogy:",
    Expand: "You are an AI that elaborates on topics. Expand on the following text, providing more detail, context, and examples:",
  },

  // Default system prompt for general chat conversations
  defaultChatSystemPrompt: "You are a helpful AI assistant. Engage in a helpful and informative conversation.",

  // Function to get a specific explanation prompt
  getExplanationSystemPrompt: function(styleKey = 'default') {
    return this.explanationStylePrompts[styleKey] || this.explanationStylePrompts['default'];
  }
};

module.exports = aiConfig;