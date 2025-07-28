/**
 * Set up global objects required for Node.js
 * testing environment
 * This file should be imported in jest.setup.js
 */

// Create a shared Web API globals setup function
function setupWebAPIGlobals() {
  // Setup Headers if needed
  if (typeof global.Headers === 'undefined') {
    global.Headers = class Headers {
      constructor(init = {}) {
        this._headers = { ...init };
      }

      append(name, value) {
        this._headers[name.toLowerCase()] = value;
      }

      get(name) {
        return this._headers[name.toLowerCase()];
      }

      has(name) {
        return name.toLowerCase() in this._headers;
      }
    };
  }

  // Setup Request if running in a Node.js environment
  if (typeof global.Request === 'undefined') {
    global.Request = class Request {
      constructor(input, init = {}) {
        this.url = input;
        this.method = init.method || 'GET';
        this.headers = new Headers(init.headers || {});
        this.body = init.body;
        this._bodyText = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
      }

      text() {
        return Promise.resolve(this._bodyText || '');
      }

      json() {
        return this.text().then(text => {
          if (!text) return {};
          return JSON.parse(text);
        });
      }
    };
  }

  // Setup Response if needed
  if (typeof global.Response === 'undefined') {
    global.Response = class Response {
      constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || '';
        this.headers = new Headers(init.headers || {});
        this._bodyText = typeof body === 'string' ? body : JSON.stringify(body);
      }

      text() {
        return Promise.resolve(this._bodyText);
      }

      json() {
        return this.text().then(function(text) { return JSON.parse(text) });
      }
    };
  }
}

// Initialize the globals
setupWebAPIGlobals();

// Export the setup function for reuse
module.exports = { setupWebAPIGlobals: setupWebAPIGlobals };
