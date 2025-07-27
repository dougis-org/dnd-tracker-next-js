# Technology Stack Documentation

**Project:** D&D Encounter Tracker Web App  
**Version:** 1.0  
**Date:** January 27, 2025  
**Last Updated:** January 27, 2025

## Overview

This document provides a comprehensive inventory of all technologies, frameworks, libraries, and tools used in the
D&D Encounter Tracker project. Each entry includes the current version, latest stable version, and upgrade
recommendations where applicable.

## Core Framework & Runtime

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| Next.js | Web Framework | ^15.0.0 | 15.4.1 | ⚠️ Upgrade Available | Core framework - upgrade recommended for latest features |
| React | UI Library | ^18.2.0 | 18.3.1 | ⚠️ Upgrade Available | Core UI library - upgrade recommended |
| React DOM | UI Library | ^18.2.0 | 18.3.1 | ⚠️ Upgrade Available | DOM bindings - should match React version |
| Node.js | Runtime | - | 20.18.0 LTS | ℹ️ Check Runtime | Verify Vercel uses latest LTS |
| TypeScript | Language | ^5.0.0 | 5.8.4 | ⚠️ Upgrade Available | Type safety - major version upgrade available |

## Database & Data Management

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| MongoDB | Database | - | 8.0 | ℹ️ Check Version | Atlas cluster version needs verification |
| Mongoose | ODM | ^8.16.0 | 8.12.9 | ⚠️ Downgrade | Current version may be ahead of stable |
| @types/mongoose | Type Definitions | ^5.11.96 | 5.11.97 | ⚠️ Upgrade Available | Minor version update |

## Authentication & Security

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| NextAuth.js | Authentication | ^5.0.0-beta.29 | 5.0.0-beta.30 | ⚠️ Upgrade Available | Beta version - monitor for stable release |
| @auth/mongodb-adapter | Auth Adapter | ^3.10.0 | 3.10.3 | ⚠️ Upgrade Available | MongoDB adapter for NextAuth |
| bcryptjs | Password Hashing | ^3.0.2 | 2.4.3 | ⚠️ Version Mismatch | Current version ahead of npm stable |
| @types/bcryptjs | Type Definitions | ^2.4.6 | 2.4.6 | ✅ Current | Type definitions up to date |

## UI & Styling

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| Tailwind CSS | CSS Framework | ^3.4.17 | 4.0.0 | 🔄 Major Update | Major version available - breaking changes |
| tailwindcss-animate | Animation Plugin | ^1.0.7 | 1.0.7 | ✅ Current | Animation utilities |
| tailwind-merge | Utility | ^3.3.1 | 3.3.2 | ⚠️ Upgrade Available | Class merging utility |
| PostCSS | CSS Processor | ^8.4.0 | 8.5.2 | ⚠️ Upgrade Available | CSS processing |
| Autoprefixer | CSS Plugin | ^10.4.0 | 10.4.20 | ⚠️ Upgrade Available | CSS vendor prefixing |

## UI Components & Libraries

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| @radix-ui/react-alert-dialog | UI Component | ^1.1.14 | 1.1.14 | ✅ Current | Alert dialog component |
| @radix-ui/react-avatar | UI Component | ^1.1.10 | 1.1.10 | ✅ Current | Avatar component |
| @radix-ui/react-checkbox | UI Component | ^1.3.2 | 1.3.2 | ✅ Current | Checkbox component |
| @radix-ui/react-dialog | UI Component | ^1.1.14 | 1.1.14 | ✅ Current | Dialog component |
| @radix-ui/react-dropdown-menu | UI Component | ^2.1.15 | 2.1.15 | ✅ Current | Dropdown menu component |
| @radix-ui/react-label | UI Component | ^2.1.7 | 2.1.7 | ✅ Current | Label component |
| @radix-ui/react-progress | UI Component | ^1.1.7 | 1.1.7 | ✅ Current | Progress component |
| @radix-ui/react-select | UI Component | ^2.2.5 | 2.2.5 | ✅ Current | Select component |
| @radix-ui/react-separator | UI Component | ^1.1.7 | 1.1.7 | ✅ Current | Separator component |
| @radix-ui/react-slot | UI Component | ^1.2.3 | 1.2.3 | ✅ Current | Slot component |
| @radix-ui/react-switch | UI Component | ^1.2.5 | 1.2.5 | ✅ Current | Switch component |
| @radix-ui/react-tabs | UI Component | ^1.1.12 | 1.1.12 | ✅ Current | Tabs component |
| lucide-react | Icons | ^0.525.0 | 0.472.0 | ⚠️ Version Ahead | Icon library - version ahead of published |
| class-variance-authority | Utility | ^0.7.1 | 0.7.1 | ✅ Current | CSS variant utility |
| clsx | Utility | ^2.1.1 | 2.1.1 | ✅ Current | Conditional class names |

