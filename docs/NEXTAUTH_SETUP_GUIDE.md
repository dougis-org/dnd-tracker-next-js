# NextAuth.js Setup Guide for D&D Encounter Tracker

This document provides comprehensive instructions for setting up NextAuth.js authentication in the D&D Encounter Tracker
application across three deployment environments.

## Current Implementation Status

### ✅ Completed Components

The following NextAuth.js components are already implemented:

#### Core Authentication Configuration

- **NextAuth.js v5 (beta.29)** - Latest version with enhanced security
- **MongoDB Adapter** - Database session storage with MongoDB Atlas
- **Credentials Provider** - Email/password authentication
- **Custom Session Management** - 30-day sessions with subscription tier tracking
- **JWT Configuration** - Enhanced token handling with user data

#### API Routes

- **Main Auth Handler**: `/src/app/api/auth/[...nextauth]/route.ts`
- **User Registration**: `/src/app/api/auth/register/route.ts`
- **Email Verification**: `/src/app/api/auth/verify-email/route.ts`
- **Password Reset Request**: `/src/app/api/auth/reset-password-request/route.ts`
- **Password Reset**: `/src/app/api/auth/reset-password/route.ts`
- **Resend Verification**: `/src/app/api/auth/resend-verification/route.ts`

#### UI Components

- **Sign In Page**: `/src/app/(auth)/signin/page.tsx`
- **Sign Up Page**: `/src/app/(auth)/signup/page.tsx`
- **Error Page**: `/src/app/(auth)/error/page.tsx`
- **Password Reset Pages**: Reset request and token-based reset forms
- **Email Verification Page**: `/src/app/(auth)/verify-email/page.tsx`

#### Middleware & Security

- **Route Protection**: `/src/middleware.ts` - Protects dashboard and API routes
- **Session Provider**: `/src/components/providers/SessionProvider.tsx`
- **Authentication Utilities**: `/src/lib/middleware.ts` - API authentication helpers
- **Type Definitions**: `/src/types/next-auth.d.ts` - Enhanced session types

#### Testing Infrastructure

- **Comprehensive Test Suite**: 32+ authentication tests
- **Mock Configuration**: NextAuth.js mocking for tests
- **Test Coverage**: 88%+ coverage for authentication flows

### 🔧 Environment Configuration Required

## Environment Setup

### 1. Local Development Environment

#### Required Environment Variables

Create or update `.env.local` with the following variables:

```bash
# Basic Configuration
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-nextauth-secret-key-here

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=dnd-tracker-dev

# Optional OAuth Providers (if implementing social login)
# GITHUB_ID=your-github-client-id
# GITHUB_SECRET=your-github-client-secret
# GOOGLE_ID=your-google-client-id
# GOOGLE_SECRET=your-google-client-secret

# Optional Email Configuration (for password reset emails)
# EMAIL_SERVER_HOST=smtp.gmail.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=your-email@gmail.com
# EMAIL_SERVER_PASSWORD=your-app-password
# EMAIL_FROM=noreply@dndtracker.com
```

#### Local Docker Setup

The project includes `Dockerfile-local` for containerized local development:

```bash
# Build local Docker image
docker build -f Dockerfile-local -t dnd-tracker-local .

# Run with environment variables
docker run -p 3000:3000 --env-file .env.local dnd-tracker-local
```

### 2. Alpha Environment (Fly.io)

#### Fly.io Configuration

The project is configured for Fly.io deployment with `fly.toml`:

```toml
app = 'dnd-tracker-next-js'
primary_region = 'sea'

[http_service]
  internal_port = 3000
  force_https = true
```

#### Required Environment Variables for Alpha

Set these secrets in Fly.io:

