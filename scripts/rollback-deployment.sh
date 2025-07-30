#!/bin/bash

# rollback-deployment.sh
# Comprehensive rollback script for deployment failures
# Handles application, migration, and database rollbacks

set -euo pipefail

# Configuration from environment or defaults
ENVIRONMENT="${DEPLOY_ENV:-staging}"
ROLLBACK_TYPE="${ROLLBACK_TYPE:-auto}"  # auto, app, migration, database
BACKUP_PATH="${BACKUP_PATH:-}"
MIGRATION_STEPS="${MIGRATION_STEPS:-1}"
DRY_RUN="${ROLLBACK_DRY_RUN:-false}"
FORCE_ROLLBACK="${FORCE_ROLLBACK:-false}"

# Load environment-specific configuration
CONFIG_FILE="./config/migration.${ENVIRONMENT}.json"
if [[ -f "$CONFIG_FILE" && -x "$(command -v jq)" ]]; then
    echo "Loading rollback configuration from $CONFIG_FILE"
    NOTIFICATION_REQUIRED=$(jq -r '.rollback.rollbackNotificationRequired // true' "$CONFIG_FILE")
else
    NOTIFICATION_REQUIRED="true"
fi

echo "🔄 Starting rollback process..."
echo "Environment: $ENVIRONMENT"
echo "Rollback type: $ROLLBACK_TYPE"
echo "Dry run: $DRY_RUN"

# Function to send rollback notification
send_notification() {
    local message="$1"
    local status="$2"
    
    if [[ "$NOTIFICATION_REQUIRED" == "true" ]]; then
        echo "📢 Rollback notification: $message"
        # In a real implementation, this would integrate with Slack, email, etc.
        # For now, we'll just log the notification
        echo "$(date): [$status] $message" >> "/tmp/rollback-notifications.log"
    fi
}

# Function to perform application rollback
rollback_application() {
    echo "🔄 Rolling back application deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would execute: flyctl rollback"
        return 0
    fi
    
    if flyctl rollback; then
        echo "✅ Application rollback successful"
        send_notification "Application rollback completed successfully" "SUCCESS"
        return 0
    else
        echo "❌ Application rollback failed"
        send_notification "Application rollback failed" "ERROR"
        return 1
    fi
}

# Function to perform migration rollback
rollback_migrations() {
    local steps="$1"
    echo "🔄 Rolling back $steps migration step(s)..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would execute: npm run migrate:down $steps"
        return 0
    fi
    
    if npm run migrate:down "$steps"; then
        echo "✅ Migration rollback successful"
        send_notification "Migration rollback of $steps steps completed" "SUCCESS"
        return 0
    else
        echo "❌ Migration rollback failed"
        send_notification "Migration rollback failed" "ERROR"
        return 1
    fi
}

# Function to restore database from backup
restore_database() {
    local backup_path="$1"
    
    if [[ ! -f "$backup_path" ]]; then
        echo "❌ Backup file not found: $backup_path"
        return 1
    fi
    
    echo "🔄 Restoring database from backup: $backup_path"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🔍 [DRY RUN] Would execute: mongorestore --uri=\"$MONGODB_URI\" --gzip --archive=\"$backup_path\" --drop"
        return 0
    fi
    
    # Confirm restoration for production
    if [[ "$ENVIRONMENT" == "production" && "$FORCE_ROLLBACK" != "true" ]]; then
        echo "⚠️  WARNING: About to restore production database from backup"
        echo "This will permanently replace all current data!"
        echo "Backup file: $backup_path"
        echo "Press Ctrl+C to cancel or any key to continue..."
        read -n 1 -s
    fi
    
    if mongorestore --uri="$MONGODB_URI" --gzip --archive="$backup_path" --drop; then
        echo "✅ Database restoration successful"
        send_notification "Database restored from backup: $backup_path" "SUCCESS"
        return 0
    else
        echo "❌ Database restoration failed"
        send_notification "Database restoration failed" "ERROR"
        return 1
    fi
}

# Function to validate environment and prerequisites
validate_prerequisites() {
    echo "🔍 Validating rollback prerequisites..."
    
    # Check required tools
    local missing_tools=()
    
    if ! command -v flyctl &> /dev/null; then
        missing_tools+=("flyctl")
    fi
    
    if ! command -v mongorestore &> /dev/null; then
        missing_tools+=("mongorestore")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        echo "❌ Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    # Check environment variables
    if [[ -z "${MONGODB_URI:-}" ]]; then
        echo "❌ MONGODB_URI environment variable is required"
        return 1
    fi
    
    echo "✅ Prerequisites validation passed"
    return 0
}

