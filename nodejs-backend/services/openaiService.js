const OpenAI = require('openai');

// Lazy initialization of OpenAI client
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

const resolveModel = () => {
  const configuredModel = process.env.OPENAI_MODEL && process.env.OPENAI_MODEL.trim();
  if (configuredModel) {
    return configuredModel;
  }
  // Default to a widely available model if none specified
  return 'gpt-4o-mini';
};

/**
 * Get response from OpenAI API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Boolean} stream - Whether to stream the response (default: false)
 * @returns {Promise<string|AsyncIterable>} - The AI response text or stream
 */
const getOpenAIResponse = async (messages, stream = false) => {
  try {
    const client = getOpenAIClient();
    const model = resolveModel();
    
    console.log('Sending request to OpenAI with messages:', messages.length, 'model:', model);
    
    const completion = await client.chat.completions.create({
      model,
      messages: messages,
      max_tokens: 2000, // Increased from 500 for complete responses
      temperature: 0.7,
      presence_penalty: 0.2, // Encourage diverse responses
      frequency_penalty: 0.1, // Reduce repetition
      stream: stream, // Enable streaming if requested
    });

    // If streaming, return the stream directly
    if (stream) {
      console.log('OpenAI streaming response initiated');
      return completion;
    }

    // Non-streaming response (original behavior)
    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response received from OpenAI');
    }

    console.log('OpenAI response received:', response.substring(0, 100) + '...');
    return response;
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your account.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.code === 'context_length_exceeded') {
      throw new Error('Conversation too long. Please start a new chat.');
    } else if (error.code === 'model_not_found') {
      throw new Error(`The configured OpenAI model could not be found. Current model: ${resolveModel()}. Update OPENAI_MODEL or check your account access.`);
    }
    
    throw new Error(`OpenAI API error: ${error.message}`);
  }
};

module.exports = {
  getOpenAIResponse,
  getOpenAIClient
}; 