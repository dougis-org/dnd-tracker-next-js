/* cspell:disable-line globals readonly jsx eslint browserslist typescript nextjs */
import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Global ignores
  {
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'dist/**/*',
      'build/**/*',
      'coverage/**/*',
      'out/**/*',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'plato_report/**/*',
      '**/*.min.js',
      '**/*.bundle.js'
    ]
  },
  // Next.js configuration - includes the plugin automatically
  ...compat.extends('plugin:next/recommended', 'plugin:next/core-web-vitals'),
  // Prettier configuration
  ...compat.extends('prettier'),
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: { // eslint-disable-line
        // Node.js globals // eslint-disable-line
        require: 'readonly', // eslint-disable-line
        module: 'readonly', // eslint-disable-line
        process: 'readonly', // eslint-disable-line
        global: 'readonly', // eslint-disable-line
        console: 'readonly', // eslint-disable-line
        // Browser globals // eslint-disable-line
        window: 'readonly', // eslint-disable-line
        document: 'readonly', // eslint-disable-line
        fetch: 'readonly', // eslint-disable-line
        FormData: 'readonly', // eslint-disable-line
        URL: 'readonly', // eslint-disable-line
        Event: 'readonly', // eslint-disable-line
        Response: 'readonly' // eslint-disable-line
      }
    },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-multiple-empty-lines': 'error',
      'padding-line-between-statements': 'warn',
      'lines-between-class-members': 'error',
      'lines-around-comment': 'warn',
      'newline-before-return': 'off',
      'newline-after-var': 'off',
      'newline-per-chained-call': 'off',
      'no-trailing-spaces': 'error'
    }
  },
  // Test files configuration
  {
    files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.{test,spec}.{js,jsx,ts,tsx}'], // eslint-disable-line
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { // eslint-disable-line
        // Jest globals // eslint-disable-line
        describe: 'readonly', // eslint-disable-line
        test: 'readonly', // eslint-disable-line
        it: 'readonly', // eslint-disable-line
        expect: 'readonly', // eslint-disable-line
        beforeEach: 'readonly', // eslint-disable-line
        afterEach: 'readonly', // eslint-disable-line
        beforeAll: 'readonly', // eslint-disable-line
        afterAll: 'readonly', // eslint-disable-line
        jest: 'readonly', // eslint-disable-line
        // Node.js globals for test files // eslint-disable-line
        require: 'readonly', // eslint-disable-line
        module: 'readonly', // eslint-disable-line
        process: 'readonly', // eslint-disable-line
        global: 'readonly', // eslint-disable-line
        console: 'readonly' // eslint-disable-line
      }
    }
  },
  // Migration files configuration
  {
    files: ['migrations/**/*.js'], // eslint-disable-line
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { // eslint-disable-line
        // Node.js global variables for migration files // eslint-disable-line
        require: 'readonly', // eslint-disable-line
        module: 'readonly', // eslint-disable-line
        exports: 'readonly', // eslint-disable-line
        __dirname: 'readonly', // eslint-disable-line
        __filename: 'readonly', // eslint-disable-line
        global: 'readonly', // eslint-disable-line
        process: 'readonly', // eslint-disable-line
        console: 'readonly' // eslint-disable-line
      }
    }
  },
  // Mock files configuration
  {
    files: ['**/__mocks__/**/*.{js,jsx,ts,tsx}'], // eslint-disable-line
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { // eslint-disable-line
        // Jest globals for mocks // eslint-disable-line
        jest: 'readonly', // eslint-disable-line
        // Node.js globals for mocks // eslint-disable-line
        require: 'readonly', // eslint-disable-line
        module: 'readonly', // eslint-disable-line
        global: 'readonly' // eslint-disable-line
      }
    }
  }
];