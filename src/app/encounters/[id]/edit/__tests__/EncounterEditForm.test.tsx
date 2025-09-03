/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EncounterEditForm } from '../components/EncounterEditForm';
import {
  createTestEncounter,
  createTestParticipant,
} from '../../__tests__/test-helpers';

describe('EncounterEditForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnReset = jest.fn();

  const mockEncounter = createTestEncounter({
    name: 'Test Encounter',
    description: 'A test encounter description',
    difficulty: 'medium',
    estimatedDuration: 60,
    targetLevel: 5,
    participants: [
      createTestParticipant({
        name: 'Test Player',
        type: 'pc',
        maxHitPoints: 50,
        currentHitPoints: 50,
        armorClass: 16,
      }),
    ],
    tags: ['test', 'combat'],
    settings: {
      allowPlayerVisibility: true,
      autoRollInitiative: false,
      trackResources: true,
      enableLairActions: false,
      lairActionInitiative: undefined,
      enableGridMovement: false,
      gridSize: 5,
      roundTimeLimit: undefined,
      experienceThreshold: undefined,
    },
  });

  // Helper to render form with default props
  const renderForm = (overrides = {}) => {
    const defaultProps = {
      encounter: mockEncounter,
      onSubmit: mockOnSubmit,
      onCancel: mockOnCancel,
      onReset: mockOnReset,
      isSubmitting: false,
      ...overrides,
    };
    return render(<EncounterEditForm {...defaultProps} />);
  };

  // Helper to check multiple toggle states at once
  const expectToggleStates = (toggleChecks: Array<{label: string, state: 'checked' | 'unchecked'}>) => {
    toggleChecks.forEach(({label, state}) => {
      expect(screen.getByLabelText(label)).toHaveAttribute('data-state', state);
    });
  };

  // Helper for common form sections check
  const expectFormSections = (sections: string[]) => {
    sections.forEach(section => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });
  };

  // Helper for common button interactions
  const clickButtonAndExpectCall = async (user: ReturnType<typeof userEvent.setup>, buttonText: string, mockFn: jest.Mock) => {
    const button = screen.getByText(buttonText);
    await user.click(button);
    expect(mockFn).toHaveBeenCalled();
  };

  // Helper for checking accessibility labels
  const expectAccessibilityLabels = (labels: string[]) => {
    labels.forEach(label => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render all form sections', () => {
      renderForm();
      expectFormSections(['Basic Information', 'Participants', 'Combat Settings', 'Save Encounter', 'Cancel', 'Reset']);
    });

    it('should display form with proper accessibility attributes', () => {
      renderForm();

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute('aria-label', 'Edit encounter form');
    });
  });

  describe('Basic Information Section', () => {
    it('should render basic info fields with correct values', () => {
      renderForm();

      expect(screen.getByDisplayValue('Test Encounter')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test encounter description')).toBeInTheDocument();
      // Check for select trigger content
      expect(screen.getByRole('combobox')).toHaveAttribute('data-state', 'closed');
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      // TODO: Fix validation timing issues - see Issue #290
      const user = userEvent.setup();
      renderForm();

      const nameInput = screen.getByDisplayValue('Test Encounter');
      await user.clear(nameInput);
      await user.tab(); // Trigger blur event for validation

      const submitButton = screen.getByText('Save Encounter');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText('Name is required')[0]).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate numeric fields', async () => {
      // TODO: Fix validation timing issues - see Issue #290
      const user = userEvent.setup();
      renderForm();

      const durationInput = screen.getByDisplayValue('60');
      await user.clear(durationInput);
      await user.type(durationInput, '-10');
      await user.tab(); // Trigger blur event for validation

      const submitButton = screen.getByText('Save Encounter');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText('Duration must be positive')[0]).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should validate level range', async () => {
      // TODO: Fix validation timing issues - see Issue #290
      const user = userEvent.setup();
      render(
        <EncounterEditForm
          encounter={mockEncounter}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          onReset={mockOnReset}
          isSubmitting={false}
        />
      );

      const levelInput = screen.getByDisplayValue('5');
      await user.clear(levelInput);
      await user.type(levelInput, '25');
      await user.tab(); // Trigger blur event for validation

      const submitButton = screen.getByText('Save Encounter');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText('Level must be between 1 and 20')[0]).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Tags Management', () => {
    it('should display existing tags', () => {
      renderForm();

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('combat')).toBeInTheDocument();
    });

    it('should allow adding new tags', async () => {
      const user = userEvent.setup();
      renderForm();

      const tagInput = screen.getByPlaceholderText('Add tag...');
      await user.type(tagInput, 'new-tag{enter}');

      expect(screen.getByText('new-tag')).toBeInTheDocument();
    });

    it('should allow removing tags', async () => {
      const user = userEvent.setup();
      renderForm();

      const removeButtons = screen.getAllByLabelText(/Remove tag/);
      expect(removeButtons.length).toBeGreaterThan(0);

      await user.click(removeButtons[0]);

      // Check that one of the original tags is no longer present
      await waitFor(() => {
        const tagElements = screen.queryAllByText('test');
        expect(tagElements.length).toBe(0);
      });
    });
  });

  describe('Participants Section', () => {
    it('should display participant list', () => {
      // TODO: Fix participant display text format - see Issue #290
      renderForm();

      expect(screen.getByText('Test Player')).toBeInTheDocument();
      expect(screen.getByText(/PC • HP: 50\/50 • AC: 16/)).toBeInTheDocument();
    });

    it('should show participant management section', () => {
      renderForm();

      // Since participant editing is simplified for MVP, check for the coming soon message
      expect(screen.getByText(/Participant management for encounter editing is coming soon/)).toBeInTheDocument();
    });

    it('should show empty state for no participants', () => {
      const emptyEncounter = createTestEncounter({ participants: [] });

      renderForm({ encounter: emptyEncounter });

      // Check for empty state message since participants are optional in UpdateEncounter
      expect(screen.getByText(/No participants added yet/)).toBeInTheDocument();
    });
  });

  describe('Settings Section', () => {
    it('should render all setting toggles', () => {
      renderForm();
      expectAccessibilityLabels(['Allow Player Visibility', 'Auto-roll Initiative', 'Track Resources', 'Enable Lair Actions', 'Enable Grid Movement']);
    });

    it('should reflect current setting values', () => {
      renderForm();
      expectToggleStates([
        { label: 'Allow Player Visibility', state: 'checked' },
        { label: 'Auto-roll Initiative', state: 'unchecked' },
        { label: 'Track Resources', state: 'checked' },
        { label: 'Enable Lair Actions', state: 'unchecked' },
        { label: 'Enable Grid Movement', state: 'unchecked' }
      ]);
    });

    it('should show conditional lair action settings', async () => {
      const user = userEvent.setup();
      renderForm();

      const lairToggle = screen.getByLabelText('Enable Lair Actions');
      await user.click(lairToggle);

      expect(screen.getByLabelText('Lair Action Initiative')).toBeInTheDocument();
    });

    it('should show conditional grid movement settings', async () => {
      const user = userEvent.setup();
      renderForm();

      const gridToggle = screen.getByLabelText('Enable Grid Movement');
      await user.click(gridToggle);

      expect(screen.getByLabelText('Grid Size (feet)')).toBeInTheDocument();
    });
  });

  describe('Form Actions', () => {
    it('should call onSubmit with form data when valid', async () => {
      // TODO: Fix form submission timing - see Issue #290
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByText('Save Encounter');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Encounter',
            description: 'A test encounter description',
            difficulty: 'medium',
            estimatedDuration: 60,
            targetLevel: 5,
          })
        );
      }, { timeout: 5000 });
    });

    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      renderForm();
      await clickButtonAndExpectCall(user, 'Cancel', mockOnCancel);
    });

    it('should call onReset when reset button clicked', async () => {
      const user = userEvent.setup();
      renderForm();

      // First make a change to enable the reset button
      const nameInput = screen.getByDisplayValue('Test Encounter');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Encounter');

      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);

      expect(mockOnReset).toHaveBeenCalled();
    });

    it('should disable submit button when submitting', () => {
      renderForm({ isSubmitting: true });

      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state when submitting', () => {
      renderForm({ isSubmitting: true });

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.queryByText('Save Encounter')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderForm();
      expectAccessibilityLabels(['Encounter Name', 'Description', 'Difficulty', 'Estimated Duration (minutes)', 'Target Level']);
    });

    it('should associate error messages with form fields', async () => {
      // TODO: Fix validation error association timing - see Issue #290
      const user = userEvent.setup();
      renderForm();

      const nameInput = screen.getByLabelText('Encounter Name');
      await user.clear(nameInput);
      await user.tab(); // Trigger blur event for validation
      await user.click(screen.getByText('Save Encounter'));

      await waitFor(() => {
        const errorMessage = screen.getAllByText('Name is required')[0];
        expect(errorMessage).toBeInTheDocument();
        // Check that the input has the aria-describedby attribute
        expect(nameInput).toHaveAttribute('aria-describedby', 'encounter-name-error');
      }, { timeout: 5000 });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderForm();

      const nameInput = screen.getByLabelText('Encounter Name');
      const descriptionInput = screen.getByLabelText('Description');

      await user.click(nameInput);
      await user.tab();

      expect(descriptionInput).toHaveFocus();
    });
  });
});