import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartyCreateModal } from '../PartyCreateModal';
import { createMockFetch, createModalProps, createSuccessResponse, createErrorResponse, createMockPartyData } from './test-utils';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

jest.mock('../PartyCreateForm', () => ({ 
  PartyCreateForm: ({ isSubmitting }: any) => (
    <div data-testid="party-create-form">
      <input data-testid="party-name" defaultValue="Test Party" />
      <span>{isSubmitting ? 'Creating...' : 'Ready'}</span>
    </div>
  )
}));

jest.mock('@/components/modals/FormModal', () => ({
  QuickAddModal: ({ open, onOpenChange, onSubmit, children, config }: any) => (
    <div data-testid="quick-add-modal" data-open={open}>
      {open && (
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
          <div data-testid="modal-content">
            {children}
            <button data-testid="modal-submit" onClick={() => onSubmit(createMockPartyData())}>
              {config.submitText}
            </button>
            <button onClick={() => onOpenChange(false)}>{config.cancelText}</button>
          </div>
        </div>
      )}
    </div>
  )
}));

const renderModal = (props = {}) => {
  const defaultProps = createModalProps(props);
  return { ...render(<PartyCreateModal {...defaultProps} />), props: defaultProps };
};

const testApiCall = async (mockResponse: any, expectedToast: any) => {
  const { props } = renderModal();
  mockFetch.mockResolvedValueOnce(mockResponse);
  
  fireEvent.click(screen.getByTestId('modal-submit'));
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expectedToast));
  return props;
};

describe('PartyCreateModal', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = createMockFetch();
  });

  it('renders when open', () => {
    renderModal();
    expect(screen.getByText('Create New Party')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderModal({ open: false });
    expect(screen.getByTestId('quick-add-modal')).toHaveAttribute('data-open', 'false');
  });

  it('calls onOpenChange when cancelled', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles successful party creation', async () => {
    const props = await testApiCall(createSuccessResponse(), {
      title: 'Party created successfully',
      description: '"Test Party" has been created and is ready for members.',
      variant: 'default',
    });
    
    await waitFor(() => {
      expect(props.onPartyCreated).toHaveBeenCalled();
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('handles API errors', async () => {
    await testApiCall(createErrorResponse(), {
      title: 'Failed to create party',
      description: 'Invalid party data',
      variant: 'destructive',
    });
  });

  it('handles network errors', async () => {
    const { props } = renderModal();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    fireEvent.click(screen.getByTestId('modal-submit'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({
      title: 'Failed to create party',
      description: 'Network error',
      variant: 'destructive',
    }));
  });
});