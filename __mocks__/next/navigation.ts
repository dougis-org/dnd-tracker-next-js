// __mocks__/next/navigation.ts

const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  refresh: jest.fn(),
}));

const usePathname = jest.fn(() => '/');
const useSearchParams = jest.fn(() => new URLSearchParams());

module.exports = {
  useRouter,
  usePathname,
  useSearchParams,
};
