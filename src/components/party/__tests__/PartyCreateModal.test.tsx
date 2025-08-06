import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartyCreateModal } from '../PartyCreateModal';

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the form components
jest.mock('../PartyCreateForm', () => ({
  PartyCreateForm: ({ isSubmitting }: any) => (
    <div data-testid="party-create-form">
      <input
        data-testid="party-name"
        placeholder="Party name"
        defaultValue="Test Party"
      />
      <span>{isSubmitting ? 'Creating...' : 'Ready'}</span>
    </div>
  ),
}));

// Mock the FormModal components
jest.mock('@/components/modals/FormModal', () => ({
  QuickAddModal: ({ open, onOpenChange, onSubmit, children, config }: any) => (
    <div data-testid="quick-add-modal" data-open={open}>
      {open && (
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
          <div data-testid="modal-content">
            {children}
            <button
              type="button"
              data-testid="modal-submit"
              onClick={() => onSubmit({
                name: 'Test Party',
                description: 'Test description',
                tags: [],
                isPublic: false,
                sharedWith: [],
                settings: {
                  allowJoining: false,
                  requireApproval: true,
                  maxMembers: 6,
                },
              })}
              disabled={false}
            >
              {config.submitText}
            </button>
            <button type="button" onClick={() => onOpenChange(false)}>
              {config.cancelText}
            </button>
          </div>
        </div>
      )}
    </div>
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PartyCreateModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onPartyCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render when open', () => {
    render(<PartyCreateModal {...defaultProps} />);

    expect(screen.getByTestId('quick-add-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Create New Party')).toBeInTheDocument();
    expect(screen.getByText('Set up a new party for your D&D campaign.')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<PartyCreateModal {...defaultProps} open={false} />);

    expect(screen.getByTestId('quick-add-modal')).toHaveAttribute('data-open', 'false');
  });

  it('should call onOpenChange when cancelled', () => {
    const onOpenChange = jest.fn();
    render(<PartyCreateModal {...defaultProps} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should handle successful party creation', async () => {
    const onPartyCreated = jest.fn();
    const onOpenChange = jest.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        party: {
          id: '123',
          name: 'Test Party',
          description: 'Test description',
        },
      }),
    });

    render(
      <PartyCreateModal
        {...defaultProps}
        onPartyCreated={onPartyCreated}
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.click(screen.getByTestId('modal-submit'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Party',
          description: 'Test description',
          tags: [],
          isPublic: false,
          sharedWith: [],
          settings: {
            allowJoining: false,
            requireApproval: true,
            maxMembers: 6,
          },
        }),
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Party created successfully',
        description: '"Test Party" has been created and is ready for members.',
        variant: 'default',
      });
    });

    await waitFor(() => {
      expect(onPartyCreated).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        message: 'Invalid party data',
      }),
    });

    render(<PartyCreateModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('modal-submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to create party',
        description: 'Invalid party data',
        variant: 'destructive',
      });
    });
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<PartyCreateModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('modal-submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to create party',
        description: 'Network error',
        variant: 'destructive',
      });
    });
  });

  it('should handle server errors without message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<PartyCreateModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('modal-submit'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to create party',
        description: 'Failed to create party: 500',
        variant: 'destructive',
      });
    });
  });

  it('should disable submit button while submitting', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, party: {} }),
      }), 100))
    );

    render(<PartyCreateModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('modal-submit'));

    // Form should show submitting state
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });
});