# Contributing to Mooves

## Branch Protection Rules

Direct pushes to the `main` branch are **not allowed**. This ensures code quality and proper review processes.

## Development Workflow

### 1. Create a Feature Branch
```bash
# Make sure you're on the main branch and it's up to date
git checkout main
git pull origin main

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
```bash
# Make your changes and commit them
git add .
git commit -m "feat: add your feature description"
```

### 3. Push to Your Feature Branch
```bash
# Push to your feature branch (not main)
git push origin feature/your-feature-name
```

### 4. Create a Pull Request
1. Go to your GitHub repository: https://github.com/Klas96/mooves
2. Click "Compare & pull request" for your feature branch
3. Fill in the PR description with:
   - What changes you made
   - Why you made them
   - Any testing you did
4. Request a review from team members
5. Wait for approval

### 5. Merge Through Pull Request
Once approved, merge your PR through the GitHub interface.

## Branch Naming Conventions

Use descriptive branch names with prefixes:
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Urgent fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

Examples:
- `feature/ai-chat-enhancements`
- `bugfix/login-validation`
- `hotfix/security-patch`

## Commit Message Guidelines

Use conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Getting Help

If you encounter issues:
1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. Ask in team discussions

## Code Review Guidelines

When reviewing PRs:
- Check code quality and style
- Ensure tests pass
- Verify functionality
- Provide constructive feedback
- Approve only when satisfied

## Local Development Setup

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up environment variables
4. Run the development servers
5. Follow the workflow above for changes 