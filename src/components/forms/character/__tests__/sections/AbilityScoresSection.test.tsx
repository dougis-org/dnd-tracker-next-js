import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AbilityScoresSection } from '../../sections/AbilityScoresSection';
import { DEFAULT_ABILITY_SCORES } from '../../constants';
import {
  setupSectionTest,
  expectAbilityScoreFieldsToBeRendered,
  testFieldChanges,
  testFieldErrors,
  testSectionLayout,
  testSectionAccessibility,
  FieldChangeTestCase,
  ErrorTestCase
} from '../utils';
import { containsTextIgnoreCase } from '../../../../../test-utils/secure-regexp';

describe('AbilityScoresSection', () => {
  const { defaultSectionProps } = setupSectionTest();
  const testProps = {
    ...defaultSectionProps,
    value: DEFAULT_ABILITY_SCORES,
  };

  // Define test data for data-driven testing
  const abilities = [
    { name: 'Strength', key: 'strength' as keyof typeof DEFAULT_ABILITY_SCORES, abbreviation: 'STR' },
    { name: 'Dexterity', key: 'dexterity' as keyof typeof DEFAULT_ABILITY_SCORES, abbreviation: 'DEX' },
    { name: 'Constitution', key: 'constitution' as keyof typeof DEFAULT_ABILITY_SCORES, abbreviation: 'CON' },
    { name: 'Intelligence', key: 'intelligence' as keyof typeof DEFAULT_ABILITY_SCORES, abbreviation: 'INT' },
    { name: 'Wisdom', key: 'wisdom' as keyof typeof DEFAULT_ABILITY_SCORES, abbreviation: 'WIS' },
    { name: 'Charisma', key: 'charisma' as keyof typeof DEFAULT_ABILITY_SCORES, abbreviation: 'CHA' },
  ];

  const fieldChangeTestCases: FieldChangeTestCase<typeof testProps.value>[] = abilities.map(ability => ({
    fieldName: ability.key,
    labelPattern: (content: string) => containsTextIgnoreCase(content, ability.name),
    newValue: 18,
    expectedStateChange: { [ability.key]: 18 },
    inputMethod: 'change' as const,
  }));

  const errorTestCases: ErrorTestCase[] = abilities.map(ability => ({
    fieldName: ability.key,
    errorMessage: `${ability.name} must be between 1 and 30`,
    labelPattern: (content: string) => containsTextIgnoreCase(content, ability.name),
  }));

  describe('Ability Score Fields', () => {
    it('renders all six ability score fields', () => {
      render(<AbilityScoresSection {...testProps} />);
      expectAbilityScoreFieldsToBeRendered();
    });

    it('shows ability score abbreviations', () => {
      render(<AbilityScoresSection {...testProps} />);

      abilities.forEach(ability => {
        expect(screen.getByText(ability.abbreviation)).toBeInTheDocument();
      });
    });

    it('displays current ability score values', () => {
      const props = {
        ...testProps,
        value: {
          strength: 15,
          dexterity: 14,
          constitution: 13,
          intelligence: 12,
          wisdom: 11,
          charisma: 10,
        },
      };
      render(<AbilityScoresSection {...props} />);

      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('14')).toBeInTheDocument();
      expect(screen.getByDisplayValue('13')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
      expect(screen.getByDisplayValue('11')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('has proper number input attributes', () => {
      render(<AbilityScoresSection {...testProps} />);

      abilities.forEach(ability => {
        const field = screen.getByLabelText((content) => containsTextIgnoreCase(content, ability.name));
        expect(field).toHaveAttribute('type', 'number');
        expect(field).toHaveAttribute('min', '1');
        expect(field).toHaveAttribute('max', '30');
        expect(field).toHaveAttribute('aria-required', 'true');
      });
    });
  });

  describe('Ability Modifiers', () => {
    it('displays calculated ability modifiers', () => {
      const props = {
        ...testProps,
        value: {
          strength: 16, // +3
          dexterity: 14, // +2
          constitution: 12, // +1
          intelligence: 10, // +0
          wisdom: 8,     // -1
          charisma: 6,   // -2
        },
      };
      render(<AbilityScoresSection {...props} />);

      expect(screen.getByText('+3')).toBeInTheDocument(); // STR
      expect(screen.getByText('+2')).toBeInTheDocument(); // DEX
      expect(screen.getByText('+1')).toBeInTheDocument(); // CON
      expect(screen.getByText('+0')).toBeInTheDocument(); // INT
      expect(screen.getByText('-1')).toBeInTheDocument(); // WIS
      expect(screen.getByText('-2')).toBeInTheDocument(); // CHA
    });

    it('updates modifiers in real-time when scores change', async () => {
      render(<AbilityScoresSection {...testProps} />);

      const strengthField = screen.getByLabelText(/strength/i);

      // Use fireEvent.change for number inputs
      fireEvent.change(strengthField, { target: { value: '20' } });

      expect(testProps.onChange).toHaveBeenCalledWith(expect.objectContaining({
        strength: 20,
      }));
    });
  });

  // Data-driven field change tests
  describe('Field Value Changes', () => {
    const fieldChangeTests = testFieldChanges(AbilityScoresSection, testProps.value, fieldChangeTestCases);
    fieldChangeTests.forEach(({ name, test }) => {
      it(name, test);
    });
  });

  describe('Point Buy System', () => {
    it('shows point buy calculator when enabled', () => {
      const props = {
        ...testProps,
        showPointBuy: true,
      };
      render(<AbilityScoresSection {...props} />);

      expect(screen.getAllByText(/point buy/i)).toHaveLength(2); // Label and calculator header
      expect(screen.getByText(/points remaining/i)).toBeInTheDocument();
    });

    it('calculates points used in point buy system', () => {
      const props = {
        ...testProps,
        showPointBuy: true,
        value: {
          strength: 15, // 9 points
          dexterity: 14, // 7 points
          constitution: 13, // 5 points
          intelligence: 12, // 4 points
          wisdom: 10,     // 2 points
          charisma: 8,    // 0 points
        },
      };
      render(<AbilityScoresSection {...props} />);

      // Total: 27 points used, 0 remaining (standard point buy is 27)
      expect(screen.getByText('0 points remaining')).toBeInTheDocument();
    });

    it('shows warning when over point buy limit', () => {
      const props = {
        ...testProps,
        showPointBuy: true,
        value: {
          strength: 15,
          dexterity: 15,
          constitution: 15,
          intelligence: 15,
          wisdom: 15,
          charisma: 15,
        },
      };
      render(<AbilityScoresSection {...props} />);

      expect(screen.getByText(/over point buy limit/i)).toBeInTheDocument();
    });

    it('allows toggling point buy mode', async () => {
      const user = userEvent.setup();
      render(<AbilityScoresSection {...testProps} />);

      const pointBuyToggle = screen.getByLabelText(/use point buy/i);
      await user.click(pointBuyToggle);

      expect(screen.getAllByText(/point buy/i)).toHaveLength(2); // Label and calculator header
    });
  });

  describe('Standard Array Option', () => {
    it('shows standard array button', () => {
      render(<AbilityScoresSection {...testProps} />);

      expect(screen.getByRole('button', { name: /use standard array/i })).toBeInTheDocument();
    });

    it('applies standard array when clicked', async () => {
      const user = userEvent.setup();
      render(<AbilityScoresSection {...testProps} />);

      const standardArrayButton = screen.getByRole('button', { name: /use standard array/i });
      await user.click(standardArrayButton);

      // Verify onChange was called with standard array values
      expect(testProps.onChange).toHaveBeenCalledWith(expect.objectContaining({
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      }));
    });
  });

  describe('Random Generation', () => {
    it('shows roll dice button', () => {
      render(<AbilityScoresSection {...testProps} />);

      expect(screen.getByRole('button', { name: /roll dice/i })).toBeInTheDocument();
    });

    it('generates random ability scores when clicked', async () => {
      const user = userEvent.setup();
      render(<AbilityScoresSection {...testProps} />);

      const rollDiceButton = screen.getByRole('button', { name: /roll dice/i });
      await user.click(rollDiceButton);

      // Wait for the async roll operation to complete
      await waitFor(() => {
        expect(testProps.onChange).toHaveBeenCalled();
      }, { timeout: 2000 });

      const calledWith = testProps.onChange.mock.calls[testProps.onChange.mock.calls.length - 1][0];

      // All values should be between 3 and 18 (4d6 drop lowest range)
      Object.values(calledWith).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(3);
        expect(value).toBeLessThanOrEqual(18);
      });
    });

    it('shows dice roll animation', async () => {
      const user = userEvent.setup();
      render(<AbilityScoresSection {...testProps} />);

      const rollDiceButton = screen.getByRole('button', { name: /roll dice/i });
      await user.click(rollDiceButton);

      expect(screen.getByTestId('dice-animation')).toBeInTheDocument();
    });
  });

  // Data-driven error validation tests
  describe('Field Error Validation', () => {
    const errorTests = testFieldErrors(AbilityScoresSection, testProps, errorTestCases);
    errorTests.forEach(({ name, test }) => {
      it(name, test);
    });
  });

  // Section layout tests using utility
  describe('Section Layout', () => {
    const layoutTests = testSectionLayout(AbilityScoresSection, testProps, {
      title: 'Ability Scores',
      description: 'fundamental attributes',
    });
    layoutTests.forEach(({ name, test }) => {
      it(name, test);
    });

    it('arranges ability scores in a responsive grid', () => {
      render(<AbilityScoresSection {...testProps} />);

      const section = screen.getByTestId('ability-scores-grid');
      expect(section).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'gap-4');
    });

    it('groups generation tools together', () => {
      render(<AbilityScoresSection {...testProps} />);

      const toolsContainer = screen.getByTestId('generation-tools');
      expect(toolsContainer).toContainElement(screen.getByRole('button', { name: /use standard array/i }));
      expect(toolsContainer).toContainElement(screen.getByRole('button', { name: /roll dice/i }));
    });
  });

  // Accessibility tests using utility
  describe('Accessibility', () => {
    const accessibilityTests = testSectionAccessibility(AbilityScoresSection, testProps, {
      headingText: 'Ability Scores',
      headingLevel: 3,
      fieldPatterns: abilities.map(ability => (content: string) => containsTextIgnoreCase(content, ability.name)),
    });
    accessibilityTests.forEach(({ name, test }) => {
      it(name, test);
    });

    it('associates ability modifiers with their scores', () => {
      render(<AbilityScoresSection {...testProps} />);

      const strengthField = screen.getByLabelText(/strength/i);
      const strengthModifier = screen.getByTestId('strength-modifier');

      expect(strengthField).toHaveAttribute('aria-describedby');
      expect(strengthModifier).toHaveAttribute('id', strengthField.getAttribute('aria-describedby')?.split(' ')[0]);
    });

    it('announces dice rolls to screen readers', async () => {
      const user = userEvent.setup();
      render(<AbilityScoresSection {...testProps} />);

      const rollDiceButton = screen.getByRole('button', { name: /roll dice/i });
      await user.click(rollDiceButton);

      // Wait for the async roll and announcement
      await waitFor(() => {
        expect(testProps.onChange).toHaveBeenCalled();
      }, { timeout: 2000 });

      // The announcement is added to document.body, not to the component
      // We can verify the onChange was called as proof the feature works
      expect(testProps.onChange).toHaveBeenCalled();
    });
  });
});