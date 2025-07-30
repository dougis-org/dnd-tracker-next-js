/**
 * @jest-environment node
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Markdown Linting', () => {
  describe('Configuration', () => {
    test('should have .markdownlint.json configuration file', () => {
      // Use static known path instead of dynamic construction
      const configPath = '.markdownlint.json';
      expect(fs.existsSync(configPath)).toBe(true);
    });

    test('should have valid JSON configuration', () => {
      // Use static known path instead of dynamic construction
      const configPath = '.markdownlint.json';
      const configContent = fs.readFileSync(configPath, 'utf8');
      expect(() => JSON.parse(configContent)).not.toThrow();
    });

    test('should have reasonable line length configuration', () => {
      // Use static known path instead of dynamic construction
      const configPath = '.markdownlint.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.MD013).toBeDefined();
      expect(config.MD013.line_length).toBeGreaterThanOrEqual(120);
    });
  });

  describe('Key Documentation Files', () => {
    const keyFiles = [
      'README.md',
      'CLAUDE.md',
      'ISSUE_348_STATUS.md'
    ];

    keyFiles.forEach(file => {
      test(`${file} should pass markdownlint`, () => {
        expect(() => {
<<<<<<< HEAD
          // Use local markdownlint-cli installation to prevent npx issues
          const markdownlintPath = path.resolve(process.cwd(), 'node_modules', '.bin', 'markdownlint');
=======
          // Use static known path instead of dynamic construction
          const markdownlintPath = 'node_modules/.bin/markdownlint';
>>>>>>> bba1f1c (Phase 2.3: Ensure middleware respects authentication)
          const result = spawnSync(markdownlintPath, [file], { stdio: 'pipe' });
          if (result.status !== 0) {
            throw new Error(`markdownlint failed for ${file}: ${result.stderr?.toString()}`);
          }
        }).not.toThrow();
      });
    });
  });

  describe('Markdown Style Guidelines', () => {
    test('should not have multiple consecutive blank lines', () => {
      const testMarkdown = 'Header\n\n\n\nContent';
      const tempFile = path.resolve(process.cwd(), `test-temp-${Date.now()}.md`);
      fs.writeFileSync(tempFile, testMarkdown);

      expect(() => {
        // Use static known path instead of dynamic construction
        const markdownlintPath = 'node_modules/.bin/markdownlint';
        const result = spawnSync(markdownlintPath, [tempFile], { stdio: 'pipe' });
        if (result.status !== 0) {
          throw new Error(`markdownlint failed: ${result.stderr?.toString()}`);
        }
      }).toThrow();

      fs.unlinkSync(tempFile);
    });

    test('should end with single newline', () => {
      const testMarkdown = 'Content without newline';
      const tempFile = path.resolve(process.cwd(), 'test-temp.md');
      fs.writeFileSync(tempFile, testMarkdown);

      expect(() => {
        // Use static known path instead of dynamic construction
        const markdownlintPath = 'node_modules/.bin/markdownlint';
        const result = spawnSync(markdownlintPath, [tempFile], { stdio: 'pipe' });
        if (result.status !== 0) {
          throw new Error(`markdownlint failed: ${result.stderr?.toString()}`);
        }
      }).toThrow();

      fs.unlinkSync(tempFile);
    });
  });

  describe('Project Structure', () => {
    test('should find markdown files in expected locations', () => {
      const expectedFiles = [
        'README.md',
        'CLAUDE.md',
        'docs',
        '.github'
      ];

      expectedFiles.forEach(item => {
        expect(fs.existsSync(item)).toBe(true);
      });
    });
  });
});