```bash
# Set Fly.io secrets
fly secrets set NEXTAUTH_URL=https://your-alpha-app.fly.dev
fly secrets set NEXTAUTH_SECRET=your-production-grade-secret-key
fly secrets set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
fly secrets set MONGODB_DB_NAME=dnd-tracker-alpha
fly secrets set NODE_ENV=production

# Optional: Email configuration
fly secrets set EMAIL_SERVER_HOST=smtp.gmail.com
fly secrets set EMAIL_SERVER_PORT=587
fly secrets set EMAIL_SERVER_USER=your-email@gmail.com
fly secrets set EMAIL_SERVER_PASSWORD=your-app-password
fly secrets set EMAIL_FROM=noreply@dndtracker.com
```

#### Alpha Deployment Commands

```bash
# Deploy to Fly.io
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### 3. Production Environment

#### Environment Variables for Production

```bash
# Production Configuration
NEXTAUTH_URL=https://dndtracker.com
NEXTAUTH_SECRET=highly-secure-production-secret-key
NODE_ENV=production

# Production Database
MONGODB_URI=mongodb+srv://prod-user:secure-password@prod-cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=dnd-tracker-prod

# Production Email Service
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@dndtracker.com

# Optional: Analytics and Monitoring
# SENTRY_DSN=your-sentry-dsn
# GOOGLE_ANALYTICS_ID=your-ga4-id
```

## Manual Setup Steps Required

### 1. Generate Secure Secrets

#### NextAuth Secret Generation

```bash
# Generate a secure random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Critical**: Use different secrets for each environment!

### 2. MongoDB Atlas Configuration

#### Database Setup Steps

