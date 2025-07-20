#!/bin/bash

# Migration script wrapper that uses compiled JS in production and TypeScript in development
# This optimizes Docker production images by eliminating the need for tsx dependency

set -e

# Determine which script to run based on environment
if [ "$NODE_ENV" = "production" ]; then
    # In production, use compiled JavaScript
    SCRIPT_PATH="lib/scripts/migrate.js"
    RUNNER="node"
else
    # In development, use TypeScript with tsx
    SCRIPT_PATH="src/lib/scripts/migrate.ts"
    RUNNER="tsx"
fi

# Check if the script file exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Migration script not found: $SCRIPT_PATH"
    echo "   Environment: ${NODE_ENV:-development}"
    
    if [ "$NODE_ENV" = "production" ]; then
        echo "   Ensure the build process compiled TypeScript scripts correctly"
    else
        echo "   Ensure tsx is installed: npm install tsx"
    fi
    exit 1
fi

# Execute the migration command with all passed arguments
echo "🚀 Running migration with $RUNNER $SCRIPT_PATH $*"
exec $RUNNER "$SCRIPT_PATH" "$@"