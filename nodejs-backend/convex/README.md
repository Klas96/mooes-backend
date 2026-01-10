# Convex Functions

This directory contains Convex queries, mutations, and actions.

## Directory Structure

- `schema.js` - Database schema definitions
- `queries/` - Read operations (queries)
- `mutations/` - Write operations (mutations)
- `actions/` - External API calls and complex operations

## Generated Files

When you run `npx convex dev`, Convex will automatically generate:
- `_generated/` - Auto-generated TypeScript types and server utilities

**Important:** Don't edit files in `_generated/`. They are automatically generated.

## How to Use

### From Express Backend

Use the Convex service:

```javascript
const convexService = require('../services/convexService');

// Query
const user = await convexService.query('users:getByEmail', { email });

// Mutation
const userId = await convexService.mutation('users:create', {
  email,
  password,
  firstName,
  lastName
});

// Action
await convexService.action('users:sendEmail', { userId, email });
```

### From Frontend (Flutter/React)

Use the Convex client directly (see Convex documentation).

## Function Naming Convention

Functions are organized by resource:

- `users:getById` - Query in `queries/users.js`
- `users:create` - Mutation in `mutations/users.js`
- `users:sendEmail` - Action in `actions/users.js`

The path format is: `resource:functionName`

## Development

1. Start Convex dev server:
   ```bash
   npx convex dev
   ```

2. Functions will auto-reload on changes

3. Check Convex dashboard for logs and data

## Deployment

Functions are automatically deployed when you run:
```bash
npx convex deploy
```

Or via `npx convex dev` which auto-deploys on save.

