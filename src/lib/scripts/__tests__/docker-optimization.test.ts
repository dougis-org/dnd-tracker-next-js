/**
 * Test cases for Docker optimization and layer caching improvements
 * Following TDD principles - all tests should fail initially until optimizations are implemented
 *
 * Tests verify acceptance criteria from GitHub Issue #314:
 * 1. Restructure Dockerfile to copy package.json and package-lock.json first
 * 2. Copy application code after dependencies are installed
 * 3. Use multi-stage build to create smaller production image
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Docker Optimization Tests', () => {
  const dockerfilePath = join(process.cwd(), 'Dockerfile');
  let dockerfileContent: string;
  let dockerfileLines: string[];

  beforeAll(() => {
    dockerfileContent = readFileSync(dockerfilePath, 'utf-8');
    dockerfileLines = dockerfileContent.split('\n');
  });

  // Helper functions to reduce code duplication
  const findStageStart = (stageName: string): number => {
    return dockerfileLines.findIndex(line => line.includes(stageName));
  };

  const findLineIndex = (startIndex: number, searchTerm: string): number => {
    return dockerfileLines.findIndex((line, index) =>
      index > startIndex && line.includes(searchTerm)
    );
  };

  const findLineWithMultipleTerms = (startIndex: number, ...terms: string[]): number => {
    return dockerfileLines.findIndex((line, index) =>
      index > startIndex && terms.every(term => line.includes(term))
    );
  };

  const expectStageExists = (stageName: string): number => {
    const stageIndex = findStageStart(stageName);
    expect(stageIndex).toBeGreaterThan(-1);
    return stageIndex;
  };

  describe('Layer Caching Optimization', () => {
    test('should copy package.json and package-lock.json before copying application code', () => {
      const buildStageStart = expectStageExists('FROM base AS build');

      const packageJsonCopyIndex = findLineWithMultipleTerms(buildStageStart, 'COPY', 'package.json', 'package-lock.json');
      expect(packageJsonCopyIndex).toBeGreaterThan(buildStageStart);

      const npmInstallIndex = findLineIndex(packageJsonCopyIndex, 'npm ci');
      expect(npmInstallIndex).toBeGreaterThan(packageJsonCopyIndex);

      const appCodeCopyIndex = dockerfileLines.findIndex((line, index) =>
        index > npmInstallIndex && line.includes('COPY .') && !line.includes('package')
      );
      expect(appCodeCopyIndex).toBeGreaterThan(npmInstallIndex);

      // Verify correct order
      expect(packageJsonCopyIndex).toBeLessThan(npmInstallIndex);
      expect(npmInstallIndex).toBeLessThan(appCodeCopyIndex);
    });

    test('should copy only package files in dependency installation layer', () => {
      const packageCopyLine = dockerfileLines.find(line =>
        line.includes('COPY') && line.includes('package.json') && line.includes('package-lock.json')
      );

      expect(packageCopyLine).toBeDefined();
      expect(packageCopyLine).toMatch(/COPY\s+package-lock\.json\s+package\.json\s+\.\//);
    });

    test('should have npm ci for dependency installation to leverage lock file', () => {
      const npmCiLine = dockerfileLines.find(line =>
        line.includes('RUN npm ci') && !line.includes('--omit=dev')
      );

      expect(npmCiLine).toBeDefined();
    });
  });

  describe('Multi-Stage Build Optimization', () => {
    test('should have distinct base, build, and production stages', () => {
      // Use pre-compiled regex patterns to avoid security scanner warnings about dynamic RegExp
      const baseStagePattern = /FROM node:.*-slim AS base/m;
      const buildStagePattern = /FROM base AS build/m;
      const productionStagePattern = /FROM base AS production/m;

      expect(dockerfileContent).toMatch(baseStagePattern);
      expect(dockerfileContent).toMatch(buildStagePattern);
      expect(dockerfileContent).toMatch(productionStagePattern);
    });

    test('should copy only production dependencies in production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');
      const productionNpmCi = findLineWithMultipleTerms(productionStageStart, 'npm ci', '--omit=dev');
      expect(productionNpmCi).toBeGreaterThan(productionStageStart);
    });

    test('should copy built artifacts from build stage to production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');
      const buildCopyCommands = dockerfileLines.filter((line, index) =>
        index > productionStageStart && line.includes('COPY --from=build')
      );

      expect(buildCopyCommands.length).toBeGreaterThan(0);
      expect(buildCopyCommands.some(line => line.includes('.next'))).toBe(true);
      expect(buildCopyCommands.some(line => line.includes('public'))).toBe(true);
    });

    test('should use non-root user in production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');
      const createUser = dockerfileLines.findIndex((line, index) =>
        index > productionStageStart && (line.includes('adduser') || line.includes('useradd'))
      );
      expect(createUser).toBeGreaterThan(productionStageStart);

      const switchUser = dockerfileLines.findIndex((line, index) =>
        index > createUser && line.includes('USER') && !line.includes('root')
      );
      expect(switchUser).toBeGreaterThan(createUser);
    });
  });

  describe('Build Optimization Best Practices', () => {
    test('should install build dependencies only in build stage', () => {
      const buildStageStart = expectStageExists('FROM base AS build');
      const productionStageStart = expectStageExists('FROM base AS production');

      const buildDepsInBuild = dockerfileLines.slice(buildStageStart, productionStageStart)
        .some(line => line.includes('apt-get') && line.includes('build-essential'));
      expect(buildDepsInBuild).toBe(true);

      const buildDepsInProduction = dockerfileLines.slice(productionStageStart)
        .some(line => line.includes('apt-get') && line.includes('build-essential'));
      expect(buildDepsInProduction).toBe(false);
    });

    test('should have health check in production stage', () => {
      const healthCheck = dockerfileLines.find(line => line.includes('HEALTHCHECK'));
      expect(healthCheck).toBeDefined();
      expect(healthCheck).toMatch(/HEALTHCHECK.*--interval.*--timeout.*--start-period.*--retries/);
    });

    test('should expose port and set entrypoint in production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');

      const exposePort = findLineIndex(productionStageStart, 'EXPOSE 3000');
      expect(exposePort).toBeGreaterThan(productionStageStart);

      const entrypoint = findLineIndex(productionStageStart, 'ENTRYPOINT');
      expect(entrypoint).toBeGreaterThan(productionStageStart);
    });
  });

  describe('Image Size Optimization', () => {
    test('should use slim node image for smaller base size', () => {
      expect(dockerfileContent).toMatch(/FROM\s+node:\$\{NODE_VERSION\}-slim|FROM\s+node:\d+\.\d+\.\d+-slim/);
    });

    test('should clean up apt cache in build stage if using apt-get', () => {
      const aptGetLines = dockerfileLines.filter(line => line.includes('apt-get'));
      if (aptGetLines.length > 0) {
        const hasCleanup = dockerfileContent.includes('rm -rf /var/lib/apt/lists/*') ||
                          dockerfileContent.includes('apt-get clean');
        expect(hasCleanup).toBe(true);
      }
    });

    test('should copy files with proper ownership in production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');
      const copyWithChown = dockerfileLines.filter((line, index) =>
        index > productionStageStart && line.includes('COPY') && line.includes('--chown')
      );
      expect(copyWithChown.length).toBeGreaterThan(0);
    });
  });

  describe('Security Best Practices', () => {
    test('should run as non-root user in production', () => {
      const userDirective = dockerfileLines.find(line => line.startsWith('USER '));
      expect(userDirective).toBeDefined();
      expect(userDirective).not.toMatch(/USER\s+root/);
      expect(userDirective).not.toMatch(/USER\s+0/);
    });

    test('should not copy unnecessary files to production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');
      const productionCopies = dockerfileLines.filter((line, index) =>
        index > productionStageStart && line.includes('COPY') && !line.includes('--from=build')
      );

      productionCopies.forEach(copyLine => {
        expect(copyLine).toMatch(/package.*\.json/);
      });
    });
  });

  describe('Issue #410: Production Image Optimization', () => {
    test('should compile TypeScript migration scripts during build stage', () => {
      const buildStageStart = expectStageExists('FROM base AS build');
      const productionStageStart = expectStageExists('FROM base AS production');

      // Check if TypeScript compilation command exists in build stage
      const buildStageLines = dockerfileLines.slice(buildStageStart, productionStageStart);
      const hasCompileStep = buildStageLines.some(line =>
        line.includes('tsc') && line.includes('tsconfig.production.json')
      );

      expect(hasCompileStep).toBe(true);
    });

    test('should copy compiled JavaScript migration scripts to production', () => {
      const productionStageStart = expectStageExists('FROM base AS production');

      // Check if compiled scripts are copied from build stage
      const compiledScriptsCopy = dockerfileLines.find((line, index) =>
        index > productionStageStart &&
        line.includes('COPY --from=build') &&
        line.includes('/app/dist/lib/scripts') &&
        line.includes('./lib/scripts')
      );

      expect(compiledScriptsCopy).toBeDefined();
    });

    test('should not copy src directory to production stage', () => {
      const productionStageStart = expectStageExists('FROM base AS production');

      // Check that src directory is not copied to production
      const srcCopy = dockerfileLines.find((line, index) =>
        index > productionStageStart &&
        line.includes('COPY') &&
        line.includes('src/') &&
        !line.includes('--from=build')
      );

      expect(srcCopy).toBeUndefined();
    });

    test('should not install tsx in production dependencies', () => {
      const productionStageStart = expectStageExists('FROM base AS production');

      // Check that tsx is not installed in production
      const tsxInstall = dockerfileLines.find((line, index) =>
        index > productionStageStart &&
        line.includes('npm install') &&
        line.includes('tsx')
      );

      expect(tsxInstall).toBeUndefined();
    });

    test('should use wrapper script that conditionally runs compiled JavaScript in production', () => {
      // Check that migration scripts use the wrapper script that handles production/dev differences
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJsonContent = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check that migration scripts use the wrapper script
      const migrationScripts = [
        'migrate:status',
        'migrate:up',
        'migrate:down',
        'migrate:create',
        'migrate:validate'
      ];

      migrationScripts.forEach(scriptName => {
        const script = packageJsonContent.scripts[scriptName];
        expect(script).toBeDefined();

        // All scripts should use the wrapper that handles production/dev differences
        expect(script).toMatch(/bash\s+scripts\/migrate-wrapper\.sh/);
      });

      // Verify the wrapper script exists
      const wrapperPath = join(process.cwd(), 'scripts/migrate-wrapper.sh');
      expect(() => readFileSync(wrapperPath, 'utf-8')).not.toThrow();

      // Verify the wrapper handles production vs development correctly
      const wrapperContent = readFileSync(wrapperPath, 'utf-8');
      expect(wrapperContent).toMatch(/NODE_ENV.*production/);
      expect(wrapperContent).toMatch(/lib\/scripts\/migrate\.js/);
      expect(wrapperContent).toMatch(/src\/lib\/scripts\/migrate\.ts/);
      expect(wrapperContent).toMatch(/tsx/);
    });
  });
});