# Email Verification Setup Guide

This guide explains how to set up email verification for the Mooves app.

## Overview

Email verification ensures that users provide valid email addresses during registration and helps prevent fake accounts. The system sends verification emails with unique tokens that users must click or enter to verify their accounts.

## Backend Setup

### 1. Database Migration

Run the migration script to add email verification columns to the User table:

```bash
cd nodejs-backend
node ../nodejs-backend/scripts/add-email-verification-columns.js
```

This script will:
- Add `emailVerified` (boolean) column
- Add `emailVerificationToken` (string) column  
- Add `emailVerificationExpiry` (timestamp) column
- Mark existing users as verified (grandfather clause)

### 2. Install Dependencies

Install nodemailer for sending emails:

```bash
cd nodejs-backend
npm install nodemailer
```

### 3. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_USER=mooves@klasholmgren.se
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=https://your-app.com

# Optional: Use different email service
EMAIL_SERVICE=gmail  # or 'outlook', 'yahoo', etc.
```

### 4. Gmail App Password Setup

If using Gmail, you'll need to create an App Password:

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled
4. Go to App passwords
5. Generate a new app password for "Mail"
6. Use this password in your `EMAIL_PASSWORD` environment variable

### 5. Alternative Email Services

You can configure other email services by modifying the `emailService.js` file:

#### Outlook/Hotmail:
```javascript
this.transporter = nodemailer.createTransporter({
  service: 'outlook',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

#### Custom SMTP:
```javascript
this.transporter = nodemailer.createTransporter({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

## Frontend Setup

### 1. Update Auth Service

The auth service has been updated to handle:
- Registration without immediate login
- Email verification
- Resending verification emails

### 2. Email Verification Screen

A new `EmailVerificationScreen` has been created that:
- Shows instructions to check email
- Allows manual token entry
- Provides resend functionality
- Handles verification success/failure

### 3. Navigation Flow

The registration flow now works as follows:
1. User fills out registration form
2. Account is created but not verified
3. Verification email is sent
4. User is redirected to email verification screen
5. User verifies email (via link or manual token)
6. User is logged in and redirected to main app

## API Endpoints

### Registration
- **POST** `/api/auth/register`
- Creates user account with `emailVerified: false`
- Sends verification email
- Returns success message (no token)

### Email Verification
- **POST** `/api/auth/verify-email`
- Body: `{ "token": "verification_token" }`
- Verifies email and returns user data with token

### Resend Verification
- **POST** `/api/auth/resend-verification`
- Body: `{ "email": "user@example.com" }`
- Sends new verification email

### Login (Updated)
- **POST** `/api/auth/login`
- Now checks `emailVerified` status
- Returns error if email not verified

## Email Templates

The verification email includes:
- Welcome message with user's first name
- Verification button/link
- Manual token entry option
- Expiration notice (24 hours)
- App branding and styling

## Security Features

### Token Security
- 32-byte random hex tokens
- 24-hour expiration
- Single-use tokens
- Secure token generation using crypto.randomBytes()

### Rate Limiting
Consider adding rate limiting to prevent abuse:
- Limit verification attempts per email
- Limit resend requests per email
- Implement cooldown periods

### Email Validation
- Server-side email format validation
- Domain validation (optional)
- Disposable email blocking (optional)

## Testing

### Test Email Verification

1. Register a new account
2. Check email for verification link
3. Click link or enter token manually
4. Verify successful login

### Test Resend Functionality

1. Register account but don't verify
2. Use "Resend Verification Email" button
3. Verify new email is received
4. Test with expired token

### Test Error Cases

1. Invalid verification token
2. Expired verification token
3. Login with unverified email
4. Resend to non-existent email

## Troubleshooting

### Common Issues

**Emails not sending:**
- Check email credentials
- Verify app password setup
- Check firewall/network settings
- Review email service logs

**Verification not working:**
- Check token expiration
- Verify database columns exist
- Check API endpoint responses
- Review server logs

**Frontend navigation issues:**
- Verify route names
- Check screen imports
- Test navigation flow
- Review error handling

### Debug Mode

Enable debug logging in the email service:

```javascript
// In emailService.js
console.log('Sending email to:', email);
console.log('Verification URL:', verificationUrl);
```

## Production Considerations

### Email Delivery
- Use reliable email service (SendGrid, Mailgun, etc.)
- Set up SPF/DKIM records
- Monitor delivery rates
- Implement email queue for reliability

### Performance
- Use email queuing for high volume
- Implement caching for verification status
- Optimize database queries
- Monitor response times

### Monitoring
- Track verification success rates
- Monitor email delivery failures
- Log verification attempts
- Set up alerts for issues

## Future Enhancements

### Additional Features
- Password reset via email
- Email change verification
- Two-factor authentication
- Account recovery options

### UI Improvements
- Email verification status in profile
- Verification reminder notifications
- Better error messages
- Accessibility improvements

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Test with different email providers
4. Verify environment configuration 