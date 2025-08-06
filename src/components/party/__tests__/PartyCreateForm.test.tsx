import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartyCreateForm } from '../PartyCreateForm';
import { createMockUseForm, createFormProps, createMockPartyDataWithTags } from './test-utils';

const mockUseForm = createMockUseForm();
jest.mock('react-hook-form', () => ({ useForm: () => mockUseForm }));

jest.mock('@/components/ui/form', () => ({
  FormField: ({ children }: any) => <div>{typeof children === 'function' ? children({ field: {} }) : children}</div>,
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => <div />,
  FormDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
jest.mock('@/components/ui/textarea', () => ({ Textarea: (props: any) => <textarea {...props} /> }));
jest.mock('@/components/ui/switch', () => ({ Switch: (props: any) => <input type="checkbox" {...props} /> }));
jest.mock('@/components/ui/separator', () => ({ Separator: () => <hr /> }));

const renderForm = (props = {}) => render(<PartyCreateForm {...createFormProps(props)} />);

describe('PartyCreateForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handles form submission', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    
    fireEvent.submit(screen.getByTestId('party-create-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(createMockPartyDataWithTags()));
  });

  it('handles submission errors', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Failed'));
    renderForm({ onSubmit });
    
    fireEvent.submit(screen.getByTestId('party-create-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('renders form successfully', () => {
    renderForm();
    expect(screen.getByTestId('party-create-form')).toBeInTheDocument();
  });

  it('disables submit when submitting', () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByRole('button', { hidden: true })).toBeDisabled();
  });
});