# App Setup Instructions

This guide will help you set up the Flutter app with the Node.js backend to work like the React Native version with real profiles, images, and matching functionality.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Flutter SDK
- Android Studio / Xcode (for mobile development)

## Backend Setup

### 1. Install Dependencies

```bash
cd nodejs-backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `nodejs-backend` directory:

```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/dating-app
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5242880
```

### 3. Start MongoDB

Make sure MongoDB is running on your system. If using a cloud service like MongoDB Atlas, update the `MONGODB_URI` in your `.env` file.

### 4. Seed the Database

Run the setup script to create sample users and profiles:

```bash
npm run setup
```

This will:
- Create sample profile images
- Create 8 sample users with profiles
- Set up the database with test data

### 5. Start the Backend Server

```bash
npm run dev
```

The server will start on `http://localhost:8000`

## Flutter App Setup

### 1. Update Base URL (if needed)

The Flutter app is configured to use `http://10.0.2.2:8000` for Android emulator. If you're using:
- **Physical device**: Update the base URL in `dating_app/lib/services/auth_service.dart` and `dating_app/lib/services/profile_service.dart` to your computer's local IP address (e.g., `http://192.168.1.100:8000`)
- **iOS Simulator**: Use `http://localhost:8000`
- **Web**: Use `http://localhost:8000`

### 2. Install Flutter Dependencies

```bash
cd dating_app
flutter pub get
```

### 3. Run the Flutter App

```bash
flutter run
```

## Testing the App

### 1. Create a Test Account

You can either:
- Use one of the sample accounts created by the seed script:
  - Email: `john.doe@example.com`, Password: `password123`
  - Email: `jane.smith@example.com`, Password: `password123`
  - (and 6 more accounts)
- Or create a new account through the app

### 2. Complete Your Profile

After signing in, you'll need to complete your profile with:
- Bio
- Birth date
- Gender
- Gender preference
- Location
- Relationship type
- Profile picture

### 3. Start Exploring

Once your profile is complete, you can:
- View potential matches in the explore tab
- Like or dislike profiles
- Get matched when there's mutual interest
- See profile images and information

## Features Implemented

### Backend Features
- ✅ User authentication (signup/signin)
- ✅ Profile management
- ✅ Image upload and serving
- ✅ Potential matches algorithm
- ✅ Like/dislike functionality
- ✅ Matching system
- ✅ CORS configuration for mobile apps
- ✅ Sample data seeding

### Flutter App Features
- ✅ Authentication screens
- ✅ Profile setup
- ✅ Explore tab with real profiles
- ✅ Image display
- ✅ Like/dislike actions
- ✅ Match notifications
- ✅ Error handling

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Profiles
- `GET /api/profiles/me` - Get current user's profile
- `PUT /api/profiles/me` - Update profile
- `GET /api/profiles/potential-matches` - Get potential matches
- `POST /api/profiles/upload-picture` - Upload profile picture

### Matches
- `POST /api/matches/like` - Like a profile
- `POST /api/matches/dislike` - Dislike a profile
- `GET /api/matches` - Get user's matches

## Troubleshooting

### Common Issues

1. **Connection refused**: Make sure the backend server is running on port 8000
2. **CORS errors**: Check that your device's IP is in the CORS configuration
3. **Images not loading**: Verify the uploads directory exists and images are accessible
4. **Authentication errors**: Check that JWT_SECRET is set in the .env file

### Debug Mode

To run the backend in debug mode with more logging:

```bash
NODE_ENV=development DEBUG=* npm run dev
```

### Reset Database

To reset the database and start fresh:

```bash
npm run setup
```

## Next Steps

The app now has basic matching functionality. Future enhancements could include:
- Real-time chat functionality
- Push notifications
- Advanced matching algorithms
- Profile verification
- Report/block features
- Premium features

## Support

If you encounter any issues, check the console logs for both the backend server and Flutter app for detailed error messages. 