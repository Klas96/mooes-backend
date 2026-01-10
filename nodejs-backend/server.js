const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Load .env-config.yaml from the root
try {
  // Try local directory first, then parent directories
  let configPath = path.resolve(__dirname, '.env-config.yaml');
  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(__dirname, '../.env-config.yaml');
  }
  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(__dirname, '../../.env-config.yaml');
  }
  if (fs.existsSync(configPath)) {
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    
    // Set environment variables from YAML config
    if (config.database && config.database.url) {
      process.env.DATABASE_URL = config.database.url;
    }
    if (config.jwt && config.jwt.secret) {
      process.env.JWT_SECRET = config.jwt.secret;
    }
    if (config.email && config.email.user) {
      process.env.EMAIL_USER = config.email.user;
    }
    if (config.email && config.email.password) {
      process.env.EMAIL_PASSWORD = config.email.password;
    }
    if (config.email && config.email.host) {
      process.env.EMAIL_HOST = config.email.host;
    }
    if (config.email && config.email.port) {
      process.env.EMAIL_PORT = config.email.port.toString();
    }
    if (config.email && config.email.secure !== undefined) {
      process.env.EMAIL_SECURE = config.email.secure.toString();
    }
    if (config.email && config.email.frontend_url) {
      process.env.FRONTEND_URL = config.email.frontend_url;
    }
    if (config.google_oauth && config.google_oauth.client_id) {
      process.env.GOOGLE_CLIENT_ID = config.google_oauth.client_id;
    }
    if (config.google_fit && config.google_fit.client_id) {
      process.env.GOOGLE_FIT_CLIENT_ID = config.google_fit.client_id;
    }
    if (config.google_fit && config.google_fit.client_secret) {
      process.env.GOOGLE_FIT_CLIENT_SECRET = config.google_fit.client_secret;
    }
    if (config.google_fit && config.google_fit.redirect_uri) {
      process.env.GOOGLE_FIT_REDIRECT_URI = config.google_fit.redirect_uri;
    }
    if (config.cors && config.cors.allowed_origins) {
      process.env.ALLOWED_ORIGINS = config.cors.allowed_origins;
    }
    console.log('✅ Loaded environment variables from .env-config.yaml');
  }
} catch (error) {
  console.log('⚠️ Could not load .env-config.yaml:', error.message);
}

require('dotenv').config();

// Import models
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const trainingSessionRoutes = require('./routes/trainingSessions');
// Store goals routes - optional, only load if file exists
let storeGoalRoutes;
try {
  storeGoalRoutes = require('./routes/storeGoals');
} catch (e) {
  console.warn('⚠️  storeGoals routes not found, skipping...');
  storeGoalRoutes = null;
}
// Optional routes - only load if files exist
let userGoalProgressRoutes, couponRoutes, storeRoutes, googleFitRoutes;

try {
  userGoalProgressRoutes = require('./routes/userGoalProgress');
} catch (e) {
  console.warn('⚠️  userGoalProgress routes not found, skipping...');
  userGoalProgressRoutes = null;
}

try {
  couponRoutes = require('./routes/coupons');
  console.log('✅ Coupon routes module loaded successfully');
} catch (e) {
  console.error('❌ Error loading coupon routes:', e.message);
  console.error('Stack trace:', e.stack);
  console.warn('⚠️  coupons routes not found, skipping...');
  couponRoutes = null;
}

try {
  storeRoutes = require('./routes/stores');
} catch (e) {
  console.warn('⚠️  stores routes not found, skipping...');
  storeRoutes = null;
}

try {
  googleFitRoutes = require('./routes/googleFit');
} catch (e) {
  console.warn('⚠️  googleFit routes not found, skipping...');
  googleFitRoutes = null;
}

const app = express();

// Trust proxy for Cloud Run
app.set('trust proxy', 1);

// Optimize body parsing limits for better performance
app.use(express.json({ limit: '5mb' })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '5mb' })); // Reduced from 10mb

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  }
});
app.use('/api/', limiter);

// CORS configuration - Updated for web compatibility
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];

