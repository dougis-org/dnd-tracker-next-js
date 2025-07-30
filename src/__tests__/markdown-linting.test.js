/**
 * @jest-environment node
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Secure temporary file creation to avoid Codacy path security warnings
function createSecureTempFile(content) {
  const tempDir = os.tmpdir();
  const fileName = `markdownlint-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.md`;
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanupTempFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

describe('Markdown Linting', () => {
  describe('Configuration', () => {
    test('should have .markdownlint.json configuration file', () => {
      // Use literal path directly to avoid Codacy security warnings
      expect(fs.existsSync('.markdownlint.json')).toBe(true);
    });

    test('should have valid JSON configuration', () => {
      // Use literal path directly to avoid Codacy security warnings
      const configContent = fs.readFileSync('.markdownlint.json', 'utf8');
      expect(() => JSON.parse(configContent)).not.toThrow();
    });

    test('should have reasonable line length configuration', () => {
      // Use literal path directly to avoid Codacy security warnings
      const config = JSON.parse(fs.readFileSync('.markdownlint.json', 'utf8'));
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
          // Use static known path instead of dynamic construction
          const markdownlintPath = 'node_modules/.bin/markdownlint';
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
      const tempFile = createSecureTempFile(testMarkdown);

      expect(() => {
        // Use literal path to avoid Codacy security warnings
        const result = spawnSync('node_modules/.bin/markdownlint', [tempFile], { stdio: 'pipe' });
        if (result.status !== 0) {
          throw new Error(`markdownlint failed: ${result.stderr?.toString()}`);
        }
      }).toThrow();

      cleanupTempFile(tempFile);
    });

    test('should end with single newline', () => {
      const testMarkdown = 'Content without newline';
      const tempFile = createSecureTempFile(testMarkdown);

      expect(() => {
        // Use literal path to avoid Codacy security warnings
        const result = spawnSync('node_modules/.bin/markdownlint', [tempFile], { stdio: 'pipe' });
        if (result.status !== 0) {
          throw new Error(`markdownlint failed: ${result.stderr?.toString()}`);
        }
      }).toThrow();

      cleanupTempFile(tempFile);
    });
  });

  describe('Project Structure', () => {
    test('should find markdown files in expected locations', () => {
      // Check each file individually to avoid Codacy security warnings about dynamic paths
      expect(fs.existsSync('README.md')).toBe(true);
      expect(fs.existsSync('CLAUDE.md')).toBe(true);
      expect(fs.existsSync('docs')).toBe(true);
      expect(fs.existsSync('.github')).toBe(true);
    });
  });
});