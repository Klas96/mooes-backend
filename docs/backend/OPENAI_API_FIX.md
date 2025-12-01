# 🔧 OpenAI API Key Fix Guide

## Problem
The deployment failed because it was using an invalid OpenAI API key (`test_openai_key`) instead of a real API key.

## ✅ Solution

### 1. Get Your OpenAI API Key
1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the generated key (starts with `sk-`)

### 2. Set Environment Variables

#### Option A: Use the Setup Script (Recommended)
```bash
cd nodejs-backend
./setup-env.sh
```

This script will prompt you for all required information and set the environment variables.

#### Option B: Set Manually
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-your-actual-api-key-here"

# Set other required variables
export DATABASE_URL="postgresql://mooves_user:[PASSWORD]@34.63.76.2:5432/mooves_db"
export JWT_SECRET="your-secure-jwt-secret"
export EMAIL_USER="mooves@klasholmgren.se"
export EMAIL_PASSWORD="your-app-password"
export FRONTEND_URL="https://your-frontend-url.com"
```

### 3. Deploy to Heroku
```bash
cd nodejs-backend
./deploy-gcloud.sh
```

### 4. Verify the Fix
1. Check Heroku logs: `heroku logs --tail`
2. Test the AI chat feature in your app
3. Verify no more authentication errors

## 🔍 What Was Fixed

### Updated Files:
1. **`deploy-gcloud.sh`** - Now validates environment variables before deployment
2. **`__tests__/ai.test.js`** - Properly mocks OpenAI service to prevent real API calls during testing
3. **`setup-env.sh`** - New script to help set up environment variables

### Key Changes:
- ✅ Environment variable validation before deployment
- ✅ Proper OpenAI service mocking in tests
- ✅ Clear error messages when variables are missing
- ✅ Step-by-step setup process

## 🚨 Important Notes

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Test with mocks** in CI/CD to avoid real API calls
4. **Rotate keys regularly** for security

## 🧪 Testing

The tests now use mocked responses instead of real OpenAI API calls:
- ✅ No authentication errors in CI/CD
- ✅ Faster test execution
- ✅ No API costs during testing
- ✅ Reliable test results

## 📞 Support

If you still encounter issues:
1. Check that your OpenAI API key is valid
2. Verify you have sufficient credits in your OpenAI account
3. Ensure all environment variables are set correctly
4. Check Heroku logs for detailed error messages 