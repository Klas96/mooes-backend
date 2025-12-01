# Error Handling Guide for Mooves App

This guide explains how to handle errors in the Flutter app with the improved error handling system from the backend.

## Overview

The backend now returns structured error responses with:
- `error` or `message`: Human-readable error message
- `code`: Machine-readable error code for programmatic handling
- `details`: Additional error details (for validation errors)

## Error Response Format

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    }
  ]
}
```

## Error Codes and Messages

### Authentication Errors

| Code | Message | Action |
|------|---------|--------|
| `MISSING_CREDENTIALS` | Please provide both email and password. | Show validation error |
| `INVALID_CREDENTIALS` | Invalid email or password. Please check your credentials and try again. | Show login error |
| `EMAIL_ALREADY_EXISTS` | An account with this email already exists. Please try logging in instead. | Redirect to login |
| `USER_NOT_FOUND` | No account found with this email address. Please check your email or register a new account. | Show registration prompt |
| `EMAIL_ALREADY_VERIFIED` | This email is already verified. You can log in to your account. | Redirect to login |

### Email Verification Errors

| Code | Message | Action |
|------|---------|--------|
| `INVALID_TOKEN` | Invalid or expired verification token. Please request a new verification email. | Show resend option |
| `EXPIRED_TOKEN` | Verification token has expired. Please request a new verification email. | Show resend option |
| `MISSING_TOKEN` | Verification token is required. | Show validation error |
| `EMAIL_VERIFICATION_FAILED` | Email verification failed. Please check your email and try again. | Show retry option |

### Validation Errors

| Code | Message | Action |
|------|---------|--------|
| `VALIDATION_ERROR` | Please check your input and try again. | Show field-specific errors |
| `MISSING_EMAIL` | Email address is required. | Show validation error |

### System Errors

| Code | Message | Action |
|------|---------|--------|
| `DATABASE_CONNECTION_ERROR` | Database connection failed. Please try again in a few moments. | Show retry button |
| `RATE_LIMIT_EXCEEDED` | Too many requests. Please wait a moment and try again. | Show retry with delay |
| `INTERNAL_SERVER_ERROR` | An unexpected error occurred. Please try again. | Show generic error |
| `NETWORK_ERROR` | Network error. Please check your internet connection and try again. | Show network error |

### Supertokens-specific Errors

| Code | Message | Action |
|------|---------|--------|
| `SIGNUP_FAILED` | Registration failed. Please try again. | Show retry option |
| `SIGNIN_FAILED` | Login failed. Please check your credentials and try again. | Show login error |
| `SIGNUP_DISABLED` | Registration is currently disabled. Please try again later. | Show maintenance message |
| `SIGNIN_DISABLED` | Login is currently disabled. Please try again later. | Show maintenance message |

## Using the AuthService

The `AuthService` class now provides improved error handling:

```dart
// Login example
final result = await AuthService.login(
  email: email,
  password: password,
);

if (result['success']) {
  // Handle successful login
  Navigator.pushReplacementNamed(context, '/home');
} else {
  // Handle error
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(result['message']),
      backgroundColor: Colors.red,
    ),
  );
}
```

## Error Handling in UI

### 1. Show User-Friendly Messages

```dart
void _handleError(Map<String, dynamic> result) {
  if (!result['success']) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result['message']),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 4),
        action: SnackBarAction(
          label: 'Dismiss',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }
}
```

### 2. Handle Specific Error Codes

```dart
void _handleSpecificError(Map<String, dynamic> result) {
  if (!result['success']) {
    final errorCode = result['code'];
    
    switch (errorCode) {
      case 'EMAIL_ALREADY_EXISTS':
        // Show dialog to redirect to login
        _showLoginRedirectDialog();
        break;
      case 'INVALID_CREDENTIALS':
        // Clear password field and show error
        _passwordController.clear();
        _showErrorSnackBar(result['message']);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Show retry with delay
        _showRetryWithDelay();
        break;
      case 'DATABASE_CONNECTION_ERROR':
        // Show retry button
        _showRetryButton();
        break;
      default:
        // Show generic error
        _showErrorSnackBar(result['message']);
    }
  }
}
```

### 3. Handle Validation Errors

```dart
void _handleValidationError(Map<String, dynamic> result) {
  if (result['code'] == 'VALIDATION_ERROR' && result['details'] != null) {
    final details = result['details'] as List;
    
    for (var detail in details) {
      final field = detail['field'];
      final message = detail['message'];
      
      switch (field) {
        case 'email':
          _emailErrorText = message;
          break;
        case 'password':
          _passwordErrorText = message;
          break;
        case 'firstName':
          _firstNameErrorText = message;
          break;
        case 'lastName':
          _lastNameErrorText = message;
          break;
      }
    }
    
    setState(() {}); // Rebuild UI to show validation errors
  }
}
```

## Best Practices

### 1. Always Check Success Status

```dart
final result = await AuthService.login(email: email, password: password);

// Always check success first
if (result['success']) {
  // Handle success
} else {
  // Handle error
}
```

### 2. Use Error Codes for Programmatic Logic

```dart
if (result['code'] == 'EMAIL_ALREADY_EXISTS') {
  // Redirect to login page
  Navigator.pushReplacementNamed(context, '/login');
} else if (result['code'] == 'INVALID_CREDENTIALS') {
  // Clear password field
  _passwordController.clear();
}
```

### 3. Show Appropriate UI Feedback

```dart
// For network errors
if (result['code'] == 'NETWORK_ERROR') {
  _showNetworkErrorDialog();
}

// For rate limiting
if (result['code'] == 'RATE_LIMIT_EXCEEDED') {
  _showRateLimitDialog();
}

// For system errors
if (result['code'] == 'INTERNAL_SERVER_ERROR') {
  _showSystemErrorDialog();
}
```

### 4. Provide Retry Options

```dart
void _showRetryButton() {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Connection Error'),
      content: Text('Unable to connect to the server. Please try again.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            _retryAction(); // Retry the failed action
          },
          child: Text('Retry'),
        ),
      ],
    ),
  );
}
```

## Testing Error Scenarios

### 1. Network Errors
- Turn off internet connection
- Test with invalid server URL
- Test with slow network

### 2. Authentication Errors
- Test with invalid credentials
- Test with non-existent email
- Test with unverified email

### 3. Validation Errors
- Test with invalid email format
- Test with short password
- Test with empty required fields

### 4. System Errors
- Test rate limiting
- Test database connection errors
- Test server errors

## Error Logging

For debugging purposes, log errors with context:

```dart
void _logError(String action, Map<String, dynamic> result) {
  print('Error in $action:');
  print('  Code: ${result['code']}');
  print('  Message: ${result['message']}');
  print('  Details: ${result['details']}');
}
```

## Conclusion

This improved error handling system provides:
- Clear, user-friendly error messages
- Consistent error response format
- Programmatic error handling capabilities
- Better user experience with appropriate UI feedback

Always test error scenarios thoroughly to ensure users receive helpful feedback when things go wrong. 