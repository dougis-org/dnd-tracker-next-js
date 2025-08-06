import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartyCreateForm } from '../PartyCreateForm';

// Mock the UI components
jest.mock('@/components/ui/form', () => ({
  FormField: ({ render, name }: any) => {
    const field = { name, onChange: jest.fn(), value: '' };
    return render({ field });
  },
  FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormMessage: () => <div data-testid="form-message" />,
  FormDescription: ({ children }: any) => <div data-testid="form-description">{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} data-testid={props['data-testid'] || 'input'} />,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} data-testid="textarea" />,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <button
      data-testid="switch"
      data-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

// Mock react-hook-form
const mockUseForm = {
  control: {},
  handleSubmit: jest.fn((fn) => (e: any) => {
    e.preventDefault();
    fn({
      name: 'Test Party',
      description: 'Test description',
      tags: ['fantasy'],
      isPublic: false,
      sharedWith: [],
      settings: {
        allowJoining: false,
        requireApproval: true,
        maxMembers: 6,
      },
    });
  }),
  watch: jest.fn((name) => {
    if (name === 'tags') return ['fantasy'];
    return '';
  }),
  setValue: jest.fn(),
};

jest.mock('react-hook-form', () => ({
  useForm: () => mockUseForm,
}));

describe('PartyCreateForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form sections', () => {
    render(<PartyCreateForm {...defaultProps} />);

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    expect(screen.getByText('Party Settings')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<PartyCreateForm {...defaultProps} />);

    expect(screen.getByText('Party Name *')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Public Party')).toBeInTheDocument();
    expect(screen.getByText('Allow Joining')).toBeInTheDocument();
    expect(screen.getByText('Require Approval')).toBeInTheDocument();
    expect(screen.getByText('Maximum Members')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PartyCreateForm {...defaultProps} onSubmit={onSubmit} />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Party',
        description: 'Test description',
        tags: ['fantasy'],
        isPublic: false,
        sharedWith: [],
        settings: {
          allowJoining: false,
          requireApproval: true,
          maxMembers: 6,
        },
      });
    });
  });

  it('should handle form submission errors', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
    render(<PartyCreateForm {...defaultProps} onSubmit={onSubmit} />);

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
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

    render(<PartyCreateForm {...defaultProps} defaultValues={defaultValues} />);

    // Check that useForm was called with default values
    expect(mockUseForm.setValue).toHaveBeenCalled();
  });

  it('should handle tags input correctly', () => {
    render(<PartyCreateForm {...defaultProps} />);

    // The tags field should show current tags from watch
    expect(screen.getByDisplayValue('fantasy')).toBeInTheDocument();
  });

  it('should show form descriptions', () => {
    render(<PartyCreateForm {...defaultProps} />);

    expect(screen.getByText('Optional description to help organize your campaigns.')).toBeInTheDocument();
    expect(screen.getByText('Separate tags with commas. Maximum 10 tags, 50 characters each.')).toBeInTheDocument();
    expect(screen.getByText('Make this party visible to other users in the community.')).toBeInTheDocument();
    expect(screen.getByText('Let other users request to join this party.')).toBeInTheDocument();
    expect(screen.getByText('New members must be approved before joining.')).toBeInTheDocument();
    expect(screen.getByText('Set the maximum number of members allowed in this party.')).toBeInTheDocument();
  });

  it('should render separators between sections', () => {
    render(<PartyCreateForm {...defaultProps} />);

    const separators = screen.getAllByTestId('separator');
    expect(separators).toHaveLength(2); // Between sections
  });

  it('should disable form when submitting', () => {
    render(<PartyCreateForm {...defaultProps} isSubmitting={true} />);

    const submitButton = screen.getByRole('button', { hidden: true });
    expect(submitButton).toBeDisabled();
  });
});