/**
 * Common test assertion helpers to reduce duplication
 */
import { screen } from '@testing-library/react';
import { createSafeTestRegExp } from '../../../../test-utils/secure-regexp';

// Common loading state assertions
export const assertLoadingState = (expectedCount: number) => {
  const loadingCards = screen.getAllByTestId('loading-card');
  expect(loadingCards).toHaveLength(expectedCount);
  loadingCards.forEach(card => {
    expect(card).toBeInTheDocument();
  });
};

// Common empty state assertions
export const assertEmptyState = (title = 'No encounters found', description?: string) => {
  expect(screen.getByText(title)).toBeInTheDocument();
  if (description) {
    expect(screen.getByText((content, element) => {
      return content?.includes(description) || false;
    })).toBeInTheDocument();
  }
};

// Common grid layout assertions
export const assertGridLayout = () => {
  const gridContainer = screen.getAllByTestId(/encounter-card-|loading-card/)[0]?.parentElement;
  expect(gridContainer).toHaveClass(
    'grid',
    'grid-cols-1',
    'md:grid-cols-2',
    'lg:grid-cols-3',
    'xl:grid-cols-4',
    'gap-6'
  );
};

// Common table structure assertions
export const assertTableStructure = () => {
  const table = screen.getByRole('table');
  expect(table).toBeInTheDocument();
  expect(table).toHaveClass('w-full');
};

// Common encounter card assertions
export const assertEncounterCard = (encounterId: string, encounterName: string) => {
  expect(screen.getByTestId(`encounter-card-${encounterId}`)).toBeInTheDocument();
  expect(screen.getByText(`Mock EncounterCard: ${encounterName}`)).toBeInTheDocument();
};

// Common selection state assertions
export const assertSelectionState = (encounterId: string, isSelected: boolean) => {
  const card = screen.getByTestId(`encounter-card-${encounterId}`);
  expect(card).toHaveTextContent(`Selected: ${isSelected}`);
};

// Common table cell styling assertions
export const assertTableCellStyling = (cellText: string) => {
  const cell = screen.getByText(cellText).closest('td');
  expect(cell).toHaveClass('p-4');
};

// Common button accessibility assertions
export const assertButtonAccessibility = (buttonRole = 'button') => {
  const buttons = screen.getAllByRole(buttonRole);
  expect(buttons.length).toBeGreaterThan(0);
  buttons.forEach(button => {
    expect(button).toBeInTheDocument();
  });
};