import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

/**
 * Test helpers for characters page tests to reduce code duplication
 */

export const mockSessionSetup = {
  authenticated: {
    data: {
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    },
    status: 'authenticated' as const,
  },
  loading: {
    data: null,
    status: 'loading' as const,
  },
  unauthenticated: {
    data: null,
    status: 'unauthenticated' as const,
  },
};

// Common element getters to reduce duplication
const getElement = (testId: string) => screen.getByTestId(testId);
const getFormElement = () => getElement('character-creation-form');
const getMainCreateButton = () => {
  const createButtons = screen.getAllByRole('button', { name: /create character/i });
  return createButtons.find(button =>
    !button.hasAttribute('data-testid') ||
    button.getAttribute('data-testid') !== 'create-character-empty'
  );
};

// Common action helpers
const clickElement = (testId: string) => fireEvent.click(getElement(testId));
const expectElementStyle = (element: HTMLElement, style: string, value: string) =>
  expect(element).toHaveStyle(`${style}: ${value}`);

export const formHelpers = {
  expectFormHidden: () => expectElementStyle(getFormElement(), 'display', 'none'),
  expectFormVisible: () => expectElementStyle(getFormElement(), 'display', 'block'),
  getMainCreateButton,
  clickMainCreateButton: () => {
    const button = getMainCreateButton();
    if (button) fireEvent.click(button);
    return button;
  },
  clickEmptyStateCreateButton: () => clickElement('create-character-empty'),
  clickCreationSuccess: () => clickElement('creation-success'),
  clickCreationCancel: () => clickElement('creation-cancel'),
};

export const testActions = {
  selectCharacter: () => clickElement('select-character'),
  editCharacter: () => clickElement('edit-character'),
  deleteCharacter: () => clickElement('delete-character'),
  duplicateCharacter: () => clickElement('duplicate-character'),
};

// Common expectation helpers
const expectElementExists = (testId: string) => expect(getElement(testId)).toBeInTheDocument();
const expectTextExists = (text: string) => expect(screen.getByText(text)).toBeInTheDocument();
const expectMultipleElements = (testIds: string[]) => testIds.forEach(expectElementExists);

export const expectations = {
  pageContent: () => {
    expectTextExists('Characters');
    expectTextExists('Manage and organize your D&D characters');
  },
  characterListView: () => expectElementExists('character-list-view'),
  characterCreationForm: () => expectElementExists('character-creation-form'),
  loadingState: () => expectTextExists('Loading...'),
  // AppLayout is now handled at root level, not per page
  appLayout: () => {
    // Characters page no longer wraps content in AppLayout - verify content structure instead
    const pageContent = document.querySelector('[class*="space-y-6"]') ||
                       document.querySelector('[class*="flex items-center justify-center"]') ||
                       screen.queryByText('Characters') ||
                       screen.queryByText('Loading...');
    expect(pageContent).toBeInTheDocument();
  },
  headingStructure: () => {
    const heading = screen.getByRole('heading', { name: 'Characters' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
  },
  createButtonsExist: () => {
    const createButtons = screen.getAllByRole('button', { name: /create character/i });
    expect(createButtons.length).toBeGreaterThan(0);
    return createButtons;
  },
  formControls: () => expectMultipleElements(['creation-success', 'creation-cancel']),
  characterActions: () => expectMultipleElements([
    'select-character', 'edit-character', 'delete-character', 'duplicate-character', 'create-character-empty'
  ]),
};

export const createButtonHelpers = {
  findMainCreateButton: getMainCreateButton,
  verifyMainCreateButton: () => {
    const mainCreateButton = getMainCreateButton();
    expect(mainCreateButton).toBeInTheDocument();
    expect(mainCreateButton).toBeEnabled();
    return mainCreateButton;
  },
};

export const renderHelpers = {
  renderPage: () => {
    const { render } = require('@testing-library/react');
    const CharactersPage = require('../page').default;
    return render(React.createElement(CharactersPage));
  },
};