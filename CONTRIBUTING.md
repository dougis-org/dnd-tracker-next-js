# Contributing to dnd-tracker

Welcome! This project follows strict engineering, workflow, and coding standards to ensure high quality, maintainability, and security. All contributors—including GitHub Copilot—must follow these unified instructions.

---

## Core Principles

- Quality over speed: thoughtful, reasoned, and maintainable code is required.
- All code must be fully functional, with all tests passing before merging.
- You are responsible for the quality and correctness of your work—never assume issues are someone else’s problem.
- Remote CI and Codacy checks are authoritative over local results.

---

## Workflow Overview

### 1. Issue Selection & Branching

- Select issues by priority (P1 > P2, Phase1 > Phase2, lower# first).
- Do not start work on issues labeled `in-progress` or `effort:human`.
- Add the `in-progress` label when starting.
- Create a feature branch from `main` using descriptive, kebab-case naming:  
  `feature/task-description` or `feature/component-name`.
- Push the branch immediately.

### 2. Development Process (TDD Required)

- Write failing tests before implementing code (Test-Driven Development).
- Implement code to pass tests; extract duplicated test code to utilities.
- Follow all coding, security, and documentation standards below.
- After every file edit, run:
  - `npm run lint:fix`
  - `npm run lint:markdown:fix` (for markdown files)
- Commit and push after local checks pass.

### 3. Pre-PR Checklist

Before creating a PR, ensure:

- [ ] All TypeScript errors are resolved (`npm run type-check`)
- [ ] ESLint passes without errors (`npm run lint`)
- [ ] Markdownlint passes without errors (`npm run lint:markdown:fix`)
- [ ] All tests pass (`npm run test:ci`)
- [ ] Build completes successfully (`npm run build`)
- [ ] All new dependencies are installed and scanned (see Security below)
- [ ] Environment variables are documented in `.env.example`
- [ ] Code follows all project conventions and best practices

### 4. Pull Request Creation

- Use the GitHub CLI to create PRs with auto-merge enabled:

  ```bash
  gh pr create --title "type: descriptive title" --body "detailed description" --head feature-branch --base main
  gh pr merge --auto --squash
  ```

- Use conventional commit format for PR titles (e.g., `feat: add user authentication system`).
- Include the related GitHub issue in the PR description.
- Use the provided PR description template (see below).
- Enable auto-merge and use squash merge.

### 5. Post-PR Process

- Monitor for CI/CD failures and address promptly.
- PR will auto-merge once all requirements are satisfied.
- Update task status and remove `in-progress` label after merge.
- Prune local branches after merge.

---

## Coding Standards

### TypeScript & Code Organization

- Use strict mode; no `any` types without justification.
- Provide proper type definitions for all functions and components.
- Use interfaces for complex objects.
- Organize code as follows:
  - `src/app/` – Next.js app router pages and layouts
  - `src/components/` – Reusable React components
  - `src/lib/` – Utility functions and configurations
  - `src/models/` – Database models and schemas
  - `src/types/` – TypeScript type definitions
  - `src/hooks/` – Custom React hooks

### Component & API Standards

- Use functional components with hooks.
- Implement error boundaries where needed.
- Follow shadcn/ui patterns for UI components.
- Ensure accessibility (ARIA, keyboard navigation).
- API routes:
  - Use Zod for request validation.
  - Provide proper TypeScript types for request/response.
  - Implement error handling with correct HTTP status codes.
  - Follow RESTful conventions.
- Use ES6 (and later) features and syntax.

### Database & Security

- Use Mongoose for MongoDB.
- Implement schema validation and appropriate indexes.
- Handle connection errors gracefully.
- Never commit sensitive data; use environment variables.
- Validate and sanitize all input.
- Follow authentication best practices.

### File & Function Size

- Max 450 lines per file (uncommented).
- Max 50 lines per function.
- No code duplication—use helpers/utilities (DRY).
- 80%+ test coverage on touched code.
- Use descriptive variable names and keep complexity low.

---

## Reducing Complexity & Duplication

To maintain code quality and keep the codebase maintainable, all contributors must actively reduce complexity and duplication. Follow these steps:

### 1. Extract Shared Logic

- Move repeated code (validation, form setup, test utilities) into shared helper functions or modules.
- For tests, use a `test-utils.ts` file for common setup, mocks, and data factories.
- For API routes, extract authentication, error handling, and database logic into reusable middleware or utility functions.

### 2. Parameterize Tests

- Use test parameterization (e.g., `it.each` in Jest) to avoid copy-pasting similar test cases.
- Prefer factories for generating test data over duplicating objects.

### 3. Component Composition

- Break large components into smaller, focused subcomponents.
- Reuse UI primitives (form fields, validation messages) across steps and forms.

### 4. DRY Up API Handlers

- If multiple API routes share similar CRUD logic, use generic handlers or base classes.
- Centralize Zod schemas and validation logic for reuse in both frontend and backend.

### 5. Refactor Regularly

- When adding new features or tests, always look for opportunities to refactor and remove duplication.
- If you see similar code in multiple places, extract it to a shared location.

### 6. Review Before PR

- Check for code duplication and high complexity before submitting a PR.
- Use tools like Codacy and ESLint to identify and address duplication and complexity issues.

**Example:**

- If you have similar test setup in multiple files, move it to `src/app/api/characters/_utils/test-utils.ts` and import it where needed.
- For repeated form validation logic, create a `form-helpers.ts` in `src/lib/` and reuse across components.

---

## Testing & Quality Checks

- All code must pass:
  - `npm run test:ci`
  - `npm run build`
  - `npm run lint:fix`
  - `npm run lint:markdown:fix`
  - `npm run type-check`
- After any dependency install, run a security scan:
  - `codacy_cli_analyze --tool trivy`
- Before PR, run a full Codacy scan:
  - `codacy_cli_analyze .`
- Fix all issues found by remote Codacy or CI, even pre-existing ones.

---

## Documentation

- Update `README.md` for significant changes.
- Document new environment variables in `.env.example`.
- Use JSDoc for complex functions.
- Update API documentation for new endpoints.
- Update `docs/Execution-Plan.md` if the issue is listed.

---

## Git Commit Standards

- Use conventional commit messages (e.g., `feat:`, `fix:`, `refactor:`, `docs:`).
- Make atomic commits—one logical change per commit.
- Write descriptive commit messages explaining the "why".
- Keep commits focused and avoid mixing unrelated changes.

---

## Pull Request Description Template

Include in every PR:

```markdown
## Summary

Brief description of what this PR accomplishes

## Requirements Satisfied

List the specific requirements/tasks this addresses

## Key Changes

- Bullet point list of major changes
- Include new files created
- Include modified functionality

## Testing

- [ ] Build passes
- [ ] TypeScript compilation successful
- [ ] ESLint passes
- [ ] Manual testing completed (if applicable)

## Dependencies

List any new dependencies added and why they were needed

## Issue

Closes **Issue**
```

---

## Branch Protection & Auto-merge

- Never commit directly to `main`.
- All changes must go through PR review and auto-merge.
- All status checks must pass before merge (build, lint, tests, coverage, no merge conflicts).
- Test coverage must not decrease; maintain at least 70% project coverage.

---

## Sub-Issues & Task Integration

- For complex issues, break into sub-issues and complete each using the full workflow.
- Reference specific requirements satisfied in PR descriptions.
- Update task status to `completed` only after PR auto-merges and the issue closes.

---

## Tools

- Codacy CLI: `/usr/local/bin/codacy-cli`
- Use MCP server for remote Codacy access when possible.
- Use Context7 for latest library standards.

---

By following these unified instructions, all contributors—including GitHub Copilot—will ensure consistent, high-quality, and secure code that meets the project’s standards and workflow requirements.
