# D&D Encounter Tracker

## Application Overview

A modern web application for D&D Dungeon Masters to manage combat encounters efficiently

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-blue?logo=tailwindcss)](https://tailwindcss.com/)

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/e478010b1e694f089b87b1bcf52fcf97)](https://app.codacy.com/gh/dougis-org/dnd-tracker-next-js/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/b7170c5437b5477798c76af55973470d)](https://app.codacy.com/gh/dougis-org/dnd-tracker-next-js/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)

## 🎯 **Project Status: Active Development**

- ✅ **Planning Phase Complete**: All business requirements, technical architecture, and development planning finished
- 🚀 **Development In Progress**: Foundation established, authentication system implemented
- 📋 **Progress**: 1/46 MVP issues completed, test coverage expansion underway
- 🧪 **Current Focus**: Expanding test coverage and implementing core character management

---

## 🏗️ **Purpose & Problem Statement**

### **The Problem**

Dungeon Masters need efficient tools to manage complex D&D 5e combat encounters, but existing solutions are either:

- **Too complex**: Virtual tabletops with steep learning curves
- **Too simple**: Basic initiative trackers missing critical features
- **Outdated**: Poor mobile support and dated user interfaces
- **Missing features**: No support for lair actions (unique to this tracker)

### **Our Solution**

A modern, purpose-built encounter tracker that:

- Focuses specifically on combat management (not trying to be everything)
- Provides intuitive UI/UX optimized for both desktop and mobile DMs
- Includes unique features like lair action support at initiative count 20
- Offers a sustainable freemium model accessible to all DM experience levels

---

## 🛠️ **Technology Stack**

### **Frontend**

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety and developer experience
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality component library
- **[React Hook Form](https://react-hook-form.com/)** - Performant form handling
- **[Zod](https://zod.dev/)** - Schema validation

### **Backend**

- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Serverless API endpoints
- **[MongoDB 7.0+](https://www.mongodb.com/)** - Document database with Atlas hosting
- **[Mongoose](https://mongoosejs.com/)** - MongoDB object modeling
- **[NextAuth.js v5](https://authjs.dev/)** - Authentication and session management
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing

### **DevOps & Quality**

- **[Vercel](https://vercel.com/)** - Hosting and deployment
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipeline
- **[Jest](https://jestjs.io/)** - Unit and integration testing
- **[React Testing Library](https://testing-library.com/react)** - Component testing
- **[Codacy](https://www.codacy.com/)** - Code quality and coverage analysis
- **[Sentry](https://sentry.io/)** - Error monitoring (planned)

---

## 📋 **Project Documentation**

All detailed documentation is maintained in the [`docs/`](./docs/) folder. Key documents include:

### **📊 Core Documentation**

- **[Product Requirements Document](./docs/Product%20Requirements%20Document.md)** - Business requirements,
  subscription model, success metrics
- **[High Level Design](./docs/High%20Level%20Design.md)** - Technical architecture, database design, API specifications
- **[Project Roadmap](./docs/Project%20Roadmap.md)** - Complete task breakdown with MVP identification

### **🗓️ Development Planning**

- **[12-Week MVP Development Phase Plan](./docs/12-Week%20MVP%20Development%20Phase%20Plan.md)** - Weekly sprint schedule
- **[Project State Summary](./docs/D%26D%20Encounter%20Tracker%20-%20Project%20State%20Summary.md)** - Current
  development status
- **[GitHub Issues Progress](./docs/D%26D%20Tracker%20MVP%20GitHub%20Issues%20-%20Progress%20State.md)** - Issue tracking

### **🚀 Quick References**

- **[Documentation Index](./docs/README.md)** - Complete guide to all documentation
- **[Quick Reference Guide](./docs/QUICK%20REFERENCE%20FOR%20OTHER%20CHATS.md)** - Fast project overview
- **[Development Guide](./CLAUDE.md)** - Development instructions and commands

---

## 🎯 **MVP Features & Scope**

### **Core Functionality**

- ✅ User authentication and registration
- ✅ Character creation and management (PCs and NPCs)
- ✅ Encounter building with participant management
- ✅ Initiative tracking with automatic rolling and tiebreakers
- ✅ Turn-based combat management
- ✅ HP tracking with damage/healing
- ✅ Combat state persistence

### **Unique Features**

- 🎲 **Lair Actions** - Support for initiative count 20 triggers (competitive advantage)
- ⚔️ **Multiclass Support** - Proper handling of multiclass characters
- 📱 **Mobile-First Design** - Optimized for DMs using tablets/phones at the table

---

## 💰 **Business Model**

### **Freemium Subscription Tiers**

| Tier                      | Price        | Parties   | Encounters | Creatures | Features           |
| ------------------------- | ------------ | --------- | ---------- | --------- | ------------------ |
| **Free Adventurer**       | $0/month     | 1         | 3          | 10        | Core features      |
| **Seasoned Adventurer**   | $4.99/month  | 3         | 15         | 50        | Import/Export      |
| **Expert Dungeon Master** | $9.99/month  | 10        | 50         | 200       | Advanced features  |
| **Master of Dungeons**    | $19.99/month | 25        | 100        | 500       | Priority support   |
| **Guild Master**          | $39.99/month | Unlimited | Unlimited  | Unlimited | Organization tools |

### **Revenue Targets**

- **12 Months**: $25,000+ MRR with 5,000+ users
- **Conversion Rate**: 15%+ free-to-paid conversion
- **LTV/CAC**: >4:1 ratio for sustainable growth

---

## 🚀 **Getting Started**

### **Prerequisites**

- Node.js 20.x or higher
- MongoDB 7.0+ (local or Atlas account)
- Git

### **Development Setup**

```bash
# Clone the repository
git clone https://github.com/dougis/dnd-tracker-next-js.git
cd dnd-tracker-next-js

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.development
# Edit .env.development with your MongoDB URI and NextAuth secret

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### **Available Scripts**

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run typecheck        # Check TypeScript types
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage report
```

---

## 📁 **Repository Structure**

```text
dnd-tracker-next-js/
├── docs/                    # Project documentation
│   ├── Product Requirements Document.md
│   ├── High Level Design.md
│   ├── Project Roadmap.md
│   └── [Additional planning docs]
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── (auth)/          # Authentication routes
│   │   ├── api/             # API routes
│   │   └── components/      # Page-specific components
│   ├── components/          # Shared components
│   ├── lib/                 # Utilities and services
│   │   ├── auth/            # Authentication config
│   │   ├── db/              # Database utilities
│   │   ├── models/          # Mongoose models
│   │   └── services/        # Business logic services
│   ├── types/               # TypeScript type definitions
│   └── __tests__/           # Test files
├── public/                  # Static assets
├── .github/                 # GitHub Actions workflows
└── [Configuration files]
```

---

## 📊 **Development Progress**

### **Completed ✅**

- Project setup and configuration
- CI/CD pipeline with GitHub Actions
- Database connection and models
- Authentication system (NextAuth.js)
- User model and UserService implementation
- Basic UI components with shadcn/ui

### **In Progress 🚧**

- Expanding test coverage (Issues #134-141)
- Character model implementation
- Character creation forms

### **Upcoming 📅**

- Character management UI
- Encounter data models
- Combat tracking system
- Subscription tier enforcement

See [GitHub Issues](https://github.com/dougis/dnd-tracker-next-js/issues) for detailed task tracking.

---

## 🤝 **Contributing**

### **For Developers**

1. Review documentation in [`docs/`](./docs/) folder
2. Check [GitHub Issues](https://github.com/dougis/dnd-tracker-next-js/issues) for available tasks
3. Follow the established code patterns and testing requirements
4. Submit PRs with comprehensive test coverage

### **Code Standards**

- TypeScript for all new code
- 80%+ test coverage for new features
- Follow existing patterns in `src/lib/services/`
- Use conventional commits for clear history

---

## 📧 **Contact & Support**

- **Repository**: [github.com/dougis/dnd-tracker-next-js](https://github.com/dougis/dnd-tracker-next-js)
- **Issues**: [GitHub Issues](https://github.com/dougis/dnd-tracker-next-js/issues)
- **Project Owner**: [@dougis](https://github.com/dougis)

---

## 🏆 **Project Achievements**

- ✅ **Complete Planning Phase**: Business requirements, technical design, and roadmap
- ✅ **Development Environment**: Next.js 15, TypeScript, testing infrastructure
- ✅ **Authentication System**: Secure user registration and login
- ✅ **CI/CD Pipeline**: Automated testing and code quality checks
- 🚧 **Active Development**: Regular commits and issue progress

---

_Building the modern D&D encounter tracker that Dungeon Masters deserve._ ⚔️🎲
