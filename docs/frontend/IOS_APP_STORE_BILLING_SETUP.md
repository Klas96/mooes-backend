# iOS App Store Billing Setup Guide

This guide will help you set up Apple's In-App Purchase system for your Mooves app on iOS.

## Prerequisites

1. Apple Developer Account ($99/year)
2. App Store Connect access
3. Published app on App Store
4. App Store Server API access
5. App-specific shared secret

## Step 1: App Store Connect Setup

### 1.1 Create In-App Products

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Navigate to **Features** > **In-App Purchases**
4. Click the **+** button to create new products

#### Monthly Premium Subscription
- **Product ID**: `mooves_monthly_premium_ios`
- **Type**: Auto-Renewable Subscription
- **Name**: Monthly Premium
- **Description**: Unlimited likes, advanced filters, read receipts, and more
- **Price**: $9.99 USD
- **Subscription Group**: Create a new group called "Premium Subscriptions"
- **Subscription Duration**: 1 Month
- **Status**: Ready to Submit

#### Yearly Premium Subscription
- **Product ID**: `mooves_yearly_premium_ios`
- **Type**: Auto-Renewable Subscription
- **Name**: Yearly Premium
- **Description**: All monthly features plus priority support and exclusive events
- **Price**: $99.99 USD
- **Subscription Group**: Same as monthly (Premium Subscriptions)
- **Subscription Duration**: 1 Year
- **Status**: Ready to Submit

### 1.2 Configure Subscription Groups

1. Go to **Features** > **Subscription Groups**
2. Create a group called "Premium Subscriptions"
3. Add both monthly and yearly subscriptions to this group
4. Configure subscription group settings:
   - **Subscription Group Display Name**: Premium Subscriptions
   - **Subscription Group Localization**: Add localized names
   - **Subscription Group Sort Order**: Set display order

### 1.3 Set Up App Store Server API

1. Go to **Users and Access** > **Keys**
2. Click **Generate API Key**
3. Download the `.p8` file (keep it secure)
4. Note the Key ID and Issuer ID
5. Enable App Store Server API access

## Step 2: iOS App Configuration

### 2.1 Update iOS Project Settings

1. Open your iOS project in Xcode
2. Go to **Signing & Capabilities**
3. Add **In-App Purchase** capability
4. Ensure your Bundle ID matches App Store Connect

### 2.2 Update Info.plist

Add the following to your `ios/Runner/Info.plist`:

```xml
<key>SKAdNetworkItems</key>
<array>
    <dict>
        <key>SKAdNetworkIdentifier</key>
        <string>your.skadnetwork.identifier</string>
    </dict>
</array>
```

### 2.3 Configure StoreKit (Optional for Testing)

For testing, you can create a `StoreKit Configuration File`:

1. In Xcode, go to **File** > **New** > **File**
2. Select **StoreKit Configuration File**
3. Add your products with the same IDs as App Store Connect
4. Set up test scenarios

## Step 3: Backend Configuration

### 3.1 Environment Variables

Add the following to your `.env` file:

```env
# iOS App Store Billing
APP_STORE_SHARED_SECRET=your_app_specific_shared_secret
APP_STORE_BUNDLE_ID=com.example.dating_app
APP_STORE_KEY_ID=your_key_id
APP_STORE_ISSUER_ID=your_issuer_id
APP_STORE_PRIVATE_KEY_PATH=path/to/your/private_key.p8
```

### 3.2 Install Dependencies

```bash
cd nodejs-backend
npm install node-app-store-server-api
```

### 3.3 Update Billing Service

The billing service is already configured to handle iOS. You'll need to:

1. Replace the `verifyAppStorePurchase` function with actual App Store Server API calls
2. Add proper error handling for different purchase states
3. Implement subscription status checking

## Step 4: Testing

### 4.1 Sandbox Testing

1. Create test accounts in App Store Connect
2. Use these accounts to test purchases
3. Test both successful and failed purchase scenarios
4. Test subscription renewal and cancellation

### 4.2 TestFlight Testing

1. Upload a build to TestFlight
2. Test with internal testers
3. Verify purchase flows work correctly
4. Test subscription management

### 4.3 Testing Checklist

- [ ] App can query available products
- [ ] Purchase flow works correctly
- [ ] Purchase verification works
- [ ] Subscription status is updated
- [ ] Premium features are unlocked
- [ ] Purchase restoration works
- [ ] Error handling works
- [ ] Subscription renewal works
- [ ] Subscription cancellation works

## Step 5: Production Deployment

### 5.1 App Store Review

1. Submit your app for review
2. Ensure all in-app purchases are approved
3. Test with real App Store accounts
4. Monitor for any issues

### 5.2 Monitoring

1. Set up App Store Connect alerts
2. Monitor purchase success rates
3. Track subscription retention
4. Monitor for fraudulent purchases

## Step 6: Legal Requirements

### 6.1 App Store Guidelines

Ensure your app complies with:
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [In-App Purchase Guidelines](https://developer.apple.com/in-app-purchase/)
- [Subscription Guidelines](https://developer.apple.com/app-store/subscriptions/)

### 6.2 Required Disclosures

Your app must include:
- Subscription terms and conditions
- Auto-renewal information
- Cancellation instructions
- Privacy policy
- Terms of service

## Step 7: Advanced Features

### 7.1 Family Sharing

Consider implementing Family Sharing for subscriptions:
- Set up family sharing in App Store Connect
- Configure subscription sharing rules
- Test family sharing functionality

### 7.2 Promotional Offers

Set up promotional offers:
- Free trial periods
- Introductory pricing
- Promotional codes
- Subscription offers

### 7.3 Subscription Management

Implement subscription management:
- Allow users to manage subscriptions in-app
- Provide upgrade/downgrade options
- Handle subscription status changes
- Implement grace period handling

## Troubleshooting

### Common Issues

1. **Products not found**: Check product IDs match exactly
2. **Purchase verification fails**: Check shared secret and API credentials
3. **App crashes on purchase**: Check StoreKit configuration
4. **Subscription not updating**: Check App Store Server API integration

### Debug Tips

1. Use App Store Connect's testing tools
2. Check server logs for verification errors
3. Test with different Apple IDs
4. Verify network connectivity
5. Use Xcode's StoreKit testing framework

## Support Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [In-App Purchase Programming Guide](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/StoreKitGuide/Introduction/Introduction.html)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

## Next Steps

1. Set up analytics to track conversion rates
2. Implement A/B testing for pricing
3. Add promotional offers and discounts
4. Consider implementing family sharing
5. Add subscription management in app settings
6. Set up revenue tracking and reporting

## Security Best Practices

1. Always verify purchases server-side
2. Use HTTPS for all API calls
3. Implement proper error handling
4. Log all purchase attempts
5. Use App Store Server API for verification
6. Keep shared secrets secure
7. Implement rate limiting
8. Monitor for suspicious activity

## Revenue Optimization

1. **Pricing Strategy**: Test different price points
2. **Subscription Tiers**: Offer multiple subscription levels
3. **Promotional Offers**: Use introductory pricing
4. **Retention**: Implement features to reduce churn
5. **Analytics**: Track key metrics like LTV and churn rate
6. **A/B Testing**: Test different subscription flows

## Conclusion

The iOS App Store billing implementation provides a robust foundation for monetizing your app on iOS. The system follows Apple's best practices and includes comprehensive testing capabilities. Once the App Store Connect setup is complete, your app will be ready for production deployment with full billing functionality.

Remember to test thoroughly in the sandbox environment before going live, and monitor your app's performance closely after launch. 