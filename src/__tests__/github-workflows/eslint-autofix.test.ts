import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('ESLint Auto-Fix GitHub Action', function() {
  const workflowPath = path.join(process.cwd(), '.github/workflows/eslint-autofix.yml');

  test('workflow file should exist', function() {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  test('workflow should trigger on pull request', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('pull_request');
  });

  test('workflow should run ESLint with fix parameter', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('npm run lint:fix');
  });

  test('workflow should commit changes if any fixes are made', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git add');
    expect(workflowContent).toContain('git commit');
  });

  test('workflow should push changes back to the PR branch', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git push');
  });

  test('workflow should include proper permissions', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('contents: write');
  });

  test('workflow should only run on open pull requests', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('types: [opened, synchronize]');
  });

  test('workflow should include git configuration for commits', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git config');
    expect(workflowContent).toContain('user.name');
    expect(workflowContent).toContain('user.email');
  });

  test('workflow should include commit message mentioning auto-correction', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('auto corrected by GitHub action');
  });

  test('workflow should check for changes before committing', function() {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git diff --staged --quiet');
  });
});