## Drag & Drop

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| @dnd-kit/core | Drag & Drop | ^6.3.1 | 6.3.2 | ⚠️ Upgrade Available | Core drag and drop functionality |
| @dnd-kit/modifiers | Drag & Drop | ^9.0.0 | 9.0.0 | ✅ Current | Drag modifiers |
| @dnd-kit/sortable | Drag & Drop | ^10.0.0 | 10.0.1 | ⚠️ Upgrade Available | Sortable components |
| @dnd-kit/utilities | Drag & Drop | ^3.2.2 | 3.2.2 | ✅ Current | Utility functions |

## Form Handling & Validation

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| react-hook-form | Forms | ^7.58.1 | 7.54.2 | ⚠️ Version Ahead | Form library - ahead of published |
| @hookform/resolvers | Form Validation | ^5.1.1 | 5.1.1 | ✅ Current | Validation resolvers |
| zod | Schema Validation | ^3.25.67 | 3.23.8 | ⚠️ Version Ahead | Schema validation - ahead of published |

## Utilities & Libraries

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| date-fns | Date Utility | ^4.1.0 | 4.1.0 | ✅ Current | Date manipulation |
| fast-xml-parser | XML Parser | ^5.2.5 | 5.2.10 | ⚠️ Upgrade Available | XML parsing utility |
| isomorphic-dompurify | Sanitization | ^2.25.0 | 2.25.0 | ✅ Current | XSS protection |
| sonner | Notifications | ^2.0.6 | 2.1.3 | ⚠️ Upgrade Available | Toast notifications |

## Development Tools & Linting

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| ESLint | Linting | ^9.31.0 | 9.19.0 | ⚠️ Version Ahead | JavaScript linting - ahead of published |
| @eslint/js | ESLint Config | ^9.31.0 | 9.19.0 | ⚠️ Version Ahead | ESLint JavaScript config |
| @eslint/eslintrc | ESLint Config | ^3.3.1 | 3.2.0 | ⚠️ Version Ahead | ESLint configuration utility |
| @next/eslint-plugin-next | ESLint Plugin | ^15.3.5 | 15.4.1 | ⚠️ Upgrade Available | Next.js ESLint rules |
| @typescript-eslint/eslint-plugin | ESLint Plugin | ^8.35.1 | 8.19.1 | ⚠️ Version Ahead | TypeScript ESLint plugin |
| @typescript-eslint/parser | ESLint Parser | ^8.35.1 | 8.19.1 | ⚠️ Version Ahead | TypeScript ESLint parser |
| eslint-config-next | ESLint Config | ^15.0.0 | 15.4.1 | ⚠️ Upgrade Available | Next.js ESLint configuration |
| eslint-config-prettier | ESLint Config | ^10.1.5 | 10.1.5 | ✅ Current | Prettier integration |
| eslint-plugin-prettier | ESLint Plugin | ^5.5.0 | 5.2.1 | ⚠️ Version Ahead | Prettier ESLint plugin |
| Prettier | Code Formatter | ^3.5.3 | 3.4.2 | ⚠️ Version Ahead | Code formatting |
| markdownlint-cli | Markdown Linting | ^0.42.0 | 0.43.0 | ⚠️ Upgrade Available | Markdown linting tool |

## Testing Framework

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| Jest | Testing Framework | ^30.0.2 | 29.7.0 | ⚠️ Version Ahead | Testing framework - ahead of published |
| @types/jest | Type Definitions | ^30.0.0 | 29.5.14 | ⚠️ Version Ahead | Jest type definitions |
| jest-environment-jsdom | Test Environment | ^30.0.2 | 29.7.0 | ⚠️ Version Ahead | JSDOM test environment |
| ts-jest | TypeScript Support | ^29.4.0 | 29.2.5 | ⚠️ Version Ahead | TypeScript Jest support |
| @testing-library/jest-dom | Testing Utilities | ^6.6.3 | 6.6.3 | ✅ Current | Jest DOM matchers |
| @testing-library/react | Testing Utilities | ^16.3.0 | 16.1.0 | ⚠️ Version Ahead | React testing utilities |
| @testing-library/user-event | Testing Utilities | ^14.6.1 | 14.5.2 | ⚠️ Version Ahead | User interaction simulation |
| mongodb-memory-server | Test Database | ^10.1.4 | 10.2.2 | ⚠️ Upgrade Available | In-memory MongoDB for testing |

