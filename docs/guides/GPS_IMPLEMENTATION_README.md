# GPS Location Implementation for Mooves App

## Overview
This implementation adds GPS location functionality to the Mooves app, allowing users to get their current location using their device's GPS and update their profile with precise coordinates.

## Features Implemented

### 1. GPS Location Service (`dating_app/lib/services/location_service.dart`)
- **Location Permission Management**: Handles requesting and checking location permissions
- **GPS Position Retrieval**: Gets current GPS coordinates with high accuracy
- **Location String Formatting**: Converts coordinates to readable format
- **Distance Calculation**: Calculates distance between two GPS coordinates
- **Error Handling**: Comprehensive error handling for various GPS scenarios

### 2. Enhanced Profile Service (`dating_app/lib/services/profile_service.dart`)
- **GPS Coordinate Support**: Added latitude and longitude parameters to profile updates
- **Location Update Method**: `updateLocationWithGPS()` method to update profile with current GPS location
- **Backward Compatibility**: Maintains existing location string field while adding GPS coordinates

### 3. GPS Location Picker Widget (`dating_app/lib/widgets/gps_location_picker.dart`)
- **User-Friendly Interface**: Clean, intuitive UI for getting GPS location
- **Real-time Status**: Shows loading states and error messages
- **Permission Handling**: Guides users through location permission requests
- **Profile Integration**: Automatically updates user profile with GPS coordinates

### 4. Backend Database Schema Updates (`nodejs-backend/models/UserProfile.js`)
- **GPS Coordinate Fields**: Added `latitude` and `longitude` columns to UserProfile model
- **Data Validation**: Proper validation for coordinate ranges (latitude: -90 to 90, longitude: -180 to 180)
- **Database Indexing**: Added index for efficient location-based queries
- **Backward Compatibility**: Existing location string field remains unchanged

### 5. Backend API Updates (`nodejs-backend/controllers/profileController.js`)
- **GPS Coordinate Handling**: Updated profile controller to accept and store GPS coordinates
- **Data Parsing**: Converts string coordinates to decimal values
- **Error Handling**: Proper validation and error responses for GPS data

### 6. Platform Permissions
- **Android**: Added `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` permissions
- **iOS**: Added location usage descriptions for when-in-use and always usage
- **Web**: Added geolocation permission policy

## Installation and Setup

### 1. Flutter Dependencies
The following dependencies were added to `pubspec.yaml`:
```yaml
geolocator: ^10.1.0
permission_handler: ^11.0.1
```

### 2. Database Migration
Run the database migration script to add GPS columns:
```bash
cd nodejs-backend
node nodejs-backend/scripts/add-gps-columns.js
```

### 3. Platform Configuration
- **Android**: Permissions automatically added to `AndroidManifest.xml`
- **iOS**: Location usage descriptions added to `Info.plist`
- **Web**: Geolocation permissions added to `index.html`

## Usage

### For Users
1. Navigate to the Profile tab in the app
2. Scroll down to the "GPS Location" section
3. Tap "Get Current Location"
4. Grant location permissions when prompted
5. Your location will be automatically updated in your profile

### For Developers

#### Getting Current Location
```dart
import 'package:mooves/services/location_service.dart';

// Get GPS coordinates
final coordinates = await LocationService.getLocationCoordinates();
if (coordinates != null) {
  print('Latitude: ${coordinates['latitude']}');
  print('Longitude: ${coordinates['longitude']}');
}

// Get formatted location string
final locationString = await LocationService.getLocationString();
```

#### Updating Profile with GPS
```dart
import 'package:mooves/services/profile_service.dart';

// Update profile with current GPS location
await ProfileService.updateLocationWithGPS();
```

#### Using the GPS Location Picker Widget
```dart
import 'package:mooves/widgets/gps_location_picker.dart';

GpsLocationPicker(
  currentLocation: userProfile.location,
  onLocationUpdated: (String location) {
    // Handle location update
    print('Location updated: $location');
  },
)
```

## Error Handling

The implementation includes comprehensive error handling for:
- **Location Services Disabled**: Guides users to enable location services
- **Permission Denied**: Handles both temporary and permanent permission denials
- **GPS Signal Issues**: Handles poor GPS signal or timeout scenarios
- **Network Errors**: Handles API communication issues
- **Database Errors**: Handles backend storage issues

## Security and Privacy

- **Permission-Based Access**: Only requests location when user explicitly chooses to
- **Data Validation**: Validates GPS coordinates before storage
- **User Control**: Users can choose when to update their location
- **Secure Storage**: GPS coordinates stored securely in the database

## Future Enhancements

### 1. Reverse Geocoding
- Integrate with a geocoding service to convert coordinates to city/country names
- Provide more user-friendly location display

### 2. Location-Based Matching
- Implement distance-based matching algorithms
- Add location filtering options

### 3. Location History
- Store location history for better matching
- Implement location change tracking

### 4. Privacy Controls
- Add options to hide exact location
- Implement location fuzzing for privacy

## Testing

### Manual Testing
1. Test on physical devices (GPS doesn't work in simulators)
2. Test permission flows (deny, grant, revoke)
3. Test with location services disabled
4. Test with poor GPS signal

### Automated Testing
```dart
// Test location service
test('should get current location', () async {
  final coordinates = await LocationService.getLocationCoordinates();
  expect(coordinates, isNotNull);
  expect(coordinates!['latitude'], isA<double>());
  expect(coordinates!['longitude'], isA<double>());
});
```

## Troubleshooting

### Common Issues

1. **"Location services are disabled"**
   - Guide user to enable location services in device settings

2. **"Location permission denied"**
   - Guide user to grant location permission in app settings

3. **"Unable to get current location"**
   - Check if device has GPS capability
   - Verify location services are enabled
   - Check for poor GPS signal

4. **Database connection errors**
   - Verify database is running
   - Check environment variables
   - Run database migration script

## API Endpoints

### Updated Profile Endpoint
```
PUT /api/profiles/me
```

**Request Body:**
```json
{
  "bio": "User bio",
  "location": "City, Country",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "locationMode": "local"
}
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "location": "New York, NY",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "locationMode": "local"
}
```

## Database Schema

### UserProfile Table
```sql
ALTER TABLE "UserProfiles" 
ADD COLUMN "latitude" DECIMAL(10,8),
ADD COLUMN "longitude" DECIMAL(11,8);

CREATE INDEX "user_profiles_location_idx" 
ON "UserProfiles" ("latitude", "longitude");
```

## Performance Considerations

- **GPS Timeout**: 15-second timeout for GPS requests
- **Database Indexing**: Indexed coordinates for efficient queries
- **Caching**: Consider caching location data to reduce API calls
- **Battery Optimization**: GPS requests are made on-demand only

## Compliance

- **GDPR**: Location data is only collected with explicit user consent
- **CCPA**: Users can request deletion of location data
- **Platform Guidelines**: Follows iOS and Android location usage guidelines 