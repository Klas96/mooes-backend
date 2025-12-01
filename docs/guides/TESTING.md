# Testing Guide

This document describes the testing setup and how to run tests for the Mooves app.

## Overview

The project includes comprehensive automated tests that run on every pull request to the main branch. The test suite covers:

- **Flutter Tests**: Unit tests, widget tests, and integration tests for the mobile app
- **Backend Tests**: API endpoint tests, database tests, and service tests
- **Code Quality Checks**: Linting, formatting, and code analysis
- **Security Checks**: Vulnerability scanning and secret detection
- **Build Verification**: Ensuring the app builds successfully

## Test Structure

### Flutter Tests (`dating_app/test/`)

- `widget_test.dart` - Basic app widget tests
- `services/auth_service_test.dart` - Authentication service tests
- `widgets/profile_tab_test.dart` - Profile tab widget tests

### Backend Tests (`nodejs-backend/__tests__/`)

- `auth.test.js` - Authentication endpoint tests
- `setup.js` - Test configuration and setup

## Running Tests Locally

### Prerequisites

1. **Flutter Setup**
   ```bash
   cd dating_app
   flutter pub get
   ```

2. **Node.js Setup**
   ```bash
   cd nodejs-backend
   npm install
   ```

3. **PostgreSQL** (for backend tests)
   - Install PostgreSQL locally or use Docker
   - Create a test database

### Running Flutter Tests

```bash
cd dating_app

# Run all tests
flutter test

# Run tests with coverage
flutter test --coverage

# Run specific test file
flutter test test/services/auth_service_test.dart

# Run tests with verbose output
flutter test --verbose
```

### Running Backend Tests

```bash
cd nodejs-backend

# Set up test environment
export DATABASE_URL="postgresql://username:password@localhost:5432/test_db"
export JWT_SECRET="test_secret_key_for_testing_only"
export NODE_ENV="test"

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- auth.test.js
```

### Running Code Quality Checks

```bash
# Flutter code analysis
cd dating_app
flutter analyze

# Flutter code formatting
flutter format --set-exit-if-changed .

# Backend linting (if configured)
cd nodejs-backend
npm run lint
```

## CI/CD Pipeline

The automated test suite runs on every pull request to the main branch via GitHub Actions. The pipeline includes:

### Jobs

1. **Flutter Tests**
   - Code analysis
   - Unit tests
   - Widget tests
   - Integration tests
   - Code formatting check

2. **Backend Tests**
   - API endpoint tests
   - Database integration tests
   - Service tests
   - Code linting

3. **Code Quality Checks**
   - TODO comment detection
   - Console.log statement detection
   - Large file detection
   - JSON validation

4. **Security Checks**
   - npm audit for vulnerabilities
   - Hardcoded secret detection
   - Security best practices

5. **Build Verification**
   - Flutter build verification
   - Backend build verification

### Workflow File

The test workflow is defined in `.github/workflows/test-suite.yml`

## Test Coverage

### Flutter Coverage

To generate and view Flutter test coverage:

```bash
cd dating_app
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Backend Coverage

To generate and view backend test coverage:

```bash
cd nodejs-backend
npm test -- --coverage
open coverage/lcov-report/index.html
```

## Writing Tests

### Flutter Tests

1. **Unit Tests**: Test individual functions and classes
2. **Widget Tests**: Test UI components and user interactions
3. **Integration Tests**: Test complete user flows

Example widget test:
```dart
testWidgets('should show profile information', (WidgetTester tester) async {
  await tester.pumpWidget(MyWidget());
  expect(find.text('Profile'), findsOneWidget);
});
```

### Backend Tests

1. **Unit Tests**: Test individual functions
2. **Integration Tests**: Test API endpoints with database
3. **Service Tests**: Test business logic

Example API test:
```javascript
it('should return user profile', async () => {
  const response = await request(app)
    .get('/api/profiles/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  
  expect(response.body).toHaveProperty('id');
});
```

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Mocking**: Use mocks for external dependencies (APIs, databases)
4. **Coverage**: Aim for at least 80% test coverage
5. **Fast Tests**: Keep tests fast to encourage frequent running

## Troubleshooting

### Common Issues

1. **Flutter Tests Failing**
   - Ensure all dependencies are installed: `flutter pub get`
   - Check for syntax errors: `flutter analyze`
   - Verify test environment setup

2. **Backend Tests Failing**
   - Ensure PostgreSQL is running
   - Check database connection settings
   - Verify environment variables are set correctly

3. **CI/CD Pipeline Failing**
   - Check GitHub Actions logs for specific error messages
   - Ensure all required secrets are configured
   - Verify test environment setup in workflow

### Getting Help

If you encounter issues with tests:

1. Check the GitHub Actions logs for detailed error messages
2. Run tests locally to reproduce the issue
3. Check the test documentation and examples
4. Create an issue with detailed error information

## Continuous Improvement

The test suite is continuously improved:

1. **New Features**: Add tests for new functionality
2. **Bug Fixes**: Add tests to prevent regression
3. **Performance**: Optimize test execution time
4. **Coverage**: Increase test coverage for critical paths

## Contributing

When contributing to the project:

1. Write tests for new functionality
2. Ensure all existing tests pass
3. Update test documentation as needed
4. Follow the testing best practices outlined above 