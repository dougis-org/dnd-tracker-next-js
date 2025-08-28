export const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
}));
export const signIn = jest.fn();
export const signOut = jest.fn();