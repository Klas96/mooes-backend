# Mooves Backend API - Node.js + Express + PostgreSQL

A complete backend API for the Mooves application built with Node.js, Express, and PostgreSQL. This backend provides authentication, user profiles, AI-powered matching, real-time chat, and premium subscription management.

## 🎯 Features

- **Authentication**: JWT-based authentication with email verification
- **User Profiles**: Complete profile management with image uploads to Google Cloud Storage
- **AI-Powered Matching**: Intelligent matching algorithm with OpenAI integration
- **Real-time Chat**: WebSocket-based messaging between matched users
- **Premium Subscriptions**: Google Play and App Store billing integration
- **File Uploads**: Secure image upload support with Google Cloud Storage
- **Email Service**: Nodemailer for email verification and notifications
- **Security**: Rate limiting, CORS, input validation, and security headers
- **Database**: PostgreSQL with Sequelize ORM

## 🛠️ Tech Stack

- **Runtime**: Node.js (v20.18.0)
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Google Cloud Storage
- **Real-time**: Socket.io
- **AI Integration**: OpenAI API
- **Email**: Nodemailer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Testing**: Jest with Supertest

## 📋 Prerequisites

- Node.js (v20.18.0 or higher)
- PostgreSQL database (local or cloud)
- Google Cloud Storage bucket
- OpenAI API key
- SMTP email service (Gmail, SendGrid, etc.)
- Google Play Console (for Android billing)
- App Store Connect (for iOS billing)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodejs-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=8000
   NODE_ENV=development
   
   # Database Configuration
   DATABASE_URL=postgresql://username:[PASSWORD]@localhost:5432/mooves_db
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   
   # Google Cloud Storage
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   
   # Email Configuration (SMTP)
   EMAIL_HOST=mailcluster.loopia.se
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=mooves@klasholmgren.se
   EMAIL_PASSWORD=your_app_password
   
   # Google Play Billing
   GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.mooves
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
   ```

4. **Database Setup**
   ```bash
   # Create database schema
   npm run setup-schema
   
   # Seed with sample data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📱 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/verify-email` | Verify email address | No |
| POST | `/api/auth/resend-verification` | Resend verification email | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

### Profiles

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/profiles/me` | Get my profile | Yes |
| PUT | `/api/profiles/me` | Update my profile | Yes |
| GET | `/api/profiles/potential-matches` | Get potential matches | Yes |
| POST | `/api/profiles/upload-picture` | Upload profile picture | Yes |
| DELETE | `/api/profiles/picture/:id` | Delete profile picture | Yes |

### Matches

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/matches/like` | Like a profile | Yes |
| POST | `/api/matches/dislike` | Dislike a profile | Yes |
| GET | `/api/matches` | Get my matches | Yes |
| GET | `/api/matches/:id` | Get specific match | Yes |

### Messages

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/messages/:matchId` | Get messages for a match | Yes |
| POST | `/api/messages/:matchId` | Send a message | Yes |
| PUT | `/api/messages/:matchId/read` | Mark messages as read | Yes |

### AI Features

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/ai/generate-message` | Generate AI message | Yes |
| POST | `/api/ai/analyze-profile` | Analyze user profile | Yes |

