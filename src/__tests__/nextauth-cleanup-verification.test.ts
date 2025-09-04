/**
 * Tests to verify complete removal of NextAuth code from the codebase
 * Issue #655 - Remove All NextAuth Code and Dependencies
 *
 * These tests will fail until all NextAuth references are completely removed.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve, normalize } from 'path';

describe('NextAuth Cleanup Verification - Issue #655', () => {
  const rootDir = resolve(__dirname, '..');
  const projectRoot = resolve(rootDir, '..');
  const packageJsonPath = join(projectRoot, 'package.json');

  describe('Package Dependencies', () => {
    it('should not have NextAuth dependencies in package.json', () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check dependencies
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const allDeps = { ...dependencies, ...devDependencies };

      const nextAuthDeps = Object.keys(allDeps).filter(dep =>
        dep.includes('next-auth') || dep.includes('@auth')
      );

      expect(nextAuthDeps).toEqual([]);
    });
  });

  describe('File System Cleanup', () => {
    const filesToDelete = [
      'src/lib/auth.ts',
      'src/lib/auth-database-session.ts',
      'src/lib/session-config.ts',
      'src/lib/session-client.ts',
      'src/lib/session-context.tsx',
      'src/components/providers/SessionProvider.tsx',
      'src/types/next-auth.d.ts',
      'src/__mocks__/next-auth.js'
    ];

    filesToDelete.forEach(filePath => {
      it(`should not exist: ${filePath}`, () => {
        // Sanitize and validate path to prevent directory traversal
        const sanitizedPath = normalize(filePath).replace(/^(\.\.\/)+/, '');
        const fullPath = join(projectRoot, sanitizedPath);
        expect(existsSync(fullPath)).toBe(false);
      });
    });

    it('should not have auth-callbacks.ts or its directory', () => {
      const authCallbacksPath = join(rootDir, 'lib', 'auth', 'auth-callbacks.ts');
      const authDirPath = join(rootDir, 'lib', 'auth');

      expect(existsSync(authCallbacksPath)).toBe(false);

      // If auth directory exists, it should only contain allowed SSO files
      if (existsSync(authDirPath)) {
        const authDirContents = readdirSync(authDirPath);
        const nonTestFiles = authDirContents.filter(file => !file.includes('__tests__'));
        // Allow SSO-related files for Issue #828
        const allowedFiles = ['sso-redirect-handler.ts', 'sso-callback-component.tsx'];
        const unexpectedFiles = nonTestFiles.filter(file => !allowedFiles.includes(file));
        expect(unexpectedFiles).toEqual([]);
      }
    });
  });

  describe('Code References Cleanup', () => {
    const searchPatterns = [
      /next-auth/gi,
      /NextAuth/g,
      /from ['"]next-auth/g,
      /import.*next-auth/gi,
      /getServerSession/g,
      /useSession/g,
      /SessionProvider/g,
    ];

    const excludePatterns = [
      /__tests__/,
      /\.test\./,
      /\.spec\./,
      /test-results\.json/,
      /node_modules/,
      /\.git/,
      /nextauth-cleanup-verification\.test\.ts/, // This test file itself
      /CLERK-INTEGRATION-STEPS\.md/, // Documentation
      /\.cspell\.json/, // Spell checker dictionary
    ];

    function shouldExcludeFile(filePath: string): boolean {
      return excludePatterns.some(pattern => pattern.test(filePath));
    }

    function findFilesRecursively(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
      const files: string[] = [];

      try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
          // Prevent directory traversal by normalizing entry
          const sanitizedEntry = normalize(entry).replace(/^(\.\.\/)+/, '').replace(/[^a-zA-Z0-9_\-\/\.]/g, '');
          const fullPath = resolve(dir, sanitizedEntry);

          // Ensure path is still within the original directory
          if (!fullPath.startsWith(resolve(resolve(dir)))) {
            continue;
          }
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            if (!shouldExcludeFile(fullPath)) {
              files.push(...findFilesRecursively(fullPath, extensions));
            }
          } else if (stat.isFile()) {
            if (extensions.includes(extname(entry)) && !shouldExcludeFile(fullPath)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore permission errors or missing directories
      }

      return files;
    }

    it('should not have NextAuth imports in TypeScript/JavaScript files', () => {
      const sourceFiles = findFilesRecursively(join(rootDir));
      const filesWithNextAuth: string[] = [];

      sourceFiles.forEach(filePath => {
        try {
          const content = readFileSync(filePath, 'utf-8');

          // Check for NextAuth patterns
          const hasNextAuthReference = searchPatterns.some(pattern => pattern.test(content));

          if (hasNextAuthReference) {
            filesWithNextAuth.push(filePath.replace(rootDir, 'src'));
          }
        } catch {
          // Ignore files that can't be read
        }
      });

      expect(filesWithNextAuth).toEqual([]);
    });

    it('should not have NextAuth-related type definitions', () => {
      const typeFiles = findFilesRecursively(join(rootDir), ['.d.ts']);
      const typesWithNextAuth: string[] = [];

      typeFiles.forEach(filePath => {
        if (shouldExcludeFile(filePath)) return;

        try {
          const content = readFileSync(filePath, 'utf-8');

          // Check for NextAuth type references
          if (/next-auth|NextAuth/i.test(content)) {
            typesWithNextAuth.push(filePath.replace(rootDir, 'src'));
          }
        } catch {
          // Ignore files that can't be read
        }
      });

      expect(typesWithNextAuth).toEqual([]);
    });

    it('should not use NextAuth session patterns', () => {
      const commonPatterns = [
        /getServerSession\(/g,
        /useSession\(\)/g,
        /SessionProvider/g,
        /next-auth\/react/g,
      ];

      const sourceFiles = findFilesRecursively(join(rootDir), ['.ts', '.tsx', '.js', '.jsx']);
      const filesWithPatterns: string[] = [];

      sourceFiles.forEach(filePath => {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const hasPatterns = commonPatterns.some(pattern => pattern.test(content));

          if (hasPatterns) {
            filesWithPatterns.push(filePath.replace(rootDir, 'src'));
          }
        } catch {
          // Ignore files that can't be read
        }
      });

      expect(filesWithPatterns).toEqual([]);
    });
  });

  describe('Functional Verification', () => {
    it('should not export NextAuth configuration', () => {
      const authConfigPath = join(rootDir, 'lib', 'auth.ts');
      expect(existsSync(authConfigPath)).toBe(false);
    });

    it('should not have session-related NextAuth utilities', () => {
      const sessionUtilPaths = [
        'lib/session-config.ts',
        'lib/session-client.ts',
        'lib/session-context.tsx'
      ];

      sessionUtilPaths.forEach(path => {
        // Sanitize path to prevent directory traversal
        const sanitizedPath = normalize(path).replace(/^(\.\.\/)+/, '');
        const fullPath = join(rootDir, sanitizedPath);
        expect(existsSync(fullPath)).toBe(false);
      });
    });

    it('should not have NextAuth provider components', () => {
      const providerPath = join(rootDir, 'components', 'providers', 'SessionProvider.tsx');
      expect(existsSync(providerPath)).toBe(false);
    });

    it('should not have NextAuth test mocks', () => {
      const mockPath = join(rootDir, '__mocks__', 'next-auth.js');
      expect(existsSync(mockPath)).toBe(false);
    });
  });

  describe('Build and Runtime Verification', () => {
    // These tests verify that removing NextAuth doesn't break the build
    it('should not import NextAuth in middleware', () => {
      const middlewarePath = join(rootDir, 'middleware.ts');

      if (existsSync(middlewarePath)) {
        const content = readFileSync(middlewarePath, 'utf-8');
        expect(content).not.toMatch(/next-auth|NextAuth/i);
        expect(content).toMatch(/@clerk\/nextjs/); // Should use Clerk instead
      }
    });
  });

  describe('Documentation Cleanup', () => {
    it('should not reference NextAuth in configuration files', () => {
      const configFiles = [
        'next.config.js',
        'next.config.mjs',
        '.env.local',
        '.env.example'
      ];

      configFiles.forEach(configFile => {
        // Sanitize config file name to prevent directory traversal
        const sanitizedConfigFile = normalize(configFile).replace(/^(\.\.\/)+/, '');
        const configPath = join(projectRoot, sanitizedConfigFile);

        if (existsSync(configPath)) {
          const content = readFileSync(configPath, 'utf-8');

          // Should not contain NextAuth environment variables or configs
          expect(content).not.toMatch(/NEXTAUTH_/i);
          expect(content).not.toMatch(/next-auth/i);
        }
      });
    });
  });
});