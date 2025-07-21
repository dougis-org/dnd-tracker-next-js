/**
 * @jest-environment node
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Markdown Linting', () => {
  describe('Configuration', () => {
    test('should have .markdownlint.json configuration file', () => {
      const configPath = path.join(process.cwd(), '.markdownlint.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    test('should have valid JSON configuration', () => {
      const configPath = path.join(process.cwd(), '.markdownlint.json');
      const configContent = fs.readFileSync(configPath, 'utf8');
      expect(() => JSON.parse(configContent)).not.toThrow();
    });

    test('should have reasonable line length configuration', () => {
      const configPath = path.join(process.cwd(), '.markdownlint.json');
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
          execSync(`npx markdownlint ${file}`, { stdio: 'pipe' });
        }).not.toThrow();
      });
    });
  });

  describe('Markdown Style Guidelines', () => {
    test('should not have multiple consecutive blank lines', () => {
      const testMarkdown = 'Header\n\n\n\nContent';
const tempFile = `test-temp-${Date.now()}.md`;
      fs.writeFileSync(tempFile, testMarkdown);

      expect(() => {
        execSync(`npx markdownlint ${tempFile}`, { stdio: 'pipe' });
      }).toThrow();

      fs.unlinkSync(tempFile);
    });

    test('should end with single newline', () => {
      const testMarkdown = 'Content without newline';
      const tempFile = 'test-temp.md';
      fs.writeFileSync(tempFile, testMarkdown);

      expect(() => {
        execSync(`npx markdownlint ${tempFile}`, { stdio: 'pipe' });
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