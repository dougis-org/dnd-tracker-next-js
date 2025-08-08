import { render, screen } from '@testing-library/react';
import EncountersPage from '../page';

// Mock the dependencies
jest.mock('@/components/encounter/EncounterListView', () => ({
  EncounterListView: () => <div data-testid="encounter-list">Encounter List</div>,
}));

describe('Issue #625: Dashboard Navigation - Encounters Page', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  test('should render Encounters page without client-side errors', () => {
    expect(() => {
      render(<EncountersPage />);
    }).not.toThrow();

    expect(screen.getByText('Encounters')).toBeInTheDocument();
    expect(screen.getByText('Manage and organize your combat encounters')).toBeInTheDocument();
    expect(screen.getByTestId('encounter-list')).toBeInTheDocument();
  });

  test('should properly export metadata for server component', () => {
    // This test verifies that the server component properly exports metadata
    const pageModule = require('../page');

    // Server components can export metadata
    expect(pageModule.metadata).toBeDefined();
    expect(pageModule.metadata.title).toBe('Encounters - D&D Encounter Tracker');
    expect(pageModule.metadata.description).toBe('Manage and organize your D&D encounters');
  });
});