## Build & Development Tools

| Technology | Category | Current Version | Latest Stable | Status | Notes |
|------------|----------|----------------|---------------|---------|-------|
| tsx | TypeScript Execution | ^4.20.3 | 4.20.0 | ⚠️ Version Ahead | TypeScript execution engine |
| @types/node | Type Definitions | ^24.0.10 | 22.10.5 | ⚠️ Version Ahead | Node.js type definitions |
| @types/react | Type Definitions | ^18.2.0 | 18.3.18 | ⚠️ Upgrade Available | React type definitions |
| @types/react-dom | Type Definitions | ^18.2.0 | 18.3.5 | ⚠️ Upgrade Available | React DOM type definitions |

## Package Management Overrides

| Package | Override Version | Reason | Latest Available |
|---------|------------------|---------|------------------|
| test-exclude | ^7.0.1 | Jest compatibility | 7.0.1 |
| glob | ^10.0.0 | Security/compatibility | 11.0.0 |

## Status Legend

- ✅ **Current**: Package is up to date
- ⚠️ **Upgrade Available**: Newer version available - recommend upgrading
- 🔄 **Major Update**: Major version upgrade available - review breaking changes
- ❌ **Deprecated**: Package is deprecated - replacement needed
- ℹ️ **Check Version**: Version needs verification or is managed externally

## Deprecated Packages & Recommendations

Currently, no packages in the project are officially deprecated. However, the following considerations should be noted:

### NextAuth.js Beta Status
- **Current**: NextAuth.js v5.0.0-beta.29
- **Status**: Still in beta
- **Recommendation**: Monitor for stable v5.0.0 release
- **Migration Notes**: No breaking changes expected from beta to stable

### Tailwind CSS Major Version
- **Current**: Tailwind CSS v3.4.17
- **Available**: Tailwind CSS v4.0.0
- **Status**: Major version with breaking changes
- **Recommendation**: Plan migration after reviewing v4 breaking changes
- **Migration Guide**: [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

## Security Considerations

### Package Versions Ahead of Published
Several packages show versions ahead of their latest published versions. This typically indicates:

1. **Pre-release versions**: Packages using alpha, beta, or RC versions
2. **Cached registries**: npm registry synchronization delays
3. **Private registries**: Enterprise or custom package sources

**Recommendation**: Verify package sources and consider using exact versions in production.

### Security Scanning
All packages should be regularly scanned for vulnerabilities using:
- `npm audit`
- Codacy security scanning
- Trivy container scanning (via `codacy_cli_analyze` with tool="trivy")

## Upgrade Strategy

### High Priority Upgrades
1. **Next.js**: 15.0.0 → 15.4.1 (latest features and bug fixes)
2. **React**: 18.2.0 → 18.3.1 (performance improvements)
3. **TypeScript**: 5.0.0 → 5.8.4 (enhanced type checking)
4. **MongoDB Adapter**: 3.10.0 → 3.10.3 (security fixes)

### Medium Priority Upgrades
1. **Testing Framework**: Verify Jest 30.x compatibility
2. **Build Tools**: Update development dependencies
3. **UI Components**: Minor version updates for Radix components

### Low Priority / Future Planning
1. **Tailwind CSS v4**: Plan major migration
2. **NextAuth.js Stable**: Wait for v5.0.0 stable release

## Environment-Specific Versions

### Development Environment
- Node.js: Verify local version matches deployment
- MongoDB: Local instance version should match Atlas cluster

### Production Environment (Vercel)
- Node.js: Latest LTS (managed by Vercel)
- Edge Runtime: Latest (managed by Vercel)
- Build Tools: Managed by Vercel build system

## Update Process

1. **Test Environment**: Apply updates in development first
2. **Dependency Testing**: Run full test suite after updates
3. **Security Scanning**: Perform security audit after updates
4. **Staging Deployment**: Test in staging environment
5. **Production Deployment**: Deploy after successful staging tests

## Monitoring & Maintenance

- **Weekly**: Check for security updates
- **Monthly**: Review dependency updates
- **Quarterly**: Major version upgrade planning
- **Annually**: Full stack technology review

---

**Document Maintenance**: This document should be updated whenever dependencies are added, removed, or
significantly updated. Use the following command to regenerate current versions:

```bash
npm ls --depth=0 > current-versions.txt
```

**Last Audit Date**: January 27, 2025  
**Next Scheduled Review**: February 27, 2025
