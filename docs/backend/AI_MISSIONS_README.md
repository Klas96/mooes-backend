# Mooves AI Missions Feature

## Overview

The Mooves AI assistant now operates with **TWO distinct missions** to provide a more comprehensive and personalized dating experience:

1. **Mission 1: Get to Know You & Improve Your Profile**
2. **Mission 2: Find Compatible Matches**

## Mission 1: Get to Know You & Improve Your Profile

### Purpose
- Understand the user's personality, interests, values, and dating preferences
- Suggest relevant keywords to improve profile visibility and attractiveness
- Help users create more compelling and searchable profiles

### How It Works
1. **Interactive Questioning**: The AI asks 2-3 specific questions about:
   - Hobbies and activities that bring joy
   - Values important in relationships
   - Ideal weekend activities
   - Deal-breakers or must-haves
   - Relationship goals and preferences

2. **Keyword Generation**: Based on user responses, the AI suggests 5-8 relevant keywords including:
   - Hobbies and interests
   - Personality traits
   - Values and beliefs
   - Lifestyle preferences
   - Deal-breakers

3. **Profile Enhancement**: Users can easily add suggested keywords to their profile with one click

### Example Interaction
```
User: "Help me improve my profile"
AI: "I'd love to help you create an amazing profile! Let me ask a few questions to understand you better:

1. What are your top 3 hobbies or activities that bring you joy?
2. What values are most important to you in a relationship?
3. What's your ideal weekend like?"

User: "I love hiking, photography, and cooking. I value honesty and kindness. My ideal weekend is exploring nature and trying new restaurants."
AI: "Perfect! Based on what you've shared, here are some keywords for your profile: hiking, photography, cooking, honesty, kindness, outdoor adventures, foodie, nature lover, authenticity, creativity. These keywords will help you attract like-minded people who share your interests and values!"
```

## Mission 2: Find Compatible Matches

### Purpose
- Use gathered information to find the best potential matches
- Present matches with detailed explanations of compatibility
- Consider shared keywords, values, and preferences

### How It Works
1. **Information Gathering**: The AI uses information from Mission 1 or asks clarifying questions
2. **Match Analysis**: Analyzes potential matches based on:
   - Shared keywords and interests
   - Compatible relationship goals
   - Matching lifestyle preferences
   - Geographic proximity
   - Gender and relationship type preferences

3. **Detailed Recommendations**: Presents matches with comprehensive explanations of why they're compatible

### Example Interaction
```
User: "Show me someone who might be a good match"
AI: "I'd love to help you find the perfect match! To give you the best recommendation, I have a few questions:

1. What type of relationship are you looking for right now? (casual dating, serious relationship, friendship, etc.)
2. What are your top 3 hobbies or activities that you'd love to share with someone?
3. Are there any deal-breakers or must-haves for you in a potential partner?"

User: "I'm looking for a serious relationship, I love hiking and photography, and I want someone who's honest and kind"
AI: {
  "type": "profile_list",
  "profiles": [{"id": 123}],
  "explanation": "Perfect! I found someone who seems like an ideal match for you. Sarah is also looking for a serious relationship and shares your passion for outdoor activities. Her profile mentions she's an avid hiker and loves photography, which aligns perfectly with your hobbies. She describes herself as honest, kind, and looking for someone who values authenticity - exactly what you're seeking. Her bio shows she's adventurous and loves exploring nature, which would make for great shared experiences together."
}
```

## Technical Implementation

### Backend Changes

#### Enhanced AI Controller (`aiController.js`)
- **Two-Mission System**: Clear separation between profile improvement and match finding
- **User Profile Context**: Includes current keywords, bio, preferences in AI prompts
- **Keyword Extraction**: Automatically identifies and extracts suggested keywords from AI responses
- **Match Filtering**: Excludes already matched, liked, or disliked users

#### New API Endpoints
- `POST /api/ai/update-keywords`: Update user keywords based on AI suggestions
- Enhanced validation for keyword updates

#### Enhanced System Prompt
The AI now receives comprehensive context including:
- Current user profile information
- Available potential matches
- Clear instructions for both missions
- Response format rules for different scenarios

### Frontend Changes

#### Enhanced AI Service (`ai_service.dart`)
- **Keyword Extraction**: `extractKeywordsFromResponse()` method to parse AI suggestions
- **Keyword Update**: `updateKeywords()` method to apply suggestions to user profile
- **Error Handling**: Improved error handling for keyword operations

