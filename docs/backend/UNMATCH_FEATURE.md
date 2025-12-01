# Unmatch Feature

## Overview

The unmatch feature allows users to remove their connection with another user. When a user unmatches someone, both users will no longer be able to message each other and the match will be removed from their matches list.

## Message Status Behavior

### Active Matches
- Users who have mutually liked each other (status: 'matched')
- Can send and receive messages
- Appear in the main messages tab

### Pending Messages
- Messages sent to users who haven't liked you back yet (status: 'liked')
- Appear in a separate "Pending" section in the messages tab
- Cannot send additional messages until the other person likes you back
- Can unmatch to remove the pending message

## Backend Implementation

### Database Changes

- Added `'unmatched'` status to the Match model enum
- Migration script: `migrations/add-unmatched-status.js`
- Run migration: `node scripts/run-unmatch-migration.js`

### API Endpoints

#### POST /api/matches/unmatch

**Request Body:**
```json
{
  "matchId": 123
}
```

**Response:**
```json
{
  "message": "User unmatched successfully",
  "matchId": 123
}
```

#### GET /api/matches/pending-messages

**Response:**
```json
[
  {
    "id": 123,
    "status": "pending",
    "profile": {
      "id": 456,
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }
]
```

**Error Responses:**
- `400`: Match ID is required
- `404`: Match not found or you are not part of this match
- `500`: Server error

### Controller Functions

- `unmatchUser()` in `controllers/matchController.js`
- `getPendingMessages()` in `controllers/matchController.js`
- Validates user is part of the match
- Updates match status to 'unmatched'
- Emits WebSocket notifications to both users

## Frontend Implementation

### MatchService

- Added `unmatchUser(String matchId)` method
- Added `getPendingMessages()` method
- Handles API communication and error handling

### UI Components

#### Messages Tab
- Shows active matches and pending messages in separate sections
- Long press on match to show options menu
- "Unmatch" option with confirmation dialog
- Removes match from local list after successful unmatch
- Pending messages show "Pending" badge and cannot be messaged

#### Chat Screen
- More options menu (three dots) in app bar
- "Unmatch" option with confirmation dialog
- Navigates back to messages tab after successful unmatch

### User Experience

1. User sends like with message to someone who hasn't liked them back
2. Message appears in "Pending" section with orange "Pending" badge
3. User can view the other person's profile but cannot send additional messages
4. If the other person likes them back, the message moves to active matches
5. User can unmatch at any time to remove the pending message
6. Confirmation dialog appears with warning about permanent action
7. Match is removed from UI immediately
8. Success/error message is shown to user
9. WebSocket notification sent to other user

## Security Considerations

- Only matched users can unmatch (status must be 'matched')
- User must be part of the match to unmatch
- Unmatch action is permanent and cannot be undone
- Both users are notified via WebSocket when unmatch occurs
- Pending messages are only visible to the sender

## Testing

- Backend: Unit tests for controller function
- Frontend: Widget tests for UI components
- Integration: End-to-end tests for complete unmatch flow

## Migration Notes

- Existing matches are unaffected
- New 'unmatched' status is added to enum
- Migration is safe to run multiple times (handles duplicate value error) 