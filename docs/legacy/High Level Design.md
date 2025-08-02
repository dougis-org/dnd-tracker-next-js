# High Level Design Document (HLD)

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
- Party composition templates
- Multi-class support

## 3. Database Design

### 3.1 MongoDB Schema Design

#### **Users Collection**

```typescript
interface User {
  _id: ObjectId;
  email: string;
  name: string;
  image?: string;
  subscription: {
    tier: 'free' | 'seasoned' | 'expert' | 'master' | 'guild';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status: 'active' | 'inactive' | 'cancelled';
    currentPeriodEnd?: Date;
  };
  usage: {
    parties: number;
    encounters: number;
    creatures: number;
  };
  preferences: {
    theme: 'light' | 'dark';
    autoRollInitiative: boolean;
    showDexterityTiebreaker: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### **Characters Collection**

```typescript
interface Character {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  race: string;
  classes: {
    name: string;
    level: number;
  }[];
  stats: {
    dexterity: number;
    armorClass: number;
    maxHitPoints: number;
    currentHitPoints: number;
    initiativeModifier: number;
  };
  playerName?: string;
  playerEmail?: string;
  isNPC: boolean;
  template?: ObjectId; // Reference to saved templates
  createdAt: Date;
  updatedAt: Date;
}
```

#### **Encounters Collection**

```typescript
interface Encounter {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  description?: string;
  participants: {
    characterId: ObjectId;
    initiative?: number;
    currentHitPoints: number;
    statusEffects: {
      name: string;
      duration: number;
      description?: string;
    }[];
    legendaryActions?: {
      total: number;
      used: number;
      actions: string[];
    };
    lairActions?: {
      description: string;
      environmentalEffects: string[];
      triggers: string[];
    };
  }[];
  combatState: {
    isActive: boolean;
    currentTurn: number;
    currentRound: number;
    turnOrder: ObjectId[];
  };
  settings: {
    autoRollInitiative: boolean;
    showPrivateHP: boolean;
    enableLairActions: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### **Parties Collection**

```typescript
interface Party {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  description?: string;
  members: ObjectId[]; // Character references
  templates: {
    name: string;
    memberIds: ObjectId[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Database Indexing Strategy

```javascript
// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ 'subscription.stripeCustomerId': 1 });

// Characters collection indexes
db.characters.createIndex({ userId: 1 });
db.characters.createIndex({ userId: 1, isNPC: 1 });

// Encounters collection indexes
db.encounters.createIndex({ userId: 1 });
db.encounters.createIndex({ userId: 1, 'combatState.isActive': 1 });

// Parties collection indexes
db.parties.createIndex({ userId: 1 });
```

## 4. API Design

### 4.1 REST API Endpoints

#### **Authentication Routes**

```text
POST   /api/auth/signin           # NextAuth.js sign in
POST   /api/auth/signout          # NextAuth.js sign out
GET    /api/auth/session          # Get current session
```

#### **User Management Routes**

```text
GET    /api/user/profile          # Get user profile
PUT    /api/user/profile          # Update user profile
GET    /api/user/subscription     # Get subscription details
POST   /api/user/subscription     # Create/update subscription
DELETE /api/user/account          # Delete user account
```

#### **Party Management Routes**

text
GET /api/parties # List user parties
POST /api/parties # Create new party
GET /api/parties/[id] # Get party details
PUT /api/parties/[id] # Update party
DELETE /api/parties/[id] # Delete party

```text

#### **Character Management Routes**

```

GET /api/characters # List user characters
POST /api/characters # Create new character
GET /api/characters/[id] # Get character details
PUT /api/characters/[id] # Update character
DELETE /api/characters/[id] # Delete character
POST /api/characters/import # Import from external sources

```text

#### **Encounter Management Routes**

```

GET /api/encounters # List user encounters
POST /api/encounters # Create new encounter
GET /api/encounters/[id] # Get encounter details
PUT /api/encounters/[id] # Update encounter
DELETE /api/encounters/[id] # Delete encounter
POST /api/encounters/[id]/start # Start combat
POST /api/encounters/[id]/end # End combat

```text

#### **Combat Management Routes**

```

POST /api/combat/[id]/initiative # Roll/set initiative
POST /api/combat/[id]/next-turn # Advance to next turn
POST /api/combat/[id]/damage # Apply damage/healing
POST /api/combat/[id]/status # Add/remove status effects
POST /api/combat/[id]/legendary # Use legendary action
POST /api/combat/[id]/lair # Trigger lair action
GET /api/combat/[id]/log # Get combat log

```text

#### **Payment Routes**

```

POST /api/stripe/create-session # Create checkout session
POST /api/stripe/portal-session # Customer portal session
POST /api/webhooks/stripe # Stripe webhook handler

````text

### 4.2 Real-time Updates

```typescript
// Pusher/Socket.IO events for live collaboration
interface CombatEvents {
  'initiative-updated': { encounterId: string; turnOrder: string[] };
  'damage-applied': { encounterId: string; characterId: string; hp: number };
  'turn-advanced': { encounterId: string; currentTurn: number; round: number };
  'status-changed': {
    encounterId: string;
    characterId: string;
    effects: StatusEffect[];
  };
  'lair-action-triggered': { encounterId: string; description: string };
}
````

## 5. Authentication & Authorization

### 5.1 Authentication Flow

```typescript
// NextAuth.js configuration
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      // Email/password authentication
    }),
    GoogleProvider({
      // Google OAuth integration
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    session: async ({ session, user }) => {
      // Add user subscription data to session
      return session;
    },
  },
};
```

### 5.2 Authorization Middleware

```typescript
// Subscription-based access control
export async function withAuth(
  handler: NextApiHandler,
  requiredTier: SubscriptionTier = 'free'
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserWithSubscription(session.user.id);

    if (!hasAccess(user.subscription.tier, requiredTier)) {
      return res.status(403).json({ error: 'Insufficient subscription' });
    }

    return handler(req, res);
  };
}
```

### 5.3 Usage Limits Enforcement

```typescript
// Usage tracking middleware
export async function checkUsageLimits(
  userId: string,
  resourceType: 'parties' | 'encounters' | 'creatures',
  operation: 'create' | 'read'
) {
  const user = await User.findById(userId);
  const limits = getSubscriptionLimits(user.subscription.tier);

  if (
    operation === 'create' &&
    user.usage[resourceType] >= limits[resourceType]
  ) {
    throw new Error(
      `${resourceType} limit exceeded for ${user.subscription.tier} tier`
    );
  }

  return true;
}
```

## 6. Implementation Phases

### 6.1 Phase 1: Foundation (Weeks 1-4)

**Goal**: Basic project setup and core authentication

#### Week 1: Project Initialization

- [ ] Next.js 15 project setup with TypeScript
- [ ] Tailwind CSS and shadcn/ui configuration
- [ ] MongoDB Atlas cluster setup
- [ ] Basic project structure and routing

#### Week 2: Authentication System

- [ ] NextAuth.js configuration with MongoDB adapter
- [ ] User registration and login flows
- [ ] Email/password authentication
- [ ] Session management and middleware

#### Week 3: Database Foundation

- [ ] Mongoose schema definitions
- [ ] Database connection and configuration
- [ ] Basic CRUD operations for users
- [ ] Data validation with Zod

#### Week 4: UI Foundation

- [ ] Layout components and navigation
- [ ] Basic form components
- [ ] Responsive design implementation
- [ ] Dark/light theme support

### 6.2 Phase 2: Core Features (Weeks 5-8)

**Goal**: Character and party management

#### Week 5: Character Management

- [ ] Character creation forms
- [ ] Character list and detail views
- [ ] Multi-class support implementation
- [ ] Character templates system

#### Week 6: Party Management

- [ ] Party creation and management
- [ ] Member assignment interface
- [ ] Party composition templates
- [ ] Import/export functionality

#### Week 7: Basic Encounter System

- [ ] Encounter creation interface
- [ ] Participant management
- [ ] Basic initiative tracking
- [ ] Turn order calculation

#### Week 8: Combat Tracker MVP

- [ ] Initiative order display
- [ ] HP tracking interface
- [ ] Basic turn advancement
- [ ] Damage application

### 6.3 Phase 3: Advanced Combat (Weeks 9-12)

**Goal**: Full combat feature set

#### Week 9: Status Effects

- [ ] Status effect management
- [ ] Duration tracking
- [ ] Automatic expiration
- [ ] Effect descriptions and icons

#### Week 10: Legendary Actions

- [ ] Legendary action counter
- [ ] Action descriptions
- [ ] Usage tracking per turn
- [ ] Reset mechanics

#### Week 11: Lair Actions

- [ ] Initiative count 20 triggers
- [ ] Environmental effect descriptions
- [ ] Lair action configuration
- [ ] Visual indicators and prompts

#### Week 12: Combat Polish

- [ ] Combat log implementation
- [ ] Undo/redo functionality
- [ ] Keyboard shortcuts
- [ ] Performance optimization

### 6.4 Phase 4: Monetization (Weeks 13-16)

**Goal**: Subscription system and payment processing

#### Week 13: Stripe Integration

- [ ] Stripe configuration and webhooks
- [ ] Subscription plan setup
- [ ] Payment flow implementation
- [ ] Customer portal integration

#### Week 14: Usage Limits

- [ ] Subscription tier enforcement
- [ ] Usage tracking implementation
- [ ] Limit warnings and prompts
- [ ] Upgrade flow UX

#### Week 15: Premium Features

- [ ] Cloud sync implementation
- [ ] Export functionality (PDF/JSON)
- [ ] Advanced combat logging
- [ ] Custom themes

#### Week 16: Billing & Support

- [ ] Billing dashboard
- [ ] Subscription management
- [ ] Customer support integration
- [ ] Payment failure handling

## 7. Technical Considerations

### 7.1 Performance Optimization

- **Server Components**: Use React Server Components for static content
- **Edge Runtime**: Deploy API routes to edge for global performance
- **Database Optimization**: Implement proper indexing and query optimization
- **Caching Strategy**: Leverage Next.js caching and Vercel Edge Network
- **Bundle Optimization**: Code splitting and lazy loading for large components

### 7.2 Security Implementation

- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Prevention**: Mongoose ODM with parameterized queries
- **XSS Protection**: Next.js built-in security headers
- **CSRF Protection**: NextAuth.js CSRF tokens
- **Rate Limiting**: API route protection against abuse

### 7.3 Scalability Considerations

- **Database Sharding**: Plan for horizontal scaling with MongoDB
- **Serverless Architecture**: Stateless functions for auto-scaling
- **CDN Usage**: Static asset optimization with Vercel Edge Network
- **Connection Pooling**: Efficient database connection management
- **Background Jobs**: Implement for heavy operations (exports, analytics)

### 7.4 Monitoring & Observability

- **Error Tracking**: Sentry integration for production monitoring
- **Performance Monitoring**: Vercel Analytics and Speed Insights
- **Business Metrics**: Stripe Analytics for subscription insights
- **User Analytics**: Privacy-compliant user behavior tracking
- **Health Checks**: API endpoint monitoring and alerting

### 7.5 Testing Strategy

- **Unit Tests**: Jest and React Testing Library for components
- **Integration Tests**: API route testing with test database
- **E2E Tests**: Playwright for critical user flows
- **Component Tests**: Storybook for UI component development
- **Performance Tests**: Lighthouse CI for web vitals monitoring

## 8. Deployment & DevOps

### 8.1 Environment Setup

```typescript
// Environment configuration
interface EnvironmentConfig {
  development: {
    database: 'mongodb://localhost:27017/dnd-tracker-dev';
    stripe: 'test_keys';
    nextauth: 'http://localhost:3000';
  };
  preview: {
    database: 'mongodb+srv://preview-cluster';
    stripe: 'test_keys';
    nextauth: 'https://preview-branch.vercel.app';
  };
  production: {
    database: 'mongodb+srv://production-cluster';
    stripe: 'live_keys';
    nextauth: 'https://dnd-tracker.com';
  };
}
```

### 8.2 CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy to Vercel
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  deploy:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
```

### 8.3 Production Checklist

- [ ] Environment variables configured
- [ ] Database backups automated
- [ ] SSL certificates configured
- [ ] CDN setup and tested
- [ ] Monitoring alerts configured
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Security headers validated

This High Level Design provides a comprehensive roadmap for implementing the D&D
Encounter Tracker, ensuring scalability, maintainability, and adherence to modern
development practices.
