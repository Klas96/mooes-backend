# Keyword Functionality Enhancement Plan

## Overview
This document outlines the enhancement of keyword functionality in the Mooves app to improve matching accuracy and user experience.

## Current State Analysis

### ✅ What's Already Implemented
1. **Database Storage**: Keywords stored as JSON array in `UserProfile.keyWords`
2. **Basic UI**: Comma-separated input field for adding keywords
3. **Display**: Keywords shown as chips in profile views
4. **AI Mention**: Keywords referenced in AI matching but not actively used

### 🔄 Areas for Enhancement

## 1. Keyword Matching Algorithm

### Backend Enhancements

#### A. Keyword Similarity Scoring
```javascript
// New function in profileController.js
const calculateKeywordSimilarity = (userKeywords, matchKeywords) => {
  const userSet = new Set(userKeywords.map(k => k.toLowerCase()));
  const matchSet = new Set(matchKeywords.map(k => k.toLowerCase()));
  
  const intersection = new Set([...userSet].filter(x => matchSet.has(x)));
  const union = new Set([...userSet, ...matchSet]);
  
  return intersection.size / union.size; // Jaccard similarity
};
```

#### B. Enhanced Matching Query
```javascript
// Modify getPotentialMatches to include keyword scoring
const getPotentialMatchesWithKeywords = async (req, res) => {
  // ... existing filtering logic ...
  
  // Add keyword-based scoring
  const userKeywords = currentProfile.keyWords || [];
  
  const scoredProfiles = profiles.map(profile => {
    const matchKeywords = profile.keyWords || [];
    const keywordScore = calculateKeywordSimilarity(userKeywords, matchKeywords);
    
    return {
      ...profile.toJSON(),
      keywordScore,
      sharedKeywords: userKeywords.filter(k => 
        matchKeywords.some(mk => mk.toLowerCase() === k.toLowerCase())
      )
    };
  });
  
  // Sort by keyword score + other factors
  scoredProfiles.sort((a, b) => {
    const totalScoreA = (a.keywordScore * 0.4) + (a.relationshipOverlap * 0.6);
    const totalScoreB = (b.keywordScore * 0.4) + (b.relationshipOverlap * 0.6);
    return totalScoreB - totalScoreA;
  });
};
```

## 2. Keyword Suggestions & Auto-complete

### A. Popular Keywords Database
```javascript
// New model: PopularKeywords.js
const PopularKeywords = sequelize.define('PopularKeywords', {
  keyword: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.ENUM('hobby', 'interest', 'lifestyle', 'personality', 'activity'),
    allowNull: false
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});
```

### B. Keyword Suggestions API
```javascript
// New endpoint: GET /api/keywords/suggestions
const getKeywordSuggestions = async (req, res) => {
  const { query, category } = req.query;
  
  let whereClause = {};
  if (query) {
    whereClause.keyword = { [Op.iLike]: `%${query}%` };
  }
  if (category) {
    whereClause.category = category;
  }
  
  const suggestions = await PopularKeywords.findAll({
    where: whereClause,
    order: [['usageCount', 'DESC'], ['keyword', 'ASC']],
    limit: 10
  });
  
  res.json(suggestions);
};
```

## 3. Enhanced Frontend Features

### A. Smart Keyword Input
```dart
// Enhanced keyword input widget
class SmartKeywordInput extends StatefulWidget {
  final List<String> currentKeywords;
  final Function(List<String>) onKeywordsChanged;
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Auto-complete text field
        Autocomplete<String>(
          optionsBuilder: (TextEditingValue textEditingValue) async {
            if (textEditingValue.text.isEmpty) return [];
            return await KeywordService.getSuggestions(textEditingValue.text);
          },
          onSelected: (String selection) {
            // Add to keywords
          },
        ),
        // Popular keywords chips
        Wrap(
          children: popularKeywords.map((keyword) => 
            ActionChip(
              label: Text(keyword),
              onPressed: () => addKeyword(keyword),
            )
          ).toList(),
        ),
      ],
    );
  }
}
```

### B. Keyword Analytics
```dart
// Show keyword insights to users
class KeywordInsights extends StatelessWidget {
  final List<String> userKeywords;
  final List<String> matchKeywords;
  
  @override
  Widget build(BuildContext context) {
    final sharedKeywords = userKeywords.where(
      (keyword) => matchKeywords.contains(keyword)
    ).toList();
    
    return Card(
      child: Column(
        children: [
          Text('Shared Interests'),
          Wrap(
            children: sharedKeywords.map((keyword) => 
              Chip(label: Text(keyword))
            ).toList(),
          ),
        ],
      ),
    );
  }
}
```

## 4. AI Integration Enhancement

