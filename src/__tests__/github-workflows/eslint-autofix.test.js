const fs = require('fs');
const path = require('path');

describe('ESLint Auto-Fix GitHub Action', () => {
  const workflowPath = path.join(process.cwd(), '.github/workflows/eslint-autofix.yml');

  test('workflow file should exist', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  test('workflow should trigger on pull request', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('pull_request');
  });

  test('workflow should run ESLint with fix parameter', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('npm run lint:fix');
  });

  test('workflow should commit changes if any fixes are made', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git add');
    expect(workflowContent).toContain('git commit');
  });

  test('workflow should push changes back to the PR branch', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git push');
  });

  test('workflow should include proper permissions', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('contents: write');
  });

  test('workflow should only run on open pull requests', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('types: [opened, synchronize]');
  });

  test('workflow should include git configuration for commits', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git config');
    expect(workflowContent).toContain('user.name');
    expect(workflowContent).toContain('user.email');
  });

  test('workflow should include commit message mentioning auto-correction', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('auto corrected by GitHub action');
  });

  test('workflow should check for changes before committing', () => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    expect(workflowContent).toContain('git diff --staged --quiet');
  });
});