# Dual Distribution Guide: Google Play Store + F-Droid

This guide explains how to distribute Mooves on both Google Play Store and F-Droid while maintaining monetization capabilities on both platforms.

## Overview

Mooves is designed to work seamlessly on both distribution platforms:

- **Google Play Store**: Uses Google Play Billing for in-app purchases
- **F-Droid**: Uses Stripe and Bitcoin for payments

## Architecture

### Platform Detection
The app automatically detects its distribution platform and uses the appropriate payment system:

```dart
// Automatic platform detection
await DistributionService.initialize();

if (DistributionService.isPlayStore) {
  // Use Google Play Billing
  await BillingService.initialize();
} else {
  // Use F-Droid compatible payments
  await PaymentService.initialize();
}
```

### Unified Payment Service
The `UnifiedPaymentService` handles both platforms transparently:

```dart
// Works on both platforms
final result = await UnifiedPaymentService.purchaseSubscription(
  SubscriptionTier.premium
);
```

## Distribution Setup

### 1. Google Play Store

#### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- App signing key
- Privacy policy and terms of service

#### Setup Steps
1. **Create Google Play Console Account**
   ```bash
   # Visit: https://play.google.com/console
   ```

2. **Configure App Signing**
   ```bash
   # Generate upload key
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

3. **Set up In-App Products**
   - Product ID: `mooves_monthly_premium`
   - Product ID: `mooves_yearly_premium`
   - Product ID: `mooves_boost_pack`
   - Product ID: `mooves_super_like_pack`

4. **Build and Upload**
   ```bash
   cd dating_app/scripts
   ./build-and-deploy.sh --platform android --upload gcs
   ```

### 2. F-Droid

#### Prerequisites
- Open source code (already met)
- F-Droid compatible dependencies
- F-Droid metadata file

#### Setup Steps
1. **Prepare F-Droid Metadata**
   ```bash
   # Update fdroid-metadata.yml with your repository details
   # Update version numbers and changelog
   ```

2. **Build F-Droid Version**
   ```bash
   cd dating_app/scripts
   ./build-fdroid.sh
   ```

3. **Submit to F-Droid**
   - Fork F-Droid data repository
   - Add your app metadata
   - Submit pull request

## Payment Systems

### Google Play Store
- **Primary**: Google Play Billing
- **Fallback**: Stripe
- **Features**: In-app purchases, subscriptions

### F-Droid
- **Primary**: Stripe, Bitcoin
- **Features**: Web-based payments, cryptocurrency

## Build Scripts

### Play Store Build
```bash
# Build for Google Play Store
./build-and-deploy.sh --platform android --upload gcs
```

### F-Droid Build
```bash
# Build for F-Droid
./build-fdroid.sh
```

### Universal Build
```bash
# Build for both platforms
./build-and-deploy.sh --platform all --upload both
```

## Configuration Files

### Google Play Store
- `android/app/build.gradle` - App configuration
- `android/app/src/main/AndroidManifest.xml` - Permissions
- `lib/services/billing_service.dart` - Billing implementation

### F-Droid
- `fdroid-metadata.yml` - F-Droid metadata
- `lib/services/payment_service.dart` - F-Droid payments
- `lib/services/distribution_service.dart` - Platform detection

## Testing

### Play Store Testing
```bash
# Test Google Play Billing
flutter test test/services/billing_service_test.dart

# Test on device with Google Play Services
flutter run --release
```

### F-Droid Testing
```bash
# Test F-Droid payments
flutter test test/services/payment_service_test.dart

# Test on device without Google Play Services
flutter run --release
```

## Monetization Strategy

### Google Play Store
- **Revenue Model**: 70/30 split with Google
- **Payment Methods**: Google Play Billing
- **Features**: In-app purchases, subscriptions

### F-Droid
- **Revenue Model**: Direct payments (no platform fee)
- **Payment Methods**: Stripe, Bitcoin
- **Features**: Web-based payments, cryptocurrency

## Compliance

### Google Play Store
- Follow Google Play policies
- Implement proper billing verification
- Handle subscription management

### F-Droid
- Ensure all dependencies are F-Droid compatible
- No proprietary dependencies
- Open source license compliance

## Deployment Checklist

### Before Release

#### Google Play Store
- [ ] App signing configured
- [ ] In-app products created
- [ ] Privacy policy uploaded
- [ ] Content rating completed
- [ ] Store listing prepared
- [ ] Billing tested

#### F-Droid
- [ ] F-Droid metadata updated
- [ ] All dependencies verified
- [ ] Build script tested
- [ ] Payment system tested
- [ ] Documentation updated

### Release Process

#### Google Play Store
1. Build signed APK/AAB
2. Upload to Google Play Console
3. Submit for review
4. Publish when approved

#### F-Droid
1. Build F-Droid version
2. Update metadata
3. Submit to F-Droid repository
4. Wait for inclusion

## Maintenance

### Version Updates
- Update version numbers in both platforms
- Test payment systems
- Update changelog
- Build and deploy

### Payment Monitoring
- Monitor payment success rates
- Track revenue by platform
- Handle payment disputes
- Update payment methods

## Troubleshooting

### Common Issues

#### Google Play Billing Not Working
```bash
# Check Google Play Services
flutter doctor

# Verify billing configuration
flutter test test/services/billing_service_test.dart
```

#### F-Droid Build Fails
```bash
# Check dependencies
flutter pub deps

# Verify F-Droid compatibility
flutter analyze
```

#### Payment Issues
```bash
# Test payment service
flutter test test/services/payment_service_test.dart

# Check network connectivity
flutter run --verbose
```

## Support

### Documentation
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [F-Droid Documentation](https://f-droid.org/docs/)
- [Flutter In-App Purchase](https://pub.dev/packages/in_app_purchase)

### Community
- [F-Droid Forum](https://forum.f-droid.org/)
- [Google Play Developer Community](https://support.google.com/googleplay/android-developer)

## Conclusion

This dual-distribution approach allows Mooves to reach both mainstream Android users (Google Play Store) and privacy-conscious users (F-Droid) while maintaining monetization capabilities on both platforms.

The unified payment system ensures a consistent user experience regardless of the distribution platform, while the platform-specific optimizations ensure compliance with each store's requirements. 