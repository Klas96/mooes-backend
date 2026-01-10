# Convex Migration Guide

This guide documents the migration from PostgreSQL/Sequelize to Convex.

## Overview

Convex is a backend-as-a-service that provides:
- A reactive database
- Real-time subscriptions
- Serverless functions (queries, mutations, actions)
- Automatic scaling

## Migration Strategy

1. **Keep Express backend** - Use Convex as the database layer
2. **Create Convex functions** - Define queries, mutations, and actions in Convex
3. **Update Express controllers** - Use Convex HTTP API or Convex client to interact with data
4. **Gradual migration** - Migrate one module at a time

## Setup Steps

### 1. Initialize Convex Project

```bash
cd mooves-backend/nodejs-backend
npx convex dev
```

This will:
- Create a `convex/` directory
- Set up `convex.json` configuration
- Create environment variables for Convex deployment URL and access key

### 2. Define Schema

Create `convex/schema.js` with all table definitions mapped to Convex schema.

### 3. Create Functions

For each model, create:
- **Queries** (read operations) - `convex/queries/`
- **Mutations** (write operations) - `convex/mutations/`
- **Actions** (external API calls, complex operations) - `convex/actions/`

### 4. Update Express Backend

Replace Sequelize calls with Convex HTTP API calls or use the Convex Node.js client.

## Environment Variables

Add to `.env`:
```bash
CONVEX_DEPLOYMENT=https://your-deployment.convex.cloud
CONVEX_ACCESS_KEY=your-access-key
```

Or use Convex's environment variable detection:
- Set `CONVEX_URL` for HTTP API calls
- Use `npx convex env set` for secrets

## Key Differences from Sequelize

| Sequelize | Convex |
|-----------|--------|
| `User.findOne({ where: { id } })` | HTTP API call to query function |
| `User.create(data)` | HTTP API call to mutation function |
| `User.update(data, { where })` | HTTP API call to mutation function |
| Relationships (belongsTo, hasMany) | Embed or reference Ids |
| Transactions | Automatic in Convex |
| Migrations | Schema updates in `schema.js` |

## Migration Checklist

- [ ] Initialize Convex project
- [ ] Define schema for all models
- [ ] Create queries for read operations
- [ ] Create mutations for write operations
- [ ] Update auth controller
- [ ] Update store controller
- [ ] Update goal controllers
- [ ] Update coupon controllers
- [ ] Update remaining controllers
- [ ] Remove Sequelize dependencies
- [ ] Update deployment config

