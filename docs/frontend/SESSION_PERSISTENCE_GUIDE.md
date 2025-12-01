# Session Persistence Guide - Keeping Users Logged In Through App Restarts

## Overview

This guide explains how the enhanced session management system ensures users remain logged in even when they close and reopen the app, addressing your specific requirement for sessions to be intact through app shutdowns.

## How Session Persistence Works

### 1. **Dual Storage Strategy**
The system uses two storage mechanisms for maximum reliability:

```dart
// Primary: Secure Storage (encrypted)
await _secureStorage.write(key: _sessionKey, value: json.encode(sessionData));

// Backup: SharedPreferences (fallback)
final prefs = await SharedPreferences.getInstance();
await prefs.setString(_sessionKey, json.encode(sessionData));
```

### 2. **Session Data Structure**
Each session contains comprehensive information:

```dart
final sessionData = {
  'token': 'jwt_token_here',
  'user': {
    'id': 'user_id',
    'email': 'user@example.com',
    'firstName': 'John',
    'lastName': 'Doe',
    // ... other user data
  },
  'created_at': '2024-01-01T00:00:00.000Z',
  'last_activity': '2024-01-01T12:00:00.000Z',
  'expires_at': '2024-01-08T00:00:00.000Z', // 7 days from creation
};
```

### 3. **App Startup Flow**
When the app starts, it automatically checks for existing sessions:

```dart
// In main.dart - SplashScreen
Future<void> _initializeApp() async {
  // Initialize authentication system
  final hasValidSession = await AuthService.initialize();
  
  if (hasValidSession) {
    // User is logged in - go to home screen
    Navigator.pushReplacementNamed(context, '/home');
  } else {
    // No valid session - go to sign in
    Navigator.pushReplacementNamed(context, '/signin');
  }
}
```

## Key Features for Session Persistence

### 1. **Automatic Session Validation**
- Checks if session exists in storage
- Validates session hasn't expired (7-day timeout)
- Verifies session with backend server
- Updates last activity timestamp

### 2. **Graceful Fallback**
- Tries secure storage first
- Falls back to SharedPreferences if needed
- Maintains backward compatibility with existing tokens

### 3. **Session Refresh**
- Automatically refreshes sessions every 6 hours
- Extends session expiry when user is active
- Prevents session expiration during app usage

### 4. **Security Features**
- Encrypted storage for sensitive data
- Session timeout after 7 days of inactivity
- Maximum session age of 30 days
- Automatic cleanup of expired sessions

## Implementation Details

### SessionManager Class
The `SessionManager` class handles all session operations:

```dart
class SessionManager {
  // Initialize and restore session on app startup
  static Future<bool> initializeSession() async { ... }
  
  // Store new session after login
  static Future<void> storeSession({
    required String token,
    required Map<String, dynamic> userData,
  }) async { ... }
  
  // Get current session data
  static Future<Map<String, dynamic>?> getCurrentSession() async { ... }
  
  // Check if user is authenticated
  static Future<bool> isAuthenticated() async { ... }
  
  // Refresh session to extend expiry
  static Future<bool> refreshSession() async { ... }
}
```

### AuthService Integration
The `AuthService` uses SessionManager for all authentication operations:

```dart
class AuthService {
  // Initialize on app startup
  static Future<bool> initialize() async {
    return await SessionManager.initializeSession();
  }
  
  // Store session after successful login
  static Future<Map<String, dynamic>> signIn(String email, String password) async {
    // ... login logic ...
    await SessionManager.storeSession(
      token: data['token'],
      userData: data['user'],
    );
  }
  
  // Get token for API calls
  static Future<String?> getToken() async {
    return await SessionManager.getToken();
  }
}
```

## User Experience Flow

### 1. **First Time User**
1. User opens app
2. No session found → Sign In screen
3. User logs in → Session stored
4. User goes to home screen

### 2. **Returning User**
1. User opens app
2. Valid session found → Automatic login
3. User goes directly to home screen
4. No need to re-enter credentials

### 3. **Session Expiry**
1. User opens app after 7+ days
2. Session expired → Sign In screen
3. User logs in again → New session created

### 4. **App Restart**
1. User closes app completely
2. User reopens app
3. Session automatically restored
4. User continues where they left off

## Benefits for App Users

### 1. **Seamless Experience**
- No need to log in every time
- Users can quickly access their matches
- Reduces friction in user journey

### 2. **Persistent State**
- User preferences maintained
- Chat history preserved
- Profile data cached locally

### 3. **Security**
- Sessions expire after inactivity
- Encrypted storage for sensitive data
- Automatic cleanup of old sessions

### 4. **Reliability**
- Dual storage prevents data loss
- Graceful fallback mechanisms
- Backward compatibility maintained

## Configuration Options

### Session Timeout
```dart
// In SessionManager
static const Duration _sessionTimeout = Duration(days: 7);
```

### Refresh Interval
```dart
// In MainTabScreen
Future.delayed(const Duration(hours: 6), () async {
  await AuthService.refreshSessionIfNeeded();
});
```

### Maximum Session Age
```dart
// In SessionManager._isSessionValid
final maxAge = Duration(days: 30);
```

## Testing Session Persistence

### Manual Testing
1. Log in to the app
2. Close the app completely (force stop)
3. Reopen the app
4. Verify you're still logged in

### Debug Information
```dart
// Get session statistics
final stats = await AuthService.getSessionStats();
print('Session stats: $stats');
```

### Expected Output
```json
{
  "has_session": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "last_activity": "2024-01-01T12:00:00.000Z",
  "expires_at": "2024-01-08T00:00:00.000Z",
  "session_age_hours": 12,
  "last_activity_hours": 0,
  "expires_in_hours": 156,
  "is_expired": false
}
```

## Troubleshooting

### Common Issues

1. **Session not persisting**
   - Check if `flutter_secure_storage` is properly installed
   - Verify app permissions on Android/iOS
   - Check debug logs for storage errors

2. **Session expires too quickly**
   - Adjust `_sessionTimeout` duration
   - Check if refresh mechanism is working
   - Verify backend token validation

3. **App crashes on startup**
   - Check for null session data
   - Verify JSON parsing of stored data
   - Add error handling in initialization

### Debug Commands
```dart
// Check if user is authenticated
final isAuth = await AuthService.isAuthenticated();
print('Is authenticated: $isAuth');

// Get current user
final user = await AuthService.getCurrentUser();
print('Current user: $user');

// Get session stats
final stats = await AuthService.getSessionStats();
print('Session stats: $stats');
```

## Migration from Current System

The new system is designed to be backward compatible:

1. **Existing tokens** are automatically migrated
2. **Old storage** is preserved as fallback
3. **Gradual transition** to new system
4. **No user disruption** during migration

## Conclusion

This session persistence system ensures that users remain logged in through app restarts, providing a seamless experience that's crucial for app engagement. The dual storage strategy, automatic validation, and periodic refresh mechanisms work together to maintain user sessions while ensuring security and reliability. 