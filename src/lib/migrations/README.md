# MongoDB Migration System

A comprehensive database migration system for managing MongoDB schema changes with validation, rollback support, and
CLI tools.

## Features

- **Version-based migrations** with automatic sequencing
- **Rollback support** for safe database changes
- **Validation system** to ensure migration integrity
- **CLI tools** for easy migration management
- **Dry-run mode** for safe testing
- **Comprehensive logging** and error handling
- **Template generation** for consistent migration structure

## Quick Start

### 1. Create a new migration

```bash
npm run migrate:create "Add user authentication indexes"
```

### 2. Edit the generated migration file

```javascript
// migrations/001_add_user_authentication_indexes.js
module.exports = {
  version: '001',
  description: 'Add user authentication indexes',

  async up(db) {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
  },

  async down(db) {
    await db.collection('users').dropIndex({ email: 1 });
    await db.collection('users').dropIndex({ username: 1 });
  }
};
```

### 3. Run migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback migrations (optional)
npm run migrate:down 1
```

## CLI Commands

### `npm run migrate:status`
Shows the status of all migrations (pending/executed).

### `npm run migrate:up`
Executes all pending migrations in order.

### `npm run migrate:down [steps]`
Rolls back the last N migrations (default: 1).

### `npm run migrate:create <description>`
Creates a new migration file with the given description.

### `npm run migrate:validate`
Validates all migration files for syntax and structure errors.

### `npm run migrate:help`
Shows detailed help information.

## Configuration

Configure the migration system using environment variables:

```bash
# MongoDB connection (required)
MONGODB_URI=mongodb://localhost:27017/myapp

# Migration settings (optional)
MIGRATIONS_PATH=./migrations
MIGRATIONS_COLLECTION=migrations
MIGRATION_TIMEOUT=30000
MIGRATION_BACKUP_ENABLED=true
MIGRATION_DRY_RUN=false
MIGRATION_VALIDATE_ONLY=false
```

## Migration File Structure

Each migration file must export an object with the following structure:

```javascript
module.exports = {
  version: '001',           // Unique version number
  description: 'Migration description',

  async up(db) {
    // Apply changes
    await db.collection('users').createIndex({ email: 1 });
  },

  async down(db) {
    // Rollback changes  
    await db.collection('users').dropIndex({ email: 1 });
  }
};
```

### Migration Naming Convention

Migration files should follow this naming pattern:
- `001_description.js` - Version number (zero-padded) + underscore + description + `.js`
- Example: `001_create_user_indexes.js`

## Best Practices

### 1. Always provide rollback logic
Every migration should have a corresponding `down` method that can safely undo the changes.

### 2. Test migrations thoroughly
- Use `MIGRATION_DRY_RUN=true` to test without applying changes
- Test both `up` and `down` operations
- Validate on a copy of production data

### 3. Keep migrations atomic
Each migration should represent a single logical change that can be applied or rolled back as a unit.

### 4. Handle errors gracefully
```javascript
async up(db) {
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  } catch (error) {
    if (error.code !== 11000) { // Ignore duplicate key error
      throw error;
    }
  }
}
```

### 5. Use transactions for complex changes
```javascript
async up(db) {
  const session = db.client.startSession();
  
  try {
    await session.withTransaction(async () => {
      await db.collection('users').updateMany({}, { $set: { status: 'active' } }, { session });
      await db.collection('profiles').updateMany({}, { $set: { verified: true } }, { session });
    });
  } finally {
    await session.endSession();
  }
}
```

## Advanced Usage

### Programmatic API

```typescript
import { MongoClient } from 'mongodb';
import { MigrationRunner } from './src/lib/migrations/runner';

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();

const runner = new MigrationRunner(client, {
  migrationsPath: './migrations',
  collectionName: 'migrations',
  timeout: 30000,
  backupEnabled: true,
  dryRun: false,
  validateOnly: false,
});

// Get migration status
const status = await runner.getStatus();

// Run migrations
const results = await runner.migrate();

// Rollback migrations
const rollbackResults = await runner.rollback(1);

// Validate migrations
const isValid = await runner.validateMigrations();

await client.close();
```

### Custom Migration Templates

You can customize the migration template by modifying the `generateMigrationTemplate` method in `src/lib/migrations/runner.ts`.

## Error Handling

The migration system provides comprehensive error handling:

- **Syntax errors** in migration files are caught during validation
- **Runtime errors** during migration execution are logged and stop further migrations
- **Rollback errors** are handled gracefully with detailed error reporting
- **Database connection failures** are detected and reported

## Monitoring and Logging

- All migration executions are logged with timestamps and execution times
- Migration records are stored in the database for tracking
- CLI provides colored output for easy status identification
- Validation errors include detailed information about issues

## Testing

The migration system includes comprehensive tests covering:

- Migration execution and rollback
- Error handling and edge cases
- File system operations
- Database interactions
- CLI functionality

Run tests with:
<<<<<<< HEAD

=======
>>>>>>> 1c99913 (feat: Implement comprehensive MongoDB migration system)
```bash
npm test src/lib/migrations
```

## Troubleshooting

### Common Issues

<<<<<<< HEAD
#### Migration stuck in "pending" state

=======
**Migration stuck in "pending" state**
>>>>>>> 1c99913 (feat: Implement comprehensive MongoDB migration system)
- Check database connectivity
- Verify migration file syntax
- Check for locked collections

<<<<<<< HEAD
#### "Cannot read properties of undefined" error

=======
**"Cannot read properties of undefined" error**
>>>>>>> 1c99913 (feat: Implement comprehensive MongoDB migration system)
- Ensure all required environment variables are set
- Verify MongoDB connection string
- Check migration file structure

<<<<<<< HEAD
#### Duplicate version numbers

- Run `npm run migrate:validate` to check for conflicts
- Ensure each migration has a unique version number

#### Rollback fails

=======
**Duplicate version numbers**
- Run `npm run migrate:validate` to check for conflicts
- Ensure each migration has a unique version number

**Rollback fails**
>>>>>>> 1c99913 (feat: Implement comprehensive MongoDB migration system)
- Verify the `down` method is properly implemented
- Check for data dependencies that prevent rollback
- Use transactions for complex rollbacks

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=migration:* npm run migrate:up
```

## Contributing

When adding new features to the migration system:

1. Follow the existing TypeScript patterns
2. Add comprehensive tests
3. Update documentation
4. Ensure backward compatibility
5. Test with real MongoDB instances

## License

This migration system is part of the D&D Encounter Tracker project and follows the same license terms.
