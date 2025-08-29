# Technical Architecture Document

**Project:** D&D Encounter Tracker Web App
**Version:** 1.0
**Date:** June 8, 2025
**Architecture:** Next.js 15 Full-Stack Application

## 1. System Architecture Overview

### 1.1 Architecture Pattern

- **Pattern**: Full-stack monolithic application with serverless deployment
- **Framework**: Next.js 15 with App Router providing both frontend and backend
- **Deployment**: Vercel serverless functions with edge optimization
- **Database**: MongoDB Atlas with global clusters for performance

### 1.2 High-Level System Diagram

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Next.js App   │    │   External      │
│                 │    │                 │    │   Services      │
│ - React UI      │◄──►│ - Server Comp.  │◄──►│ - MongoDB Atlas │
│ - Client Comp.  │    │ - API Routes    │    │ - Stripe        │
│ - State Mgmt    │    │ - Middleware    │    │ - NextAuth      │
│ - Form Handling │    │ - Auth Logic    │    │ - Vercel Blob   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.3 Core Components

1. **Frontend Layer**: React components (Server + Client)
2. **API Layer**: Next.js API routes and Server Actions
3. **Authentication Layer**: NextAuth.js with MongoDB sessions
4. **Data Layer**: MongoDB with Mongoose ODM
5. **Payment Layer**: Stripe integration for subscriptions
6. **File Storage**: Vercel Blob for user uploads

### 1.4 Technology Stack

For a comprehensive inventory of all technologies, frameworks, libraries, and development tools used in this
project, including current versions, latest stable versions, and upgrade recommendations, see:

**📋 [Technology Stack Documentation](./TECH-STACK.md)**

The technology stack document provides:
- Complete dependency inventory with version tracking
- Security and upgrade recommendations
- Development tool configurations
- Package management and maintenance procedures
- Environment-specific version requirements

## 2. Component Architecture

### 2.1 Frontend Components Structure

```text
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Protected route group
│   │   ├── parties/
│   │   ├── encounters/
│   │   ├── combat/
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── parties/
│   │   ├── encounters/
│   │   ├── combat/
│   │   └── webhooks/
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   ├── forms/                    # Form components
│   ├── combat/                   # Combat-specific components
│   └── layout/                   # Layout components
├── lib/                          # Utilities and configurations
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Database connection
│   ├── stripe.ts                 # Stripe configuration
│   └── utils.ts                  # Utility functions
└── types/                        # TypeScript definitions
    ├── auth.ts
    ├── character.ts
    ├── encounter.ts
    └── subscription.ts
```

### 2.2 Key Component Responsibilities

#### **Combat Tracker Component**

- Initiative order management
- Turn progression logic
- HP/AC tracking interface
- Status effect indicators
- Legendary and lair action triggers

#### **Encounter Builder Component**

- Drag-and-drop creature addition
- CR calculation and balancing
- Template saving/loading
- Import/export functionality

#### **Party Manager Component**

- Character creation/editing
- Player assignment
- Party template management
- Multiclass support handling

#### **Subscription Manager Component**

- Tier enforcement logic
- Usage limit tracking
- Upgrade/downgrade flows
- Billing integration

## 3. Database Design (MongoDB)

### 3.1 User Schema

```javascript
{
  _id: ObjectId,
  email: String (unique),
  emailVerified: Date,
  name: String,
  subscription: {
    tier: String, // 'free', 'seasoned', 'expert', 'master', 'guild'
    status: String, // 'active', 'canceled', 'past_due'
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date
  },
  usage: {
    parties: Number,
    encounters: Number,
    creatures: Number
  },
  preferences: {
    theme: String,
    notifications: Boolean,
    autoBackup: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 Character Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  race: String,
  classes: [{
    name: String,
    level: Number
  }],
  stats: {
    strength: Number,
    dexterity: Number,
    constitution: Number,
    intelligence: Number,
    wisdom: Number,
    charisma: Number
  },
  combat: {
    ac: Number,
    maxHp: Number,
    currentHp: Number,
    initiativeModifier: Number,
    speed: Number
  },
  playerName: String,
  isNPC: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 Encounter Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,
  description: String,
  participants: [{
    characterId: ObjectId,
    isPlayerCharacter: Boolean,
    quantity: Number // For multiple identical NPCs
  }],
  environment: {
    name: String,
    description: String,
    lairActions: [{
      initiative: Number, // Usually 20
      description: String,
      automated: Boolean
    }],
    hazards: [String]
  },
  difficulty: {
    calculatedCR: Number,
    partyLevel: Number,
    balanceRating: String // 'easy', 'medium', 'hard', 'deadly'
  },
  status: String, // 'draft', 'active', 'completed'
  createdAt: Date,
  updatedAt: Date
}
```

