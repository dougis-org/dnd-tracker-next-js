import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterCreationForm } from '../CharacterCreationForm';
import { CharacterService } from '@/lib/services/CharacterService';
import { containsTextIgnoreCase } from '../../../../test-utils/secure-regexp';

// Mock the CharacterService
jest.mock('@/lib/services/CharacterService');
const mockCharacterService = CharacterService as jest.Mocked<typeof CharacterService>;

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('CharacterCreationForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultProps = {
    ownerId: 'user123',
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
    isOpen: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCharacterService.createCharacter.mockResolvedValue({
      success: true,
      data: {
        id: 'char123',
        name: 'Test Character',
        type: 'pc',
        level: 1,
      } as any,
    });
  });

  describe('Form Rendering', () => {
    it('renders the character creation form with all required sections', () => {
      render(<CharacterCreationForm {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Character')).toBeInTheDocument();

      // Check for form sections
      expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/character type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/race/i)).toBeInTheDocument();
    });

    it('renders all ability score fields', () => {
      render(<CharacterCreationForm {...defaultProps} />);

      const abilityScores = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
      abilityScores.forEach(ability => {
        expect(screen.getByLabelText((content) => containsTextIgnoreCase(content, ability))).toBeInTheDocument();
      });
    });

    it('renders character class selection', () => {
      render(<CharacterCreationForm {...defaultProps} />);

      expect(screen.getByLabelText(/character class/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/level/i)).toBeInTheDocument();
    });

    it('renders combat stats fields', () => {
      render(<CharacterCreationForm {...defaultProps} />);

      expect(screen.getByLabelText(/hit points/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/armor class/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      render(<CharacterCreationForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create character/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/character name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/character type is required/i)).toBeInTheDocument();
        expect(screen.getByText(/race is required/i)).toBeInTheDocument();
      });
    });

    it('validates ability scores are within valid range', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const strengthField = screen.getByLabelText(/strength/i);
      await user.clear(strengthField);
      await user.type(strengthField, '31');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/strength must be between 1 and 30/i)).toBeInTheDocument();
      });
    });

    it('validates character name length', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const nameField = screen.getByLabelText(/character name/i);
      await user.type(nameField, 'A');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/character name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('validates hit points are positive', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const hpField = screen.getByLabelText(/hit points/i);
      await user.clear(hpField);
      await user.type(hpField, '-5');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/hit points must be at least 0/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-class Support', () => {
    it('allows adding additional classes', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const addClassButton = screen.getByRole('button', { name: /add class/i });
      await user.click(addClassButton);

      expect(screen.getAllByLabelText(/character class/i)).toHaveLength(2);
      expect(screen.getAllByLabelText(/level/i)).toHaveLength(2);
    });

    it('limits to maximum 3 classes', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const addClassButton = screen.getByRole('button', { name: /add class/i });

      // Add second class
      await user.click(addClassButton);
      // Add third class
      await user.click(addClassButton);

      // Button should be disabled now
      expect(addClassButton).toBeDisabled();
      expect(screen.getAllByLabelText(/character class/i)).toHaveLength(3);
    });

    it('allows removing additional classes', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      // Add a second class
      const addClassButton = screen.getByRole('button', { name: /add class/i });
      await user.click(addClassButton);

      // Remove the second class
      const removeButtons = screen.getAllByRole('button', { name: /remove class/i });
      await user.click(removeButtons[1]);

      expect(screen.getAllByLabelText(/character class/i)).toHaveLength(1);
    });
  });

  describe('Race Selection', () => {
    it('shows race dropdown with all available races', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const raceSelect = screen.getByLabelText(/race/i);
      await user.click(raceSelect);

      // Check for common D&D races
      expect(screen.getByText('Human')).toBeInTheDocument();
      expect(screen.getByText('Elf')).toBeInTheDocument();
      expect(screen.getByText('Dwarf')).toBeInTheDocument();
      expect(screen.getByText('Halfling')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('shows custom race input when custom is selected', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const raceSelect = screen.getByLabelText(/race/i);
      await user.click(raceSelect);
      await user.click(screen.getByText('Custom'));

      expect(screen.getByLabelText(/custom race name/i)).toBeInTheDocument();
    });
  });

  describe('Character Preview', () => {
    it('shows character preview when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      await user.selectOptions(screen.getByLabelText(/character type/i), 'pc');
      await user.click(screen.getByLabelText(/race/i));
      await user.click(screen.getByText('Human'));

      // Fill ability scores
      const abilityFields = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
      for (const ability of abilityFields) {
        const field = screen.getByLabelText((content) => containsTextIgnoreCase(content, ability));
        await user.clear(field);
        await user.type(field, '15');
      }

      // Fill combat stats
      await user.type(screen.getByLabelText(/hit points/i), '10');
      await user.type(screen.getByLabelText(/armor class/i), '12');

      // Preview should be visible
      expect(screen.getByText('Character Preview')).toBeInTheDocument();
      expect(screen.getByText('Test Hero')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      // Fill out the form
      await user.type(screen.getByLabelText(/character name/i), 'Test Character');
      await user.selectOptions(screen.getByLabelText(/character type/i), 'pc');
      await user.click(screen.getByLabelText(/race/i));
      await user.click(screen.getByText('Human'));

      // Fill ability scores
      const abilityFields = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
      for (const ability of abilityFields) {
        const field = screen.getByLabelText((content) => containsTextIgnoreCase(content, ability));
        await user.clear(field);
        await user.type(field, '15');
      }

      await user.type(screen.getByLabelText(/hit points/i), '10');
      await user.type(screen.getByLabelText(/armor class/i), '12');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCharacterService.createCharacter).toHaveBeenCalledWith('user123', expect.objectContaining({
          name: 'Test Character',
          type: 'pc',
          race: 'human',
          abilityScores: expect.objectContaining({
            strength: 15,
            dexterity: 15,
            constitution: 15,
            intelligence: 15,
            wisdom: 15,
            charisma: 15,
          }),
          hitPoints: expect.objectContaining({
            maximum: 10,
            current: 10,
          }),
          armorClass: 12,
        }));
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      mockCharacterService.createCharacter.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} as any }), 100))
      );

      render(<CharacterCreationForm {...defaultProps} />);

      // Fill required fields (minimal)
      await user.type(screen.getByLabelText(/character name/i), 'Test');
      await user.selectOptions(screen.getByLabelText(/character type/i), 'pc');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      expect(screen.getByText(/creating character/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();
      mockCharacterService.createCharacter.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid character data',
          details: { field: 'name', message: 'Character name is too long' },
        },
      });

      render(<CharacterCreationForm {...defaultProps} />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/character name/i), 'Test');
      await user.selectOptions(screen.getByLabelText(/character type/i), 'pc');

      const submitButton = screen.getByRole('button', { name: /create character/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid character data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Cancellation', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not submit when dialog is closed', async () => {
      const user = userEvent.setup();
      render(<CharacterCreationForm {...defaultProps} />);

      // Fill some fields
      await user.type(screen.getByLabelText(/character name/i), 'Test');

      // Close dialog
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockCharacterService.createCharacter).not.toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<CharacterCreationForm {...defaultProps} />);

      // Check that all form controls have labels
      const nameField = screen.getByLabelText(/character name/i);
      expect(nameField).toHaveAttribute('aria-required', 'true');

      const typeField = screen.getByLabelText(/character type/i);
      expect(typeField).toHaveAttribute('aria-required', 'true');

      // Check ability score fields have proper labels
      const strengthField = screen.getByLabelText(/strength/i);
      expect(strengthField).toHaveAttribute('type', 'number');
      expect(strengthField).toHaveAttribute('min', '1');
      expect(strengthField).toHaveAttribute('max', '30');
    });

    it('announces form errors to screen readers', async () => {
      render(<CharacterCreationForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create character/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/character name is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});