# Google Play Billing Setup Guide

This guide will help you set up Google Play billing for your Mooves app.

## Prerequisites

1. Google Play Console account
2. Published app on Google Play Store
3. Google Play Developer API access
4. Service account credentials

## Step 1: Google Play Console Setup

### 1.1 Create In-App Products

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Navigate to **Monetization** > **Products** > **In-app products**
4. Create the following products:

#### Monthly Premium Subscription
- **Product ID**: `mooves_monthly_premium`
- **Name**: Monthly Premium
- **Description**: Unlimited likes, advanced filters, read receipts, and more
- **Price**: $9.99 USD
- **Subscription period**: 1 month
- **Status**: Active

#### Yearly Premium Subscription
- **Product ID**: `mooves_yearly_premium`
- **Name**: Yearly Premium
- **Description**: All monthly features plus priority support and exclusive events
- **Price**: $99.99 USD
- **Subscription period**: 1 year
- **Status**: Active

### 1.2 Set Up Subscription Groups

1. Go to **Monetization** > **Products** > **Subscriptions**
2. Create a subscription group called "Premium Subscriptions"
3. Add the monthly and yearly subscriptions to this group
4. Configure grace period and retention settings

## Step 2: Google Play Developer API Setup

### 2.1 Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Play Developer API**
4. Go to **IAM & Admin** > **Service Accounts**
5. Create a new service account
6. Download the JSON key file

### 2.2 Grant API Access

1. In Google Play Console, go to **Setup** > **API access**
2. Link your Google Cloud project
3. Grant the service account access to your app
4. Add the service account email to the **Users and permissions** section

## Step 3: Backend Configuration

### 3.1 Environment Variables

Add the following to your `.env` file:

```env
# Google Play Billing
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PLAY_PACKAGE_NAME=com.example.dating_app
```

### 3.2 Update Billing Service

The billing service is already configured in `nodejs-backend/routes/billing.js`. You'll need to:

1. Replace the `verifyGooglePlayPurchase` function with actual Google Play API calls
2. Add proper error handling for different purchase states
3. Implement subscription status checking

### 3.3 Install Dependencies

```bash
cd nodejs-backend
npm install googleapis
```

## Step 4: Flutter App Configuration

### 4.1 Update Android Manifest

Add billing permission to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

### 4.2 Update Build Configuration

Ensure your `android/app/build.gradle` has the correct application ID:

```gradle
defaultConfig {
    applicationId "com.example.dating_app"  // Must match Google Play Console
    // ... other config
}
```

### 4.3 Test Configuration

1. Use test accounts in Google Play Console
2. Upload a test APK to internal testing
3. Test purchases with test accounts

## Step 5: Testing

### 5.1 Test Accounts

1. Add test accounts in Google Play Console
2. Use these accounts to test purchases
3. Test both successful and failed purchase scenarios

### 5.2 Test Products

Create test products with different prices:
- Test Monthly: $0.01
- Test Yearly: $0.01
- Test Lifetime: $0.01

### 5.3 Testing Checklist

- [ ] App can query available products
- [ ] Purchase flow works correctly
- [ ] Purchase verification works
- [ ] Subscription status is updated
- [ ] Premium features are unlocked
- [ ] Purchase restoration works
- [ ] Error handling works

## Step 6: Production Deployment

### 6.1 Update Product IDs

Before going live, update the product IDs in:
- `dating_app/lib/services/billing_service.dart`
- `nodejs-backend/routes/billing.js`

### 6.2 Security

1. Always verify purchases server-side
2. Use HTTPS for all API calls
3. Implement proper error handling
4. Log all purchase attempts

### 6.3 Monitoring

1. Set up Google Play Console alerts
2. Monitor purchase success rates
3. Track subscription retention
4. Monitor for fraudulent purchases

## Step 7: Legal Requirements

### 7.1 Terms of Service

Update your app's terms of service to include:
- Subscription terms
- Cancellation policy
- Refund policy
- Auto-renewal terms

### 7.2 Privacy Policy

Update privacy policy to include:
- Payment information handling
- Purchase data collection
- Third-party payment processors

## Step 8: User Experience

### 8.1 Premium Features

The app includes these premium features:
- Unlimited likes (10 free per day)
- Advanced filters
- Read receipts
- See who likes you
- Priority matching
- Premium support

### 8.2 Upgrade Prompts

Use the `PremiumUpgradeWidget` throughout the app:
- When user runs out of likes
- When trying to access premium features
- In profile settings
- After successful matches

## Troubleshooting

### Common Issues

1. **Products not found**: Check product IDs match exactly
2. **Purchase verification fails**: Check service account permissions
3. **App crashes on purchase**: Check billing permission in manifest
4. **Subscription not updating**: Check server-side verification

### Debug Tips

1. Use Google Play Console's testing tools
2. Check server logs for verification errors
3. Test with different Google accounts
4. Verify network connectivity

## Support

For additional help:
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Flutter In-App Purchase Plugin](https://pub.dev/packages/in_app_purchase)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)

## Next Steps

1. Set up analytics to track conversion rates
2. Implement A/B testing for pricing
3. Add promotional offers and discounts
4. Consider implementing family sharing
5. Add subscription management in app settings 