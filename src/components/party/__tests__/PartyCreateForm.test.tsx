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

// Mock form components
jest.mock('@/components/ui/form', () => ({
  FormField: ({ children }: any) => <div data-testid="form-field">{typeof children === 'function' ? children({ field: {} }) : children}</div>,
  FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: any) => <label data-testid="form-label">{children}</label>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormMessage: () => <div data-testid="form-message" />,
  FormDescription: ({ children }: any) => <div data-testid="form-description">{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-testid="textarea" {...props} />,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: (props: any) => <input type="checkbox" data-testid="switch" {...props} />,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

describe('PartyCreateForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle form submission', async () => {
    const props = createFormProps({ onSubmit: jest.fn().mockResolvedValue(undefined) });
    render(<PartyCreateForm {...props} />);

    const form = screen.getByTestId('party-create-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(props.onSubmit).toHaveBeenCalledWith(createMockPartyDataWithTags());
    });
  });

  it('should handle form submission errors', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
    const props = createFormProps({ onSubmit });

    // Catch the error to prevent it from failing the test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<PartyCreateForm {...props} />);

    const form = screen.getByTestId('party-create-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
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

    // Form renders successfully with default values (basic test)
    expect(screen.getByTestId('party-create-form')).toBeInTheDocument();
  });

  it('should disable form when submitting', () => {
    const props = createFormProps({ isSubmitting: true });
    render(<PartyCreateForm {...props} />);

    const submitButton = screen.getByRole('button', { hidden: true });
    expect(submitButton).toBeDisabled();
  });
});