### 3.4 Combat Session Schema

```javascript
{
  _id: ObjectId,
  encounterId: ObjectId,
  userId: ObjectId,
  state: {
    round: Number,
    currentTurn: Number,
    initiative: [{
      characterId: ObjectId,
      name: String,
      initiative: Number,
      dexterity: Number,
      currentHp: Number,
      maxHp: Number,
      ac: Number,
      statusEffects: [{
        name: String,
        description: String,
        duration: Number, // rounds remaining
        concentration: Boolean
      }],
      legendaryActions: {
        total: Number,
        remaining: Number,
        actions: [String]
      }
    }],
    lairActions: {
      triggered: [Number], // Which rounds lair actions were used
      nextTrigger: Number,  // Next round for lair action
      available: Boolean
    }
  },
  log: [{
    round: Number,
    action: String,
    target: String,
    details: Object,
    timestamp: Date
  }],
  startedAt: Date,
  completedAt: Date
}
```

## 4. API Design

### 4.1 Authentication Endpoints

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/verify-email
POST /api/auth/reset-password
GET  /api/auth/session
```

### 4.2 User Management

```text
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/usage
PUT    /api/users/preferences
DELETE /api/users/account
```

### 4.3 Character Management

```text
GET    /api/characters
POST   /api/characters
GET    /api/characters/:id
PUT    /api/characters/:id
DELETE /api/characters/:id
POST   /api/characters/import
```

### 4.4 Encounter Management

```text
GET    /api/encounters
POST   /api/encounters
GET    /api/encounters/:id
PUT    /api/encounters/:id
DELETE /api/encounters/:id
POST   /api/encounters/:id/duplicate
GET    /api/encounters/:id/balance-check
```

### 4.5 Combat Management

```text
POST   /api/combat/start/:encounterId
GET    /api/combat/:sessionId
PUT    /api/combat/:sessionId/initiative
PUT    /api/combat/:sessionId/turn/next
PUT    /api/combat/:sessionId/turn/previous
PUT    /api/combat/:sessionId/damage
PUT    /api/combat/:sessionId/heal
PUT    /api/combat/:sessionId/status-effect
POST   /api/combat/:sessionId/lair-action
GET    /api/combat/:sessionId/log
POST   /api/combat/:sessionId/end
```

### 4.6 Subscription Management

```text
GET    /api/subscription/plans
POST   /api/subscription/checkout
POST   /api/subscription/portal
GET    /api/subscription/usage
POST   /api/webhooks/stripe
```

## 5. Security Architecture

### 5.1 Authentication Flow

1. **Registration**: Email verification required
2. **Login**: NextAuth.js with JWT strategy
3. **Session Management**: MongoDB session storage
4. **Password Security**: bcrypt hashing with salt rounds

### 5.2 Authorization Layers

1. **Route Protection**: Middleware checks for valid sessions
2. **Resource Authorization**: User ownership validation
3. **Subscription Enforcement**: Feature gating based on tier
4. **Rate Limiting**: API endpoint protection

### 5.3 Data Protection

- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Input Validation**: Zod schemas for all API inputs
- **Output Sanitization**: XSS prevention on all outputs
- **Database Security**: MongoDB connection encryption

## 6. Performance Optimization

### 6.1 Frontend Optimization

- **Code Splitting**: Route-based and component-based splitting
- **Image Optimization**: Next.js Image component with WebP
- **Static Generation**: Pre-rendered pages where possible
- **Client-Side Caching**: React Query for server state

### 6.2 Backend Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **API Caching**: Redis caching for frequently accessed data
- **Edge Functions**: Vercel Edge Runtime for low latency
- **CDN**: Global content delivery via Vercel Edge Network

### 6.3 Real-time Features

- **WebSocket Alternative**: Server-Sent Events for live updates
- **Optimistic Updates**: Client-side state updates before server confirmation
- **Conflict Resolution**: Last-write-wins with client reconciliation

## 7. Development Standards

### 7.1 Code Quality Configuration

#### ESLint Configuration Analysis

Our ESLint setup has been optimized to work harmoniously with Codacy static analysis:

**Resolved Conflicts:**

- Added `prettier` extension to ESLint config to disable conflicting
  formatting rules
- Removed `padded-blocks` and `indent` rules that conflicted with Prettier
- Maintained 2-space indentation consistency across all tools

**ESLint Rules Covered by Codacy:**

- `no-irregular-whitespace` - Error level detection
- `no-regex-spaces` - Warning level detection
- `no-multiple-empty-lines` - Formatting rules coverage
- `prefer-const` - ES6/best practice rules
- `no-var` - ES6 modernization rules
- `no-unused-vars` - Standard ESLint rules

**Custom ESLint Rules (Not covered by Codacy):**

- `eol-last` (Warning) - File consistency and Git diff cleanliness
- `padding-line-between-statements` (Warning) - Code readability
- `lines-between-class-members` (Error) - Class formatting
- `lines-around-comment` (Warning) - Comment formatting

**Tool Priority Order:**

1. **Codacy** - Primary static analysis and quality gates
2. **ESLint** - Code quality and custom project rules
3. **Prettier** - Code formatting (integrated with ESLint)

### 7.2 Testing Strategy

- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: API endpoint testing with MongoDB Memory Server
- **Component Tests**: React component testing with user interactions
- **E2E Tests**: Playwright for critical user workflows

### 7.3 Documentation Standards

- **API Documentation**: OpenAPI 3.0 specifications
- **Component Documentation**: JSDoc comments for all components
- **Architecture Decision Records**: Document significant technical decisions
- **Deployment Guides**: Environment setup and deployment procedures

## 8. Monitoring and Observability

### 8.1 Application Monitoring

- **Error Tracking**: Sentry for error collection and alerting
- **Performance Monitoring**: Vercel Analytics for Core Web Vitals
- **Uptime Monitoring**: Health check endpoints with alerting
- **User Analytics**: Privacy-compliant user behavior tracking

### 8.2 Business Intelligence

- **Usage Metrics**: Subscription tier utilization and feature adoption
- **Performance Metrics**: API response times and database query performance
- **User Experience**: Real User Monitoring (RUM) data collection
- **Revenue Tracking**: Subscription metrics and churn analysis

## 9. Deployment Architecture

### 9.1 Vercel Deployment

- **Production**: `main` branch auto-deployment
- **Preview**: Feature branch preview deployments
- **Environment Variables**: Secure configuration management
- **Edge Functions**: Global distribution for low latency

### 9.2 Database Management

- **MongoDB Atlas**: Multi-region clusters for high availability
- **Backup Strategy**: Automated daily backups with point-in-time recovery
- **Migration Strategy**: Custom scripts via API routes
- **Monitoring**: Atlas performance monitoring and alerting

### 9.3 CI/CD Pipeline

- **GitHub Actions**: Automated testing and quality checks
- **Quality Gates**: ESLint, TypeScript, Jest, and Codacy checks
- **Deployment Pipeline**: Automated deployment after successful tests
- **Rollback Strategy**: Instant rollback via Vercel dashboard

---

## Appendix: Source Documents

This consolidated Technical Architecture document was created from the
following legacy documents:

- `legacy/High Level Design.md` - Complete technical architecture and
  system design
- `legacy/High Level Design Document.md` - Earlier architecture version
  (superseded)
- `legacy/ESLint-Codacy-Configuration-Analysis.md` - Development standards
  and tool configuration

**Last Updated:** June 30, 2025
**Document Status:** Current and comprehensive