# Function to get current deployment status
get_deployment_status() {
    echo "📊 Checking current deployment status..."
    
    local app_healthy migration_accessible
    
    # Check application health
    if curl -sf "https://dnd-tracker.fly.dev/api/health" >/dev/null 2>&1; then
        echo "✅ Application is responsive"
        app_healthy="true"
    else
        echo "❌ Application is not responding"
        app_healthy="false"
    fi
    
    # Check migration status
    if npm run migrate:status >/dev/null 2>&1; then
        echo "✅ Migration system is accessible"
        migration_accessible="true"
    else
        echo "❌ Migration system is not accessible"
        migration_accessible="false"
    fi
    
    # Export for use by calling functions
    export APP_HEALTHY="$app_healthy"
    export MIGRATION_ACCESSIBLE="$migration_accessible"
}

# Main rollback logic
main() {
    echo "🚨 D&D Tracker Deployment Rollback Tool"
    echo "======================================"
    
    # Validate prerequisites
    if ! validate_prerequisites; then
        echo "❌ Prerequisites validation failed"
        exit 1
    fi
    
    # Get current status
    get_deployment_status
    
    # Send rollback start notification
    send_notification "Rollback process started for $ENVIRONMENT environment" "INFO"
    
    # Determine rollback strategy
    case "$ROLLBACK_TYPE" in
        "auto")
            echo "🤖 Automatic rollback strategy selected"
            
            # Try application rollback first
            if rollback_application; then
                echo "✅ Automatic rollback completed successfully"
                exit 0
            fi
            
            # If app rollback fails, try migration rollback
            echo "⚠️  Application rollback failed, attempting migration rollback..."
            if rollback_migrations "$MIGRATION_STEPS"; then
                echo "✅ Migration rollback completed"
                exit 0
            fi
            
            # If both fail and we have a backup, restore from backup
            if [[ -n "$BACKUP_PATH" ]]; then
                echo "⚠️  Migration rollback failed, attempting database restoration..."
                if restore_database "$BACKUP_PATH"; then
                    echo "✅ Database restoration completed"
                    exit 0
                fi
            fi
            
            echo "❌ All rollback attempts failed"
            send_notification "All rollback attempts failed for $ENVIRONMENT" "CRITICAL"
            exit 1
            ;;
            
        "app")
            echo "📱 Application-only rollback"
            if rollback_application; then
                exit 0
            else
                exit 1
            fi
            ;;
            
        "migration")
            echo "🗃️  Migration-only rollback"
            if rollback_migrations "$MIGRATION_STEPS"; then
                exit 0
            else
                exit 1
            fi
            ;;
            
        "database")
            echo "💾 Database restoration rollback"
            if [[ -z "$BACKUP_PATH" ]]; then
                echo "❌ BACKUP_PATH is required for database rollback"
                exit 1
            fi
            
            if restore_database "$BACKUP_PATH"; then
                exit 0
            else
                exit 1
            fi
            ;;
            
        *)
            echo "❌ Invalid rollback type: $ROLLBACK_TYPE"
            echo "Valid options: auto, app, migration, database"
            exit 1
            ;;
    esac
}

# Error handling
trap 'echo "❌ Rollback script failed with error"; send_notification "Rollback script encountered an error" "ERROR"; exit 1' ERR

# Help message
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_ENV              Environment (staging, production) [default: staging]"
    echo "  ROLLBACK_TYPE           Type of rollback (auto, app, migration, database) [default: auto]"
    echo "  BACKUP_PATH             Path to backup file for database rollback"
    echo "  MIGRATION_STEPS         Number of migration steps to rollback [default: 1]"
    echo "  ROLLBACK_DRY_RUN        Dry run mode (true/false) [default: false]"
    echo "  FORCE_ROLLBACK          Skip confirmations (true/false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  ROLLBACK_TYPE=app $0                    # Rollback application only"
    echo "  ROLLBACK_TYPE=migration MIGRATION_STEPS=3 $0  # Rollback 3 migrations"
    echo "  ROLLBACK_TYPE=database BACKUP_PATH=/path/to/backup.gz $0  # Restore from backup"
    echo "  ROLLBACK_DRY_RUN=true $0               # Dry run of automatic rollback"
    exit 0
fi

# Execute main function
main "$@"