const debug_logs = false;

// This adds custom jest matchers from jest-dom
require('@testing-library/jest-dom');

// Setup global objects needed for testing Next.js API routes
require('./src/__mocks__/jest-setup-node-globals');

// Set database environment variables for all tests
// For CI environment, these should be set in the GitHub workflow
// For local testing, use the same Atlas connection as development
if (!process.env.MONGODB_URI) {
  if (debug_logs) {
    console.log('No MONGODB_URI set, using Atlas connection for tests');
  }
  // Use Atlas connection for tests (same as development)
  process.env.MONGODB_URI =
    process.env.JEST_MONGODB_URI || 'mongodb://localhost:27017/testdb';
}

if (!process.env.MONGODB_DB_NAME) {
  if (debug_logs) {
    console.log('No MONGODB_DB_NAME set, using dnd-dev for tests');
  }
  process.env.MONGODB_DB_NAME = 'dnd-dev';
}

// Log the MongoDB connection details for debugging
if (debug_logs) {
  console.log(
    'Using MongoDB: ' +
      process.env.MONGODB_URI +
      ', DB: ' +
      process.env.MONGODB_DB_NAME
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
  const mockMatchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
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
    const mockBoundingRect = () => ({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    Element.prototype.getBoundingClientRect = jest.fn(mockBoundingRect);
  }

  // Mock getComputedStyle
  if (!window.getComputedStyle) {
    const mockComputedStyle = () => ({ getPropertyValue: jest.fn(() => '') });
    window.getComputedStyle = jest.fn(mockComputedStyle);
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
const reactSchedulerWarnings = [
  'Warning: An update to %s inside a test was not wrapped in act',
  'The current testing environment is not configured to support act',
];

function shouldSuppressWarning(args) {
  return args.some(
    arg =>
      typeof arg === 'string' &&
      reactSchedulerWarnings.some(warning => arg.includes(warning))
  );
}

console.error = (...args) => {
  if (shouldSuppressWarning(args)) return;
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

// Helper function to generate ObjectId-like strings for tests
function generateTestObjectId() {
  const crypto = require('crypto');
  const hex = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 24; i++) {
    const randomBytes = crypto.randomBytes(1);
    result += hex[randomBytes[0] % 16];
  }
  return result;
}

// Helper function to create mock ObjectId
function createMockObjectId() {
  return jest.fn().mockImplementation(id => ({
    toString: () => id || generateTestObjectId(),
  }));
}

// Helper function to create mock Schema
function createMockSchema() {
  const MockSchema = jest.fn().mockImplementation(() => ({
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
  }));

  const mockObjectId = createMockObjectId();
  MockSchema.Types = {
    ObjectId: mockObjectId,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Array: Array,
    Date: Date,
  };

  return MockSchema;
}

// Mock Mongoose to prevent schema registration conflicts and provide test isolation
jest.mock('mongoose', () => {
  const mockObjectId = createMockObjectId();
  const MockSchema = createMockSchema();

  const dataStore = new Map(); // modelName -> array of docs
  const models = {};

  function generateId() {
    return mockObjectId().toString();
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
  }

  function createModel(name) {
    if (!dataStore.has(name)) dataStore.set(name, []);
    const docs = dataStore.get(name);

    function wrap(doc) {
      const now = new Date();
      return {
        _id: { toString: () => doc._id },
        ...doc,
        createdAt: doc.createdAt || now,
        updatedAt: doc.updatedAt || now,
        lastActivity: doc.lastActivity || now,
        save: async function () {
          this.updatedAt = new Date();
          return this;
        },
        updateActivity: function () {
          this.lastActivity = new Date();
        },
      };
    }

    function applyQueryFilter(arr, query) {
      if (!query || Object.keys(query).length === 0) return arr;
      // Extremely naive matcher supporting ownerId, sharedWith, isPublic, _id
      return arr.filter(d => {
        return Object.entries(query).every(([k, v]) => {
          if (k === '$or' && Array.isArray(v)) {
            return v.some(cond => applyQueryFilter([d], cond).length === 1);
          }
          if (k === '_id')
            return d._id === v || (v && v.toString && v.toString() === d._id);
          if (k === 'ownerId')
            return d.ownerId === (v && v.toString ? v.toString() : v);
          if (k === 'isPublic') return d.isPublic === v;
          if (k === 'sharedWith') {
            if (Array.isArray(d.sharedWith)) {
              const val = v && v.toString ? v.toString() : v;
              return d.sharedWith.includes(val);
            }
            return false;
          }
          if (k === 'name' && v && v.$regex) {
            return new RegExp(escapeRegExp(v.$regex), v.$options || 'i').test(
              d.name || ''
            );
          }
          if (k === 'description' && v && v.$regex) {
            return new RegExp(escapeRegExp(v.$regex), v.$options || 'i').test(
              d.description || ''
            );
          }
          if (k === 'tags' && v && v.$in) {
            return (d.tags || []).some(tag =>
              v.$in.some(r => (r instanceof RegExp ? r.test(tag) : r === tag))
            );
          }
          return true; // ignore unsupported filters
        });
      });
    }

    function chainable(resultArray) {
      return {
        sort: function () {
          return this;
        },
        skip: function () {
          return this;
        },
        limit: function () {
          return this;
        },
        lean: function () {
          return resultArray.map(r => ({ ...r }));
        },
      };
    }

    return {
      create: async function (doc) {
        const created = wrap({
          ...doc,
          _id: generateId(),
          ownerId:
            doc.ownerId && doc.ownerId.toString
              ? doc.ownerId.toString()
              : doc.ownerId,
          sharedWith: doc.sharedWith || [],
          tags: doc.tags || [],
        });
        docs.push(created);
        return created;
      },
      findById: async function (id) {
        const found = docs.find(
          d => d._id === (id && id.toString ? id.toString() : id)
        );
        return found ? wrap(found) : null;
      },
      findByIdAndDelete: async function (id) {
        const idx = docs.findIndex(
          d => d._id === (id && id.toString ? id.toString() : id)
        );
        if (idx !== -1) docs.splice(idx, 1);
      },
      deleteMany: async function () {
        docs.length = 0;
      },
      countDocuments: async function (query = {}) {
        return applyQueryFilter(docs, query).length;
      },
      find: function (query = {}) {
        return chainable(applyQueryFilter(docs, query));
      },
      aggregate: async function () {
        return [];
      },
      // For character related virtuals not needed here
    };
  }

  const mongooseMock = {
    connect: jest.fn().mockResolvedValue({}),
    connection: {
      readyState: 1,
      on: jest.fn(),
      once: jest.fn(),
      close: jest.fn().mockResolvedValue({}),
    },
    Schema: MockSchema,
    model: name => {
      if (!models[name]) models[name] = createModel(name);
      return models[name];
    },
    models,
    Types: {
      ObjectId: mockObjectId,
    },
  };

  return mongooseMock;
});

// Mock the database connection module to provide test isolation
jest.mock('./src/lib/db', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
  disconnectFromDatabase: jest.fn().mockResolvedValue({}),
  // Provide legacy alias expected by some tests
  closeDatabaseConnection: jest.fn().mockResolvedValue({}),
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
