# Mooves Key Maker Feature

## Overview

The Mooves app now includes a key maker feature in the main "Mooves" tab that helps users find their perfect match by providing personalized dating advice and assistance.

## Features

- **Key Maker Chat**: Intelligent conversation with OpenAI's GPT-3.5-turbo
- **Personalized Responses**: Key maker considers user profile information for context
- **Conversation History**: Maintains chat history for continuity
- **Dating Advice**: Provides tips on profiles, conversations, and relationships
- **Profile Optimization**: Suggests ways to improve dating profiles
- **Conversation Starters**: Offers ideas for starting conversations with matches
- **Message Limits**: Free users have a daily message limit (e.g., 10 messages per day).
- **Premium Feature - Unlimited Messages**: Premium users enjoy unlimited messages with the AI assistant.

## Implementation

### Frontend (Flutter)

**Files Modified:**
- `dating_app/lib/screens/tabs/home_tab.dart` - Replaced with key maker interface
- `dating_app/lib/services/ai_service.dart` - New key maker service for API calls

**Key Features:**
- Real-time chat interface with message bubbles
- Loading indicators during key maker processing
- Welcome message for new users
- Clear chat functionality
- Error handling and user feedback

### Backend (Node.js)

**New Files:**
- `nodejs-backend/controllers/aiController.js` - Key maker controller
- `nodejs-backend/routes/ai.js` - Key maker API routes
- `nodejs-backend/install-ai.sh` - Installation script

**Modified Files:**
- `nodejs-backend/server.js` - Added key maker routes
- `nodejs-backend/package.json` - Added OpenAI dependency
- `nodejs-backend/env.example` - Added OpenAI API key configuration
- `nodejs-backend/models/User.js` - Added `aiMessageCount` and `lastAiMessageDate` fields for message limiting.

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd nodejs-backend

# Install OpenAI dependency
npm install openai@^4.20.1

# Or use the installation script
./install-ai.sh
```

### 2. Environment Configuration

Add your OpenAI API key to your `.env` file:

```env
# OpenAI Configuration (for key maker)
OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Restart Server

```bash
npm run dev
```

### 4. Frontend

The Flutter app will automatically use the new key maker interface in the Mooves tab.

## API Endpoints

### POST /api/ai/chat
Send a message to the key maker and get a response.

**Request:**
```json
{
  "message": "What should I look for in a partner?"
}
```

**Response:**
```json
{
  "response": "When looking for a partner, consider shared values, communication style, and life goals...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Possible Error Response (429 Too Many Requests):**
If a non-premium user exceeds their daily message limit:
```json
{
  "error": "Message limit reached for today. Upgrade to premium for unlimited messages.",
  "limitReached": true
}
```

### GET /api/ai/conversation-history
Get the user's conversation history.

**Response:**
```json
[
  {
    "id": "msg_123_0",
    "content": "Hello!",
    "isUser": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "msg_123_1", 
    "content": "Hi there! I'm your Mooves Key Maker assistant...",
    "isUser": false,
    "timestamp": "2024-01-15T10:30:05.000Z"
  }
]
```

### DELETE /api/ai/conversation-history
Clear the user's conversation history.

**Response:**
```json
{
  "message": "Conversation history cleared successfully"
}
```

## Key Maker Behavior

The key maker is configured to:

- **Be warm and supportive** - Encouraging and positive tone
- **Provide dating advice** - Tips on profiles, conversations, relationships
- **Ask follow-up questions** - To better understand user preferences
- **Consider user context** - Uses profile information for personalized responses
- **Stay focused** - Keeps responses relevant to dating and relationships
- **Be inclusive** - Respectful of all relationship types and preferences

## Security

- All key maker endpoints require authentication
- User profile information is used for context but not stored in key maker responses
- Conversation history is stored in memory (consider database storage for production)
- Rate limiting applies to key maker endpoints
- Input validation prevents malicious content

## Future Enhancements

- **Database Storage**: Store conversation history in database
- **Advanced Matching**: Use key maker to suggest compatible profiles
- **Profile Analysis**: Key maker-powered profile optimization suggestions
- **Conversation Coaching**: Real-time conversation tips
- **Multi-language Support**: Support for multiple languages
- **Voice Chat**: Voice-to-text and text-to-speech capabilities

## Troubleshooting

### Common Issues

1. **"Key maker service configuration error"**
   - Check that OPENAI_API_KEY is set correctly in .env
   - Verify the API key is valid and has sufficient credits

2. **"Key maker service rate limit exceeded"**
   - OpenAI has rate limits. Wait a moment and try again
   - Consider upgrading OpenAI plan for higher limits

3. **"Failed to get key maker response"**
   - Check network connectivity
   - Verify backend server is running
   - Check server logs for detailed error information

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your .env file.

## Support

For issues or questions about the key maker feature, check the server logs and ensure all dependencies are properly installed. 