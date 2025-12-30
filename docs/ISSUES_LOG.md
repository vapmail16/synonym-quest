# Issues Log

This document tracks issues encountered during development, their resolutions, and key learnings to prevent similar issues in the future.

---

## Issue #1: Foreign Key Constraint Error on UserBadge Table Creation

**Date:** 2024-12-19  
**Severity:** High (Blocking - Server won't start)  
**Status:** Resolved

### Problem Description

When starting the backend server, the following error occurred during database initialization:

```
SequelizeDatabaseError: error: there is no unique constraint matching given keys for referenced table "users"
```

The error occurred when trying to create the `user_badges` table with foreign key references to `users` and `badges` tables.

**Error Details:**
- Error Code: `42830`
- Location: `backend/src/models/index.ts` during `sequelize.sync()`
- SQL: `CREATE TABLE IF NOT EXISTS "user_badges" (...) REFERENCES "users" ("id") ...`

### Root Cause

**Primary Issue**: The `users` table existed in the database but **did not have a primary key constraint** on the `id` column. PostgreSQL requires a unique constraint (primary key or unique index) on the referenced column to create foreign keys. When Sequelize tried to create the `user_badges` table with `REFERENCES "users" ("id")`, PostgreSQL rejected it because there was no unique constraint on `users.id`.

**Contributing Factors**:

1. **Missing Primary Key Constraint**: The `users` table was created without a primary key constraint (possibly from an earlier migration or manual creation).

2. **Explicit Foreign Key References in Model Definition**: The `UserBadge` model had explicit `references` defined, which Sequelize tried to enforce during table creation.

3. **Sequelize Associations**: Associations were defined which also tried to create foreign key constraints during sync.

4. **Table Already Existed**: Since the table already existed without the constraint, `sequelize.sync({ force: false })` didn't recreate it, leaving the constraint missing.

### Resolution

**Root Cause Identified**: The `users` table existed in the database but **did not have a primary key constraint** on the `id` column. PostgreSQL requires a unique constraint (primary key or unique index) on the referenced column to create foreign keys.

**Fix Applied**:

1. **Added Primary Key Constraint to Existing `users` Table**:
   ```sql
   ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
   ```
   This was done via a migration script (`fix-users-primary-key.js`) since the table already existed without the constraint.

2. **Removed Explicit Foreign Key References**: Removed the `references` object from `userId` and `badgeId` fields in `UserBadge` model definition, letting Sequelize associations handle foreign key creation:
   ```typescript
   userId: {
     type: DataTypes.UUID,
     allowNull: false,
     // Foreign key will be handled by Sequelize associations
   }
   ```

3. **Disabled Foreign Key Constraints in Associations**: Added `constraints: false` to badge associations to prevent FK creation during sync (foreign keys enforced at application level):
   ```typescript
   User.hasMany(UserBadge, { foreignKey: 'userId', as: 'badges', constraints: false });
   UserBadge.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
   ```

4. **Use `sequelize.sync()`**: Changed to `sequelize.sync()` which properly handles dependency order:
   ```typescript
   await sequelize.sync({ force: false, alter: false });
   ```

**Why This Works**: The primary issue was the missing primary key constraint. Once added, PostgreSQL can create foreign key references. The `constraints: false` option prevents Sequelize from trying to create FKs during sync, avoiding timing issues.

### Files Changed

- `backend/src/models/UserBadge.ts`: Removed explicit `references` from `userId` and `badgeId` fields
- `backend/src/models/index.ts`: Added `constraints: false` to badge associations, changed to `sequelize.sync()`
- `backend/fix-users-primary-key.js`: Script to add primary key constraint to existing `users` table (one-time fix)
- `backend/check-users-table.js`: Diagnostic script to check table constraints

### Why This Was Missed During Testing

1. **Test Database vs Production Database**: 
   - Unit and integration tests used `pg-mem` (in-memory PostgreSQL) which is more lenient with foreign key constraints
   - The test database setup didn't replicate the exact table creation order that occurs in production
   - `pg-mem` may handle foreign key creation differently than a real PostgreSQL instance

2. **Test Coverage Gap**:
   - Tests focused on model functionality (CRUD operations, validations)
   - No tests specifically validated table creation and foreign key constraints in a real database environment
   - Integration tests mocked models rather than testing actual database schema creation

3. **Development Environment**:
   - The issue only manifested when starting the server against the remote PostgreSQL database
   - Local development might have had existing tables, masking the issue
   - The error only occurs on fresh database initialization

4. **Assumption Error**:
   - Assumed that if tests passed, the database schema would work correctly
   - Didn't test the actual `sequelize.sync()` process in a clean database state
   - Overlooked the interaction between model definitions and associations

### Key Learnings

1. **Foreign Key Definition Best Practice**:
   - **DO**: Define foreign keys through Sequelize associations (`hasMany`, `belongsTo`)
   - **DON'T**: Define foreign keys both in model field definitions AND associations (creates conflicts)
   - **WHEN**: Use explicit `references` only if you're NOT using Sequelize associations

2. **Database Sync Strategy**:
   - For complex schemas with many foreign key dependencies, sequential sync is more reliable
   - Base tables (User, Badge, Word) should be synced before dependent tables (UserBadge, UserProgress)
   - Consider using migrations for production instead of `sync()` for better control

3. **Testing Strategy**:
   - **Unit Tests**: Test model logic, validations, methods
   - **Integration Tests**: Test API endpoints with mocked models
   - **Database Schema Tests**: Test actual table creation in a real database (missing in our case)
   - **End-to-End Tests**: Test full application startup with clean database

4. **Test Environment vs Production**:
   - `pg-mem` is useful for fast tests but doesn't perfectly replicate PostgreSQL behavior
   - Always test database schema creation against the actual database type used in production
   - Consider adding a "schema validation" test that runs against a real database

5. **Error Prevention**:
   - Add pre-commit hooks to test database initialization
   - Create a test script that initializes a clean database and validates schema
   - Document expected table creation order for complex schemas

### Prevention Measures

1. **Added Schema Validation Test** (TODO):
   ```typescript
   describe('Database Schema', () => {
     it('should create all tables with correct foreign keys', async () => {
       // Test against real database
       await initDatabase();
       // Validate foreign keys exist
     });
   });
   ```

2. **Documentation**: Documented the sync order in code comments

3. **Code Review Checklist**: Add to review checklist:
   - [ ] Foreign keys defined only in associations OR model, not both
   - [ ] Table sync order respects dependencies
   - [ ] Schema tested against production database type

### Related Issues

None yet.

---

## Template for Future Issues

**Date:** YYYY-MM-DD  
**Severity:** Low/Medium/High/Critical  
**Status:** Open/In Progress/Resolved

### Problem Description
[Clear description of the issue]

### Root Cause
[Why did this happen?]

### Resolution
[How was it fixed?]

### Files Changed
[List of files modified]

### Why This Was Missed
[What testing/process failed to catch this?]

### Key Learnings
[What did we learn?]

### Prevention Measures
[How do we prevent this in the future?]

---

