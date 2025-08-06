import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartyCreateModal } from '../PartyCreateModal';
import {
  createMockFetch,
  createMockToast,
  createModalProps,
  createSuccessResponse,
  createErrorResponse,
  createMockPartyData,
} from './test-utils';

// Mock the toast hook
const mockToast = createMockToast();

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
              onClick={() => onSubmit(createMockPartyData())}
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

describe('PartyCreateModal', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = createMockFetch();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render when open', () => {
    const props = createModalProps();
    render(<PartyCreateModal {...props} />);

    expect(screen.getByTestId('quick-add-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Create New Party')).toBeInTheDocument();
    expect(screen.getByText('Set up a new party for your D&D campaign.')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const props = createModalProps({ open: false });
    render(<PartyCreateModal {...props} />);

    expect(screen.getByTestId('quick-add-modal')).toHaveAttribute('data-open', 'false');
  });

  it('should call onOpenChange when cancelled', () => {
    const props = createModalProps();
    render(<PartyCreateModal {...props} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should handle successful party creation', async () => {
    const props = createModalProps();
    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    render(<PartyCreateModal {...props} />);
    fireEvent.click(screen.getByTestId('modal-submit'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createMockPartyData()),
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
      expect(props.onPartyCreated).toHaveBeenCalled();
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should handle API errors', async () => {
    const props = createModalProps();
    mockFetch.mockResolvedValueOnce(createErrorResponse());

    render(<PartyCreateModal {...props} />);
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
    const props = createModalProps();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<PartyCreateModal {...props} />);
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
    const props = createModalProps();
    mockFetch.mockResolvedValueOnce(createErrorResponse(500, undefined));

    render(<PartyCreateModal {...props} />);
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
    const props = createModalProps();
    mockFetch.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(createSuccessResponse()), 100))
    );

    render(<PartyCreateModal {...props} />);
    fireEvent.click(screen.getByTestId('modal-submit'));

    // Form should show submitting state
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });
});