1. **Create MongoDB Atlas Account**: [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Create Clusters**:
   - Development: `dnd-tracker-dev`
   - Alpha: `dnd-tracker-alpha`
   - Production: `dnd-tracker-prod`

3. **Configure Network Access**:
   - Development: Add your IP address
   - Alpha: Add Fly.io IP ranges or use `0.0.0.0/0` (less secure)
   - Production: Restrict to production server IPs

4. **Create Database Users**:

   ```javascript
   // Development user
   {
     username: "dnd-dev-user",
     password: "secure-dev-password",
     roles: ["readWrite"],
     database: "dnd-tracker-dev"
   }

   // Production user (more restricted)
   {
     username: "dnd-prod-user",
     password: "highly-secure-prod-password",
     roles: ["readWrite"],
     database: "dnd-tracker-prod"
   }
   ```

5. **Connection Strings**:

   ```bash
   # Development
   mongodb+srv://dnd-dev-user:password@dev-cluster.mongodb.net/dnd-tracker-dev?retryWrites=true&w=majority

   # Production
   mongodb+srv://dnd-prod-user:password@prod-cluster.mongodb.net/dnd-tracker-prod?retryWrites=true&w=majority
   ```

### 3. Optional: OAuth Provider Setup

#### GitHub OAuth Application

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App:
   - **Application name**: "D&D Encounter Tracker (Dev/Alpha/Prod)"
   - **Homepage URL**: Your application URL
   - **Authorization callback URL**: `{NEXTAUTH_URL}/api/auth/callback/github`
3. Save Client ID and Client Secret to environment variables

#### Google OAuth Setup

1. Go to Google Cloud Console
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Authorized redirect URIs**: `{NEXTAUTH_URL}/api/auth/callback/google`
5. Save Client ID and Client Secret

### 4. Email Service Configuration

#### Development: Gmail App Passwords

1. Enable 2FA on Gmail account
2. Generate App Password: Account > Security > App passwords
3. Use app password as `EMAIL_SERVER_PASSWORD`

#### Production: SendGrid Setup

1. Create SendGrid account: [SendGrid](https://sendgrid.com/)
2. Create API key with Mail Send permissions
3. Add sender authentication (domain or single sender)
4. Use API key as `EMAIL_SERVER_PASSWORD`

## Deployment Verification

### Authentication Flow Testing

After deployment, verify these authentication flows work:

1. **User Registration**:

   ```bash
   curl -X POST https://your-domain.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass","firstName":"Test","lastName":"User"}'
   ```

2. **Sign In**:
   - Visit `/auth/signin`
   - Enter credentials
   - Verify redirect to dashboard

3. **Password Reset**:
   - Visit `/reset-password`
   - Enter email
   - Check email for reset link
   - Complete password reset

4. **Protected Routes**:
   - Try accessing `/dashboard` without authentication
   - Verify redirect to sign-in
   - Sign in and verify access

### Session Verification

Check that sessions are properly stored:

```javascript
// In MongoDB Atlas, verify collections exist:
// - accounts
// - sessions
// - users
// - verification_tokens
```

## Security Considerations

### Production Security Checklist

- [ ] **NEXTAUTH_SECRET**: Unique, 32+ character random string
- [ ] **HTTPS**: Enforce HTTPS in production (`force_https = true`)
- [ ] **Database Access**: Restrict MongoDB network access to production IPs
- [ ] **Environment Variables**: Never commit secrets to repository
- [ ] **Password Policies**: Strong password requirements implemented
- [ ] **Session Security**: 30-day expiration with secure token handling
- [ ] **CSRF Protection**: Enabled by default in NextAuth.js
- [ ] **Rate Limiting**: Consider implementing for auth endpoints

### Database Security

```javascript
// MongoDB user permissions (production)
{
  "roles": [
    {
      "role": "readWrite",
      "db": "dnd-tracker-prod"
    }
  ],
  "authenticationRestrictions": [
    {
      "clientSource": ["production-server-ip/32"]
    }
  ]
}
```

## Troubleshooting Common Issues

### 1. "NextAuth.js Error: Invalid JWT"

**Cause**: Missing or incorrect `NEXTAUTH_SECRET`

**Solution**:

```bash
# Generate new secret
openssl rand -base64 32

# Update environment variable
NEXTAUTH_SECRET=your-new-secret
```

### 2. Database Connection Errors

**Cause**: MongoDB connection string or network access issues

**Solution**:

- Verify MongoDB Atlas network access settings
- Check connection string format
- Ensure database user has correct permissions

### 3. OAuth Redirect Errors

**Cause**: Incorrect callback URLs in OAuth provider settings

**Solution**:

- Verify callback URL format: `{NEXTAUTH_URL}/api/auth/callback/{provider}`
- Ensure `NEXTAUTH_URL` matches your domain exactly

### 4. Email Not Sending

**Cause**: Incorrect email server configuration

**Solution**:

- Verify SMTP settings
- Check authentication credentials
- Test email service separately

## Advanced Configuration

### Custom Session Handling

The application implements custom session callbacks for subscription tier tracking:

```typescript
// src/lib/auth.ts
callbacks: {
  async session({ session, user }) {
    if (session?.user && user) {
      session.user.id = user.id;
      session.user.subscriptionTier = user.subscriptionTier || 'free';
    }
    return session;
  }
}
```

### API Route Protection

All protected API routes use middleware for authentication:

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}
```

## Implementation Status Summary

| Component | Status | Environment Support |
|-----------|--------|-------------------|
| Core NextAuth Config | ✅ Complete | All |
| Credentials Provider | ✅ Complete | All |
| MongoDB Adapter | ✅ Complete | All |
| Session Management | ✅ Complete | All |
| Route Protection | ✅ Complete | All |
| UI Components | ✅ Complete | All |
| Email Verification | ✅ Complete | Setup Required |
| Password Reset | ✅ Complete | Setup Required |
| OAuth Providers | ⚠️ Optional | Setup Required |
| Docker Support | ✅ Complete | Local/Alpha |
| Fly.io Configuration | ✅ Complete | Alpha |
| Production Deployment | ⚠️ Ready | Setup Required |

## Next Steps

1. **Set up environment variables** for each deployment environment
2. **Configure MongoDB Atlas** clusters and users
3. **Generate secure secrets** for each environment
4. **Set up email service** for password reset functionality
5. **Configure OAuth providers** (optional)
6. **Deploy and test** authentication flows
7. **Monitor and optimize** session performance

For questions or issues, refer to the [NextAuth.js documentation](https://next-auth.js.org/) or create an issue in the
project repository.