### Billing

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/billing/verify-purchase` | Verify app store purchase | Yes |
| GET | `/api/billing/subscription-status` | Get subscription status | Yes |
| POST | `/api/billing/check-renewal` | Check subscription renewal | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

## 🔌 WebSocket Events

### Client to Server
- `send_message`: Send a new message
- `typing_start`: User started typing
- `typing_stop`: User stopped typing
- `mark_read`: Mark messages as read
- `join_match`: Join a specific match room

### Server to Client
- `new_message`: New message received
- `user_typing`: User is typing
- `user_stopped_typing`: User stopped typing
- `messages_read`: Messages marked as read
- `match_updated`: Match status updated
- `error`: Error message

## 🗄️ Database Models

### User
- `id`: Primary key
- `email`: String (unique, validated)
- `password`: String (hashed with bcrypt)
- `firstName`: String
- `lastName`: String
- `emailVerified`: Boolean
- `emailVerificationToken`: String
- `emailVerificationExpiry`: Date
- `isPremium`: Boolean
- `premiumExpiry`: Date
- `premiumPlan`: String
- `aiMessageCount`: Integer
- `lastAiMessageDate`: Date
- `lastPurchaseToken`: Text
- `platform`: Enum ('android', 'ios')
- `subscriptionStatus`: Enum
- `isActive`: Boolean
- `lastLogin`: Date

### UserProfile
- `id`: Primary key
- `userId`: Foreign key to User
- `profilePicture`: String (Google Cloud Storage URL)
- `bio`: Text
- `birthDate`: Date
- `gender`: Enum ('M', 'F', 'O')
- `genderPreference`: Enum ('M', 'W', 'B')
- `relationshipType`: String (comma-separated)
- `location`: String
- `latitude`: Decimal
- `longitude`: Decimal
- `keyWords`: Array of strings
- `locationMode`: Enum ('local', 'global')

### Match
- `id`: Primary key
- `user1Id`: Foreign key to UserProfile
- `user2Id`: Foreign key to UserProfile
- `status`: Enum ('pending', 'accepted', 'rejected', 'liked', 'disliked', 'matched')
- `user1Liked`: Boolean
- `user2Liked`: Boolean
- `matchedAt`: Date

### Message
- `id`: Primary key
- `matchId`: Foreign key to Match
- `senderId`: Foreign key to UserProfile
- `content`: Text
- `isRead`: Boolean
- `readAt`: Date

### Image
- `id`: Primary key
- `userId`: Foreign key to User
- `imageUrl`: String (Google Cloud Storage URL)
- `googleStorageDestination`: String
- `isPrimary`: Boolean
- `order`: Integer

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Express-validator for comprehensive request validation
- **Rate Limiting**: Prevents API abuse with configurable limits
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for protection against common vulnerabilities
- **File Upload Validation**: Image type, size, and content validation
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **XSS Protection**: Input sanitization and output encoding

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
```
__tests__/
├── setup.js              # Global test setup
├── auth.test.js          # Authentication tests
├── billing.test.js       # Billing tests
├── matches.test.js       # Matching tests
└── services/             # Service-specific tests
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:5432/mooves_db
JWT_SECRET=your_production_jwt_secret
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
OPENAI_API_KEY=your_openai_api_key
EMAIL_HOST=mailcluster.loopia.se
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=mooves@klasholmgren.se
EMAIL_PASSWORD=your_app_password
ALLOWED_ORIGINS=https://yourdomain.com
```

### Deployment Platforms

#### Google Cloud Run (Recommended)
```bash
# Build and deploy
npm run deploy-gcloud
```

#### Heroku
```bash
# Deploy to Heroku
npm run deploy-heroku
```

#### Docker
```bash
# Build Docker image
docker build -t mooves-backend .

# Run container
docker run -p 8000:8000 mooves-backend
```

## 📁 Project Structure
```
nodejs-backend/
├── controllers/          # Route controllers
├── middleware/           # Custom middleware
├── models/              # Database models
├── routes/              # API routes
├── services/            # Business logic services
├── websocket/           # WebSocket setup
├── uploads/             # Temporary file uploads
├── scripts/             # Utility scripts
├── __tests__/           # Test files
├── server.js            # Main server file
├── package.json         # Dependencies
└── README.md           # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Submit a pull request

### Development Guidelines
- Follow existing code conventions and style
- Add comprehensive tests for new features
- Update documentation for API changes
- Use meaningful commit messages
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [Issues](https://github.com/yourusername/mooves/issues) page
- Review the API documentation
- Check deployment guides in the `scripts/` directory

---

**Mooves Backend** - Powering meaningful connections! 💕
