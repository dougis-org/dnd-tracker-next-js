# Fly.io Authentication Configuration

This document outlines the required environment variables and configuration for the custom authentication system to work properly in production on Fly.io.

## Required Environment Variables

### MongoDB Configuration
```bash
# MongoDB connection string for session storage
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Database name for sessions and user data
MONGODB_DB_NAME=dnd_tracker_prod
```

### Session Security
```bash
# Session encryption/signing secrets (generate random 32+ character strings)
SESSION_SECRET=your-super-secret-session-key-32-chars-minimum

# Production environment marker
NODE_ENV=production
```

### Application URLs
```bash
# Primary application URL for redirects and CORS
APP_URL=https://your-app.fly.dev

# Additional trusted origins for auth (comma-separated)
TRUSTED_ORIGINS=your-app.fly.dev,dndtracker.com,www.dndtracker.com
```

## Fly.io Specific Configuration

### Setting Environment Variables with flyctl

```bash
# Set MongoDB configuration
flyctl secrets set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/dbname"
flyctl secrets set MONGODB_DB_NAME="dnd_tracker_prod"

# Set session security
flyctl secrets set SESSION_SECRET="$(openssl rand -base64 32)"

# Set application URLs
flyctl secrets set APP_URL="https://your-app.fly.dev"
flyctl secrets set TRUSTED_ORIGINS="your-app.fly.dev,dndtracker.com,www.dndtracker.com"

# Ensure production environment
flyctl secrets set NODE_ENV="production"
```

### fly.toml Configuration

Ensure your `fly.toml` includes proper health checks and environment settings:

```toml
app = "your-app-name"
primary_region = "iad"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  interval = "15s"
  grace_period = "5s"
  method = "GET"
  path = "/api/health"
  protocol = "http"
  timeout = "10s"
  tls_skip_verify = false

[env]
  NODE_ENV = "production"
  PORT = "3000"
```

## Authentication Flow in Production

1. **Session Creation**: User signs in → MongoDB session created → Secure HTTP-only cookie set
2. **Middleware Validation**: Each request → Cookie extracted → Session format validated → Request allowed/blocked
3. **API Route Validation**: Protected APIs → Session queried from MongoDB → User data returned
4. **Session Cleanup**: Expired sessions automatically removed via MongoDB TTL indexes

## Security Considerations

### Cookie Security
- Secure flag enabled in production (HTTPS required)
- HttpOnly flag prevents XSS attacks
- SameSite=Strict for CSRF protection

### Origin Validation
- Only trusted origins can make authenticated requests
- Configurable via TRUSTED_ORIGINS environment variable

### Session Management
- MongoDB TTL indexes automatically clean expired sessions
- Session IDs are cryptographically secure (32+ character hex)
- Sessions expire after 24 hours (or 30 days with "Remember Me")

## Monitoring and Debugging

### Health Check Endpoint
The `/api/health` endpoint can be used to verify MongoDB connectivity:

```bash
curl https://your-app.fly.dev/api/health
```

### Session Validation Endpoint
Test authentication with:

```bash
curl -H "Cookie: session=your-session-id" https://your-app.fly.dev/api/auth/session
```

### Logs and Debugging
Monitor authentication issues with:

```bash
flyctl logs
```

Look for:
- `Auth middleware error` - Middleware issues
- `Session validation error` - Database connectivity issues  
- `Invalid origin` - CORS/origin validation problems

## Migration from NextAuth

This system replaces NextAuth.js with:
- Custom middleware for route protection
- MongoDB-based session storage
- Edge Runtime compatible architecture
- Simplified authentication flow

All existing authentication state management has been updated to work with the new system through compatibility layers.

## Troubleshooting

### Common Issues

1. **Sessions not persisting**
   - Check MONGODB_URI connectivity
   - Verify SESSION_SECRET is set
   - Ensure cookies are being set (check browser dev tools)

2. **Authentication redirects failing**
   - Verify APP_URL matches actual domain
   - Check TRUSTED_ORIGINS includes all relevant domains
   - Ensure HTTPS is working properly

3. **API routes returning 401**
   - Check session format validation
   - Verify MongoDB connection
   - Monitor session expiration times

4. **Development vs Production differences**
   - Ensure NODE_ENV=production in Fly.io
   - Verify all secrets are set correctly
   - Check HTTPS certificate validity