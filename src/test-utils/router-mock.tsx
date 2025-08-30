import React from 'react';
import { NextRouter } from 'next/router';

// Mock the useRouter hook
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isPreview: false,
  isLocaleDomain: false,
  isReady: true,
  query: {},
  asPath: '/',
  pathname: '/',
  basePath: '',
  route: '/',
};

// Mock the usePathname hook
export const mockPathname = jest.fn(() => '/');

// A component to provide the mocked router context
export const MockRouterContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};