### A. Keyword-Aware AI Prompts
```javascript
// Enhanced AI system prompt
const enhancedSystemPrompt = `
... existing prompt ...

KEYWORD MATCHING CONTEXT:
- User keywords: ${userProfile.keyWords.join(', ')}
- Focus on profiles with shared keywords
- Mention keyword compatibility in explanations
- Suggest conversation starters based on shared keywords

When suggesting matches, prioritize:
1. Profiles with shared keywords
2. Keyword compatibility score
3. Relationship type alignment
4. Location preferences
`;
```

### B. Keyword-Based Conversation Starters
```javascript
// Generate conversation starters based on shared keywords
const generateKeywordStarters = (sharedKeywords) => {
  const starters = {
    'music': 'I see you love music too! What\'s your favorite genre?',
    'travel': 'Travel buddies! What\'s the most amazing place you\'ve visited?',
    'cooking': 'A fellow foodie! What\'s your signature dish?',
    'fitness': 'Fitness goals! What\'s your favorite workout?',
    'reading': 'Book lovers unite! What\'s the last great book you read?'
  };
  
  return sharedKeywords
    .map(keyword => starters[keyword.toLowerCase()])
    .filter(starter => starter);
};
```

## 5. Keyword Analytics & Insights

### A. User Keyword Analytics
```javascript
// Track keyword usage and effectiveness
const trackKeywordEffectiveness = async (userId, keywords, matchRate) => {
  await KeywordAnalytics.create({
    userId,
    keywords: JSON.stringify(keywords),
    matchRate,
    timestamp: new Date()
  });
};
```

### B. Keyword Recommendations
```javascript
// Suggest keywords based on successful profiles
const getKeywordRecommendations = async (userId) => {
  const userProfile = await UserProfile.findOne({ where: { userId } });
  const successfulProfiles = await getSuccessfulMatches(userId);
  
  // Analyze keywords from successful matches
  const keywordFrequency = {};
  successfulProfiles.forEach(profile => {
    profile.keyWords.forEach(keyword => {
      keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
    });
  });
  
  return Object.entries(keywordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([keyword]) => keyword);
};
```

## 6. Implementation Priority

### Phase 1: Core Matching Enhancement
1. ✅ Implement keyword similarity scoring
2. ✅ Modify matching algorithm to include keyword scores
3. ✅ Add keyword suggestions API
4. ✅ Enhance frontend keyword input

### Phase 2: AI Integration
1. ✅ Update AI prompts to consider keywords
2. ✅ Add keyword-based conversation starters
3. ✅ Implement keyword-aware match explanations

### Phase 3: Analytics & Insights
1. ✅ Add keyword effectiveness tracking
2. ✅ Implement keyword recommendations
3. ✅ Create keyword analytics dashboard

### Phase 4: Advanced Features
1. ✅ Keyword categories and filtering
2. ✅ Keyword trends and popularity
3. ✅ Personalized keyword suggestions

## 7. Database Schema Updates

### New Tables
```sql
-- Popular keywords table
CREATE TABLE popular_keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Keyword analytics table
CREATE TABLE keyword_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  keywords JSONB NOT NULL,
  match_rate DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for keyword searches
CREATE INDEX idx_user_profiles_keywords ON user_profiles USING GIN (key_words);
```

## 8. Testing Strategy

### Unit Tests
- Keyword similarity calculation
- Keyword suggestions API
- Keyword analytics tracking

### Integration Tests
- End-to-end keyword matching flow
- AI integration with keywords
- Frontend keyword input functionality

### Performance Tests
- Keyword search performance
- Matching algorithm with keyword scoring
- Database query optimization

## 9. Monitoring & Metrics

### Key Metrics to Track
- Keyword usage frequency
- Keyword match success rate
- User engagement with keyword features
- AI response quality with keyword context

### Monitoring Dashboard
- Popular keywords by category
- Keyword effectiveness by user segment
- Keyword matching success rates
- User keyword adoption rates

## 10. Future Enhancements

### Advanced Features
1. **Semantic Keyword Matching**: Use NLP to match similar keywords
2. **Keyword Categories**: Organize keywords into interest categories
3. **Keyword Trends**: Track trending keywords in the dating community
4. **Keyword Compatibility**: Advanced algorithms for keyword compatibility
5. **Keyword Learning**: AI learns from user behavior to suggest better keywords

### Integration Opportunities
1. **Social Media Integration**: Import interests from social profiles
2. **Activity Integration**: Connect with fitness apps, music services
3. **Location-Based Keywords**: Suggest location-specific keywords
4. **Seasonal Keywords**: Dynamic keywords based on seasons/events

This enhancement plan will significantly improve the matching accuracy and user experience by leveraging keyword data more effectively throughout the application. 