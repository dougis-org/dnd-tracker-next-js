import { describe, it, expect } from '@jest/globals';
import fs from 'fs';

describe('Production Deployment Configuration', () => {
  describe('Public Assets', () => {
    it('should ensure all feature icons exist in public directory', () => {
      // Use static path construction to prevent path traversal
      const _publicDir = 'public/features'; // Prefixed with _ to indicate intentionally unused
      const expectedIcons = [
        'initiative-tracker.svg',
        'hp-management.svg',
        'character-management.svg',
        'encounter-builder.svg',
        'lair-actions.svg',
        'mobile-ready.svg'
      ];

      expectedIcons.forEach(iconFile => {
        // Validate filename contains only expected characters to prevent path traversal
        if (!/^[a-zA-Z0-9-_.]+\.svg$/.test(iconFile)) {
          throw new Error(`Invalid icon filename: ${iconFile}`);
        }
        const { safeTestFileExists } = require('../../../test-utils/secure-filesystem');
        const iconPath = `public/features/${iconFile}`;
        expect(safeTestFileExists(iconPath)).toBe(true);
      });
    });

    it('should verify Dockerfile includes public folder in production stage', () => {
      // Use static known path instead of dynamic construction
      const dockerfilePath = 'Dockerfile';
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

      // Check that public folder is copied in production stage
      expect(dockerfileContent).toMatch(/COPY.*--from=build.*\/app\/public.*\.\/public/);
    });
  });
});