# Branch Structure

This project follows a standard Git branching strategy with the following branches:

## Main Branches

### `main` (Production)
- **Purpose**: Production-ready, stable code
- **Deployment**: Automatically deployed to production
- **Protection**: Requires pull request reviews
- **CI/CD**: Triggers iOS and Android builds

### `development` (Development)
- **Purpose**: Integration branch for development work
- **Deployment**: Development/staging environment
- **CI/CD**: Triggers iOS and Android builds
- **Merging**: Feature branches merge here first

## Feature Branches

Feature branches should be created from `development` and follow this naming convention:

- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/urgent-fix` - Critical production fixes

## Workflow

### Development Workflow
1. Create feature branch from `development`
2. Develop and test your feature
3. Create pull request to `development`
4. After review, merge to `development`
5. Test integration in development environment

### Release Workflow
1. When `development` is stable, create pull request to `main`
2. After review and testing, merge to `main`
3. Tag the release with version number
4. Production deployment happens automatically

### Hotfix Workflow
1. Create hotfix branch from `main`
2. Fix the critical issue
3. Create pull request to both `main` and `development`
4. Merge to both branches

## CI/CD

GitHub Actions workflows are configured to:
- Build iOS and Android apps on pushes to `main` and `development`
- Run tests on pull requests
- Deploy to appropriate environments

## Branch Protection

- `main` branch is protected and requires pull request reviews
- `development` branch is protected and requires pull request reviews
- Direct pushes to protected branches are disabled

## Commands

### Creating a new feature
```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature-name
# ... develop your feature
git push origin feature/your-feature-name
```

### Merging to development
```bash
git checkout development
git pull origin development
git merge feature/your-feature-name
git push origin development
```

### Creating a release
```bash
git checkout main
git pull origin main
git merge development
git tag v1.0.0
git push origin main --tags
``` 