#### Enhanced Home Tab (`home_tab.dart`)
- **Keyword Update Dialog**: Automatic popup when AI suggests keywords
- **One-Click Application**: Users can easily add suggested keywords to their profile
- **Improved Welcome Message**: Clear explanation of both missions
- **Better UX**: Visual feedback for keyword updates

## API Endpoints

### POST /api/ai/chat
Send a message to the AI assistant.

**Request:**
```json
{
  "message": "Help me improve my profile"
}
```

**Response:**
```json
{
  "response": "I'd love to help you create an amazing profile! Let me ask a few questions..."
}
```

### POST /api/ai/update-keywords
Update user keywords based on AI suggestions.

**Request:**
```json
{
  "keywords": ["hiking", "photography", "honesty", "kindness", "outdoor adventures"]
}
```

**Response:**
```json
{
  "message": "Keywords updated successfully",
  "keywords": ["hiking", "photography", "honesty", "kindness", "outdoor adventures"]
}
```

### GET /api/ai/usage
Get AI message usage for current user.

**Response:**
```json
{
  "currentCount": 3,
  "dailyLimit": 5,
  "isPremium": false,
  "remainingMessages": 2
}
```

## User Experience Flow

### Mission 1 Flow
1. User asks for profile improvement help
2. AI asks 2-3 targeted questions
3. User provides information about interests and preferences
4. AI suggests relevant keywords
5. User can apply keywords with one click
6. Profile becomes more attractive and searchable

### Mission 2 Flow
1. User asks for potential matches
2. AI asks clarifying questions (if needed)
3. AI analyzes available profiles
4. AI presents best match with detailed explanation
5. User can view the suggested profile
6. User can like/dislike the suggested match

## Benefits

### For Users
- **Personalized Experience**: AI learns user preferences over time
- **Better Profiles**: Keyword suggestions improve profile visibility
- **Quality Matches**: More informed matching based on shared interests
- **Easy Profile Enhancement**: One-click keyword application
- **Clear Guidance**: Two distinct missions provide focused assistance

### For the Platform
- **Improved Matching**: Better keyword-based matching
- **User Engagement**: Interactive AI conversations increase engagement
- **Profile Quality**: Users create more detailed and attractive profiles
- **Data Collection**: Gathers valuable user preference data
- **Scalable**: AI can handle multiple users simultaneously

## Testing

### Test Script
Run the test script to verify AI missions functionality:

```bash
cd nodejs-backend
node test-ai-missions.js
```

### Manual Testing
1. **Mission 1 Testing**:
   - Ask AI to help improve profile
   - Verify AI asks relevant questions
   - Check keyword extraction and update functionality

2. **Mission 2 Testing**:
   - Ask AI to find matches
   - Verify AI asks clarifying questions
   - Check match presentation with explanations

## Future Enhancements

### Planned Features
- **Keyword Analytics**: Track which keywords lead to more matches
- **Profile Score**: AI-generated profile attractiveness score
- **Conversation Coaching**: Real-time conversation tips
- **Photo Analysis**: AI-powered photo suggestions
- **Advanced Matching**: Machine learning-based compatibility scoring

### Potential Improvements
- **Multi-language Support**: Support for multiple languages
- **Voice Chat**: Voice-to-text and text-to-speech capabilities
- **Video Chat Integration**: AI-powered video call assistance
- **Relationship Coaching**: Long-term relationship advice
- **Safety Features**: AI-powered safety checks and warnings

## Troubleshooting

### Common Issues

1. **AI Not Responding**
   - Check OpenAI API key configuration
   - Verify API quota and billing
   - Check server logs for errors

2. **Keywords Not Extracting**
   - Verify AI response format
   - Check keyword extraction regex patterns
   - Test with different response formats

3. **Match Suggestions Not Working**
   - Verify user profile completion
   - Check available potential matches
   - Ensure proper filtering logic

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your `.env` file.

## Security Considerations

- **Input Validation**: All user inputs are validated
- **Rate Limiting**: Message limits prevent abuse
- **Data Privacy**: User data is not stored in AI responses
- **Authentication**: All endpoints require user authentication
- **Profile Protection**: Sensitive profile data is filtered

## Support

For issues or questions about the AI missions feature:
1. Check server logs for detailed error information
2. Verify OpenAI API configuration
3. Test with the provided test script
4. Review the troubleshooting section above 