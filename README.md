# Mooves App 🚀

A modern application built with Flutter (mobile app) and Node.js (backend API), featuring AI-powered matching, real-time chat, and premium subscription features.

## 🏗️ Project Structure

```
mooves/
├── dating_app/          # Flutter mobile application
├── nodejs-backend/      # Node.js Express API
├── docs/                # 📚 Comprehensive documentation
│   ├── backend/         # Backend guides and setup
│   ├── frontend/        # Frontend guides and setup
│   ├── deployment/      # Deployment and CI/CD guides
│   ├── security/        # Security guides and fixes
│   └── guides/          # General project guides
└── collections/         # API documentation
```

## 📚 Documentation

**📖 [View Complete Documentation](./docs/README.md)**

Quick access to key guides:
- 🚀 [Quick Start Guide](./docs/guides/SETUP_INSTRUCTIONS.md)
- 🏗️ [Backend Setup](./docs/backend/README.md)
- 📱 [Frontend Setup](./docs/frontend/README.md)
- 🔐 [Security Guide](./docs/security/SECURITY_GUIDE.md)
- 🚀 [Deployment Guide](./docs/deployment/DEPLOYMENT.md)

## 🎯 Features

### Mobile App (Flutter)
- **User Authentication**: Email verification, secure login/signup
- **Profile Management**: Photo uploads, bio, preferences, location
- **AI-Powered Matching**: Intelligent matching algorithm with AI assistance
- **Real-time Chat**: WebSocket-based messaging between matched users
- **Premium Features**: Subscription management with Google Play/App Store billing
- **Location Services**: GPS-based matching and location preferences
- **Push Notifications**: Real-time notifications for matches and messages

### Backend API (Node.js)
- **RESTful API**: Complete backend with authentication, profiles, matches
- **PostgreSQL Database**: Robust relational database with Sequelize ORM
- **WebSocket Support**: Real-time communication for chat features
- **AI Integration**: OpenAI integration for intelligent messaging
- **File Storage**: Google Cloud Storage for image uploads
- **Email Service**: Nodemailer for email verification
- **Security**: JWT authentication, rate limiting, CORS protection

## 🛠️ Tech Stack

### Frontend
- **Framework**: Flutter
- **Language**: Dart
- **State Management**: Provider/Riverpod
- **HTTP Client**: Dio
- **WebSocket**: Socket.io client
- **Local Storage**: Shared Preferences, Secure Storage

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **File Storage**: Google Cloud Storage
- **Email**: Nodemailer
- **AI**: OpenAI API
- **Security**: Helmet, CORS, Rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js (v20.18.0 or higher)
- Flutter SDK (latest stable)
- PostgreSQL database
- Google Cloud Storage (for file uploads)
- OpenAI API key (for AI features)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd nodejs-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   # Database
   DATABASE_URL=postgresql://username:[PASSWORD]@localhost:5432/mooves_db
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key
   
   # Google Cloud Storage
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Email (SMTP)
        EMAIL_HOST=mailcluster.loopia.se
     EMAIL_PORT=587
     EMAIL_SECURE=false
     EMAIL_USER=mooves@klasholmgren.se
     EMAIL_PASSWORD=your_app_password
   
   # Google Play Billing
   GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.mooves
   ```

4. **Database setup**
   ```bash
   npm run setup-schema
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Mobile App Setup

1. **Navigate to Flutter app directory**
   ```bash
   cd dating_app
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure API endpoints**
   Edit `lib/constants/api_config.dart` with your backend URL.

4. **Run the app**
   ```bash
   # iOS
   flutter run -d ios
   
   # Android
   flutter run -d android
   ```

## 📱 API Documentation

The backend provides a comprehensive REST API with the following main endpoints:

- **Authentication**: `/api/auth/*` - Registration, login, email verification
- **Profiles**: `/api/profiles/*` - User profile management
- **Matches**: `/api/matches/*` - Matching system and preferences
- **Messages**: `/api/messages/*` - Chat functionality
- **AI**: `/api/ai/*` - AI-powered messaging assistance
- **Billing**: `/api/billing/*` - Premium subscription management

For detailed API documentation, see the `collections/` directory or run the backend and visit `/api/docs`.

## 🧪 Testing

### Backend Tests
```bash
cd nodejs-backend
npm test
```

### Frontend Tests
```bash
cd dating_app
flutter test
```

## 🚀 Deployment

### Backend Deployment
The backend can be deployed to various platforms:

- **Google Cloud Run** (recommended)
- **Google Cloud Run**
- **AWS**
- **DigitalOcean**

See [deployment documentation](./docs/deployment/DEPLOYMENT.md) for specific platform instructions.

### Mobile App Deployment
- **Android**: Build APK/AAB and upload to Google Play Console
- **iOS**: Build and upload to App Store Connect

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable cross-origin requests
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: Image type and size validation
- **Environment Variables**: Secure configuration management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [Issues](https://github.com/yourusername/mooves/issues) page
- Review the API documentation in `collections/`
- Check the deployment guides in `scripts/`

---

**Mooves** - Where meaningful connections happen! 💕
