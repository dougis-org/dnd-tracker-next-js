/**
 * Secure filesystem utilities for test files
 *
 * This module provides secure alternatives to direct filesystem operations
 * to avoid Codacy security warnings while maintaining test functionality.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Allowed test file paths to prevent path traversal attacks
 */
const ALLOWED_TEST_PATHS = [
  'src/__tests__/',
  'src/components/',
  'src/lib/',
  'src/app/',
  '__tests__/',
  'tests/',
  'package.json',
  'public/',
] as const;

/**
 * Validates that a file path is within allowed test directories
 * @param filePath - The file path to validate
 * @returns True if the path is allowed
 */
function isAllowedTestPath(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  return ALLOWED_TEST_PATHS.some(allowedPath =>
    normalizedPath.includes(allowedPath) || normalizedPath === allowedPath
  );
}

/**
 * Safely reads a test file with path validation
 * @param relativePath - Relative path from project root
 * @returns File content as string
 * @throws Error if path validation fails
 */
export function safeReadTestFile(relativePath: string): string {
  if (!isAllowedTestPath(relativePath)) {
    throw new Error(`Path not allowed for test file reading: ${relativePath}`);
  }

  const fullPath = path.join(process.cwd(), relativePath);

  // Additional check to ensure the resolved path is still safe
  const resolvedPath = path.resolve(fullPath);
  const projectRoot = path.resolve(process.cwd());

  if (!resolvedPath.startsWith(projectRoot)) {
    throw new Error(`Resolved path outside project root: ${resolvedPath}`);
  }

  return fs.readFileSync(resolvedPath, 'utf8');
}

/**
 * Safely checks if a test file exists with path validation
 * @param relativePath - Relative path from project root
 * @returns True if file exists and is in allowed location
 */
export function safeTestFileExists(relativePath: string): boolean {
  try {
    if (!isAllowedTestPath(relativePath)) {
      return false;
    }

    const fullPath = path.join(process.cwd(), relativePath);
    const resolvedPath = path.resolve(fullPath);
    const projectRoot = path.resolve(process.cwd());

    if (!resolvedPath.startsWith(projectRoot)) {
      return false;
    }

    return fs.existsSync(resolvedPath);
  } catch {
    return false;
  }
}

/**
 * Predefined test file paths to avoid dynamic construction
 */
export const TEST_FILE_PATHS = {
  AUTH_PRODUCTION_REDIRECT: 'src/__tests__/auth-production-redirect-issue-494.test.ts',
  AUTH_FUNCTION_DUPLICATION: 'src/__tests__/auth-function-duplication-issue-499.test.ts',
  ROUTE_HANDLER_TYPES: 'src/__tests__/route-handler-types.test.ts',
  PRODUCTION_DEPLOYMENT: 'src/components/landing/__tests__/production-deployment.test.tsx',
} as const;