// GitHub Pages origin pattern
const GITHUB_PAGES_PATTERN = /^https:\/\/.*\.github\.io$/;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // If wildcard is in allowed origins, allow all origins
    if (allowedOrigins.includes('*')) {
      return callback(null, origin);
    }
    
    // Check exact match first
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }
    
    // Check for GitHub Pages (https://*.github.io)
    if (GITHUB_PAGES_PATTERN.test(origin)) {
      console.log('CORS: Allowing GitHub Pages origin:', origin);
      return callback(null, origin);
    }
    
    // Check for localhost patterns (http://localhost:* or http://127.0.0.1:*)
    const isLocalhost = origin.startsWith('http://localhost:') || 
                       origin.startsWith('http://127.0.0.1:') ||
                       origin.startsWith('https://localhost:') ||
                       origin.startsWith('https://127.0.0.1:');
    
    if (isLocalhost) {
      // Check if any localhost pattern is in allowed origins
      const hasLocalhostPattern = allowedOrigins.some(pattern => 
        pattern.includes('localhost') || pattern.includes('127.0.0.1')
      );
      if (hasLocalhostPattern) {
        return callback(null, origin);
      }
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// Determine if we're on Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Only set up local file serving if not on Vercel
if (!isVercel) {
  // Determine uploads directory - use UPLOADS_DIR env var if set, otherwise relative path
  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

  // Create uploads directory if it doesn't exist
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`📁 Created uploads directory: ${uploadsDir}`);
    }
  } catch (error) {
    console.log('⚠️  Could not create uploads directory:', error.message);
    console.log('   This is normal on serverless platforms - using Cloudinary instead');
  }

  // Serve static files from uploads directory (with CORS from middleware above)
  // Use the same directory where files are actually saved
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      // Set CORS headers for images
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Set appropriate content type based on file extension
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));

  console.log(`📂 Serving static files from: ${uploadsDir}`);
} else {
  console.log('🌐 Running on Vercel - using Cloudinary for file storage');
  // On Vercel, files are served from Cloudinary CDN, so we don't need local static serving
  // The /uploads route will be handled by a redirect or proxy if needed
}

// Log all requests for debugging
app.use((req, res, next) => {
  if (req.path && req.path.includes('/upload-picture')) {
    const userId = (req.user && req.user.id) ? req.user.id : 'unknown';
    console.log(`📤 ${req.method} ${req.path} - User: ${userId}`);
  }
  next();
});

// Routes - Register BEFORE starting server
// Add request logging middleware
app.use('/api/auth', (req, res, next) => {
  if (req.path.includes('login')) {
    console.log('🔵 API Request:', req.method, req.path, 'Body:', JSON.stringify(req.body));
  }
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/training-sessions', trainingSessionRoutes);

if (storeGoalRoutes) {
  app.use('/api/store-goals', storeGoalRoutes);
}
if (userGoalProgressRoutes) {
  app.use('/api/user-goal-progress', userGoalProgressRoutes);
}
if (couponRoutes) {
  // Add request logging for coupon routes to help debug
  app.use('/api/coupons', (req, res, next) => {
    console.log(`🎫 Coupon route request: ${req.method} ${req.path}`);
    next();
  });
  app.use('/api/coupons', couponRoutes);
  console.log('✅ Coupon routes registered at /api/coupons');
  console.log('   Available endpoints:');
  console.log('   - POST   /api/coupons');
  console.log('   - GET    /api/coupons/my-coupons');
  console.log('   - GET    /api/coupons/store/my-coupons');
  console.log('   - POST   /api/coupons/:couponId/use');
  console.log('   - DELETE /api/coupons/:couponId');
  console.log('   - GET    /api/coupons/:couponId');
} else {
  console.error('❌ Coupon routes not available - routes will not be registered');
  console.error('   This means POST /api/coupons will return 404');
}
if (storeRoutes) {
  app.use('/api/stores', storeRoutes);
  console.log('✅ Store routes registered at /api/stores');
  console.log('   Available endpoints:');
  console.log('   - GET    /api/stores/:storeId (public)');
  console.log('   - POST   /api/stores (protected)');
  console.log('   - GET    /api/stores/my-store (protected)');
  console.log('   - PUT    /api/stores/my-store (protected)');
  console.log('   - POST   /api/stores/upload-profile-picture (protected)');
} else {
  console.warn('⚠️  Store routes not available');
}
if (googleFitRoutes) {
  app.use('/api/google-fit', googleFitRoutes);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'PostgreSQL',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const { User } = require('./models');
    const userCount = await User.count();
    res.json({ 
      status: 'OK', 
      message: 'Database connection working',
      userCount: userCount
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(503).json({ 
      status: 'ERROR', 
      error: error.message,
      errorName: error.name,
      originalError: error.original ? error.original.message : null
    });
  }
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  // Only log API routes to avoid spam
  if (req.originalUrl.startsWith('/api/')) {
    console.warn(`⚠️  404 - Route not found: ${req.method} ${req.originalUrl}`);
    console.warn(`   Available routes: Check server startup logs for registered routes`);
  }
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    message: `No route found for ${req.method} ${req.originalUrl}`
  });
});

