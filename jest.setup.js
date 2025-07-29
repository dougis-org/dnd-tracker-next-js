const debug_logs = false;
// This adds custom jest matchers from jest-dom
require('@testing-library/jest-dom');

// Setup global objects needed for testing Next.js API routes
require('./src/__mocks__/jest-setup-node-globals');

// Set database environment variables for all tests
// For CI environment, these should be set in the GitHub workflow
// For local testing, we use these defaults
if (!process.env.MONGODB_URI) {
  if (debug_logs) {
    console.log('No MONGODB_URI set, using default for tests');
  }
  process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
}

if (!process.env.MONGODB_DB_NAME) {
  if (debug_logs) {
    console.log('No MONGODB_DB_NAME set, using default for tests');
  }
  process.env.MONGODB_DB_NAME = 'testdb';
}

// Log the MongoDB connection details for debugging
if (debug_logs) {
  console.log(
    "Using MongoDB: "+process.env.MONGODB_URI+", DB: "+process.env.MONGODB_DB_NAME
  );
}
// Set up missing browser APIs
global.MutationObserver = class {
  constructor(_callback) {}

  disconnect() {}

  observe(_element, _initObject) {}

  takeRecords() {
    return [];
  }
};

// Mock IntersectionObserver which is not available in test environment
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}

  disconnect() {}

  observe() {}

  unobserve() {}
};

// Mock ResizeObserver which is not available in test environment
global.ResizeObserver = class ResizeObserver {
  constructor() {}

  disconnect() {}

  observe() {}

  unobserve() {}
};

// Mock window.matchMedia only in jsdom environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock scrollTo
global.scrollTo = jest.fn();

// Mock missing JSDOM functions needed for Radix UI
if (typeof window !== 'undefined') {
  // Add hasPointerCapture to Element prototype
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  // Add getBoundingClientRect if not present
  if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  }

  // Mock getComputedStyle
  if (!window.getComputedStyle) {
    window.getComputedStyle = jest.fn(() => ({
      getPropertyValue: jest.fn(() => ''),
    }));
  }
}

// Mock requestAnimationFrame
global.requestAnimationFrame = function (callback) {
  return setTimeout(callback, 0);
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = function (id) {
  clearTimeout(id);
};

// Suppress React 18 console warnings in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress React 18 scheduler errors (act warnings)
  const reactSchedulerWarnings = [
    'Warning: An update to %s inside a test was not wrapped in act',
    'The current testing environment is not configured to support act',
  ];

  if (
    args.some(
      arg =>
        typeof arg === 'string' &&
        reactSchedulerWarnings.some(warning => arg.includes(warning))
    )
  ) {
    return;
  }

  originalConsoleError(...args);
};

// Mock BSON to prevent import issues
jest.mock('bson', () => ({
  ObjectId: jest
    .fn()
    .mockImplementation(id => ({ toString: () => id || 'mock-object-id' })),
}));

// Mock MongoDB to prevent import issues
jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
  ObjectId: jest
    .fn()
    .mockImplementation(id => ({ toString: () => id || 'mock-object-id' })),
}));

// Mock Mongoose to prevent schema registration conflicts and provide test isolation
jest.mock('mongoose', () => {
  // Generate a proper ObjectId-like string (24 character hex)
  const generateObjectId = () => {
    const hex = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += hex[Math.floor(Math.random() * 16)];
    }
    return result;
  };
  
  const mockObjectId = jest
    .fn()
    .mockImplementation(id => {
      const objectIdValue = id || generateObjectId();
      return { 
        toString: () => objectIdValue
      };
    });

  const SchemaTypes = {
    ObjectId: mockObjectId,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Array: Array,
    Date: Date,
  };

  const MockSchema = jest.fn().mockImplementation(function (_definition) {
    return {
      pre: jest.fn(),
      post: jest.fn(),
      methods: {},
      statics: {},
      virtual: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
      }),
      plugin: jest.fn(),
      index: jest.fn(),
    };
  });

  // Add Schema.Types static property
  MockSchema.Types = SchemaTypes;

  return {
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
      close: jest.fn().mockResolvedValue({}),
    },
    Schema: MockSchema,
    model: jest.fn(),
    models: {},
    Types: {
      ObjectId: mockObjectId,
    },
  };
});

// Mock the database connection module to provide test isolation
jest.mock('./src/lib/db', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
  disconnectFromDatabase: jest.fn().mockResolvedValue({}),
  getConnectionStatus: jest.fn().mockReturnValue(true),
  mongoose: {
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
      close: jest.fn().mockResolvedValue({}),
    },
  },
}));
