# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a D&D Encounter Tracker,
a Next.js 15 full-stack web application for Dungeon Masters to manage combat encounters efficiently.
The project is currently in **active development** with 46 GitHub issues created for a 12-week MVP development timeline.

### Key Features

- Initiative tracking with dexterity tiebreakers
- HP/AC management with damage and healing tracking
- Character management (PCs and NPCs) with multiclass support
- Encounter building with participant organization
- Lair actions support (unique competitive advantage)
- Freemium subscription model with 5 pricing tiers

## Technology Stack

- **Frontend:** Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js v5 with MongoDB sessions
- **Deployment:** Vercel with GitHub Actions CI/CD
- **Testing:** Jest and React Testing Library

## Development Commands

```bash
# Project setup
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Core workflow commands (see primary CLAUDE.md for full workflow)
npm run lint:fix     # ESLint checking with automatic fixes
npm run test:ci      # Full test suite (required before PR)
npm run lint:markdown:fix # Markdown files only

# Development utilities
npm run format       # Prettier formatting
npm run format:check # Check Prettier formatting
npm run typecheck    # TypeScript compilation check
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Database operations (to be implemented)
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed development data
```

## Project-Specific Workflow Extensions

### Branch Naming Convention

- **Feature branches:** `feature/issue-{number}-{short-description}`
- **Bugfix branches:** `bugfix/issue-{number}-{short-description}`
- **Hotfix branches:** `hotfix/critical-{description}`

### PR Title Format

```
Issue: #{number} {Description}
```

### PR Body Template

```
CLOSES: #{number}

[Additional context as needed]
```

### Tab Title Convention

```
ISSUE#{number}-{Description}
```

## Architecture Overview

### Project Structure

```text
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Protected routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   ├── combat/            # Combat-specific components
│   └── layout/            # Navigation components
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # MongoDB connection
│   └── utils.ts           # Utility functions
└── types/                 # TypeScript definitions
```

### Database Schema (MongoDB)

- **Users:** Authentication, subscription tiers, preferences
- **Characters:** PCs and NPCs with full D&D 5e stats, multiclass support
- **Parties:** Character groupings with DM assignments
- **Encounters:** Combat scenarios with participants and settings
- **Combat Sessions:** Active combat state with initiative, turns, HP tracking

## Development Process

### Phase-Based Development (12 Weeks)

1. **Weeks 1-2:** Foundation (Next.js, MongoDB, UI setup)
2. **Weeks 3-4:** Authentication and core components
3. **Weeks 5-6:** Character management system
4. **Weeks 7-8:** Encounter management system
5. **Weeks 9-10:** Combat system core
6. **Weeks 11-12:** Advanced features and polish

### Issue Management

- **46 MVP issues** created with detailed specifications
- Issues tagged with week assignments (Phase 1-3)
- Dependencies mapped to prevent blocking
- Follow priority system: P1>P2, Phase1>Phase2, lower#

## Key Business Context

### Subscription Tiers (Freemium Model)

- **Free Adventurer:** $0/month (1 party, 3 encounters, 10 creatures)
- **Seasoned Adventurer:** $4.99/month (3 parties, 15 encounters, 50 creatures)
- **Expert Dungeon Master:** $9.99/month (10 parties, 50 encounters, 200 creatures)
- **Master of Dungeons:** $19.99/month (25 parties, 100 encounters, 500 creatures)
- **Guild Master:** $39.99/month (Unlimited + organization features)

### Competitive Advantages

- Modern, responsive UI optimized for mobile and desktop
- Lair actions support (unique vs. competitors like Roll20, D&D Beyond)
- Superior user experience with real-time collaboration
- Optimized for D&D 5e combat mechanics

## Documentation

All comprehensive project documentation is in the `docs/` folder:

- **[README.md](./docs/README.md):** Complete documentation index
- **[High Level Design.md](./docs/High%20Level%20Design.md):** Technical architecture
- **[12-Week MVP Development Phase Plan.md](./docs/12-Week%20MVP%20Development%20Phase%20Plan.md):** Development schedule
- **[Product Requirements Document.md](./docs/Product%20Requirements%20Document.md):** Business requirements
- **[QUICK REFERENCE FOR OTHER CHATS.md](./docs/QUICK%20REFERENCE%20FOR%20OTHER%20CHATS.md):** Quick orientation guide

Repository Summary
There is a repository summary file in the root folder named `repomix-output.xml`

If this file is missing, execute this command from the root of the project to build it `npx repomix --compress`

## Project-Specific Conventions

### Code Standards

- Follow Next.js 15 App Router patterns
- Use TypeScript strictly with proper type definitions
- Implement proper error handling and loading states
- Follow shadcn/ui component patterns for consistency
- Use Mongoose for all database operations
- TDD required for all new features

### Testing Strategy

- Unit tests for all utility functions and business logic
- Component tests for UI interactions
- Integration tests for API endpoints
- E2E tests for critical user workflows
- 80%+ test coverage on touched code

## Current Status

- ✅ **Phase 1 Foundation Complete:** All project setup and foundational work finished
- 🚀 **Active Development:** Foundation layer fully implemented, moving to Phase 2
- 📋 **Total Progress:** 13 of 46 MVP issues completed (28% complete)
- 📊 **Phase 1 Achievement:** 100% of foundation infrastructure completed

## Completed Work

### Phase 1: Project Foundation (100% Complete) ✅

#### **Week 1-2 - Core Infrastructure:**

- ✅ **Issues #2-9:** Next.js 15, TypeScript, MongoDB Atlas, development environment
- ✅ **Issues #5-7:** Tailwind CSS, shadcn/ui, design system
- ✅ **Issues #45-46:** Jest testing, Vercel deployment

#### **Week 3 - Core Components:**

- ✅ **Issues #40, #43-44:** Application layout, forms, modals

#### **Previous Service Layer Work:**

- ✅ **Issue #17:** User Service Layer Implementation (modular architecture, 32 tests, 88%+ coverage)

### Next Steps

Continue with Phase 2 authentication and data layer issues following the established workflow
and quality standards defined in the primary CLAUDE.md file