// Start server AFTER routes are registered
const PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

let server;

// Check for SSL certificate files
const getCertificatePaths = () => {
  // Check in multiple possible locations
  const possibleCertPaths = [
    path.resolve(__dirname, '../certificate.crt'),
    path.resolve(__dirname, '../../certificate.crt'),
    process.env.SSL_CERT_PATH,
  ];
  
  const possibleKeyPaths = [
    path.resolve(__dirname, '../certificate.key'),
    path.resolve(__dirname, '../private.key'),
    path.resolve(__dirname, '../../certificate.key'),
    path.resolve(__dirname, '../../private.key'),
    process.env.SSL_KEY_PATH,
  ];
  
  const certPath = possibleCertPaths.find(p => p && fs.existsSync(p));
  const keyPath = possibleKeyPaths.find(p => p && fs.existsSync(p));
  
  return { certPath, keyPath };
};

// Only start the server if not in test mode and not on Vercel
// Vercel uses serverless functions, so we don't need to start an HTTP server
// Note: isVercel is already declared at line 233

if (process.env.NODE_ENV !== 'test' && !isVercel) {
  // Authenticate database connection before starting server
  (async () => {
    try {
      if (!sequelize) {
        console.error('❌ Database connection not available. DATABASE_URL may not be set.');
        process.exit(1);
      }

      console.log('🔌 Authenticating database connection...');
      await sequelize.authenticate();
      console.log('✅ Database connection authenticated successfully');
      
      // Check for SSL certificates
      const { certPath, keyPath } = getCertificatePaths();
      
      if (certPath && keyPath) {
        // Start HTTPS server
        try {
          const cert = fs.readFileSync(certPath, 'utf8');
          const key = fs.readFileSync(keyPath, 'utf8');
          
          const httpsOptions = {
            cert,
            key,
          };
          
          server = https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
            console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Database: PostgreSQL`);
            console.log(`Trust proxy: ${app.get('trust proxy')}`);
            console.log(`Certificate: ${certPath}`);
          });
          
          // Also start HTTP server to redirect to HTTPS (optional)
          if (process.env.HTTP_REDIRECT_TO_HTTPS === 'true') {
            http.createServer((req, res) => {
              const host = req.headers.host.replace(`:${PORT}`, '');
              res.writeHead(301, { Location: `https://${host}:${HTTPS_PORT}${req.url}` });
              res.end();
            }).listen(PORT, () => {
              console.log(`🔄 HTTP redirect server running on port ${PORT} (redirecting to HTTPS)`);
            });
          }
        } catch (error) {
          console.error('❌ Failed to start HTTPS server:', error.message);
          console.error('Falling back to HTTP...');
          // Fall back to HTTP
          server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (HTTP)`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Database: PostgreSQL`);
            console.log(`Trust proxy: ${app.get('trust proxy')}`);
          });
        }
      } else {
        // Start HTTP server (no SSL certificates found)
        if (certPath && !keyPath) {
          console.warn('⚠️  Certificate found but private key missing. Starting HTTP server.');
          console.warn(`   Certificate: ${certPath}`);
          console.warn(`   Expected key at: ${path.dirname(certPath)}/certificate.key or ${path.dirname(certPath)}/private.key`);
        } else if (!certPath) {
          console.log('ℹ️  No SSL certificate found. Starting HTTP server.');
        }
        
        server = app.listen(PORT, () => {
          console.log(`Server running on port ${PORT} (HTTP)`);
          console.log(`Environment: ${process.env.NODE_ENV}`);
          console.log(`Database: PostgreSQL`);
          console.log(`Trust proxy: ${app.get('trust proxy')}`);
        });
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('Error details:', error);
      
      if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   1. Check if PostgreSQL is running');
        console.error('   2. Verify DATABASE_URL is correct');
        console.error('   3. Check database credentials');
        console.error('   4. Ensure database exists');
        if (process.env.DATABASE_URL) {
          const dbUrl = process.env.DATABASE_URL;
          // Mask password in URL for security
          const maskedUrl = dbUrl.replace(/:(.*?)@/, ':****@');
          console.error(`   DATABASE_URL: ${maskedUrl}`);
        }
      }
      
      process.exit(1);
    }
  })();
}

module.exports = app; 
