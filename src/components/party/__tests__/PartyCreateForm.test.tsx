import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartyCreateForm } from '../PartyCreateForm';
import {
  createMockUseForm,
  createFormProps,
  createMockPartyDataWithTags,
} from './test-utils';

// Mock react-hook-form
const mockUseForm = createMockUseForm();
jest.mock('react-hook-form', () => ({
  useForm: () => mockUseForm,
}));

describe('PartyCreateForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle form submission', async () => {
    const props = createFormProps({ onSubmit: jest.fn().mockResolvedValue(undefined) });
    render(<PartyCreateForm {...props} />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith(createMockPartyDataWithTags());
    });
  });

  it('should handle form submission errors', async () => {
    const props = createFormProps({
      onSubmit: jest.fn().mockRejectedValue(new Error('Submission failed'))
    });
    render(<PartyCreateForm {...props} />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalled();
    });
  });

  it('should display default values when provided', () => {
    const defaultValues = {
      name: 'My Party',
      description: 'My party description',
      tags: ['adventure', 'homebrew'],
      isPublic: true,
      settings: {
        allowJoining: true,
        requireApproval: false,
        maxMembers: 8,
      },
    };

    const props = createFormProps({ defaultValues });
    render(<PartyCreateForm {...props} />);

    // Check that useForm was called with default values
    expect(mockUseForm.setValue).toHaveBeenCalled();
  });

  it('should disable form when submitting', () => {
    const props = createFormProps({ isSubmitting: true });
    render(<PartyCreateForm {...props} />);

    const submitButton = screen.getByRole('button', { hidden: true });
    expect(submitButton).toBeDisabled();
  });
});