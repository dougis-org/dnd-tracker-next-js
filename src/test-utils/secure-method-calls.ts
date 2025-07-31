/**
 * Secure method call utilities for test files
 *
 * This module provides secure alternatives to dynamic method calls
 * to avoid Codacy security warnings while maintaining test functionality.
 */

/**
 * Type-safe method caller for hook testing
 * Replaces unsafe dynamic method calls with explicit method mapping
 */
export class SecureHookMethodCaller {

  /**
   * Safely calls a method on a hook result object
   * @param hookResult - The hook result object
   * @param methodName - The method name to call
   * @param args - Arguments to pass to the method
   * @returns The result of the method call
   */
  static async callHookMethod(
    hookResult: any,
    methodName: string,
    ...args: any[]
  ): Promise<any> {
    // Explicit method mapping to avoid dynamic property access
    const methodMap: Record<string, string> = {
      'addCharacter': 'addCharacter',
      'updateCharacter': 'updateCharacter',
      'deleteCharacter': 'deleteCharacter',
      'duplicateCharacter': 'duplicateCharacter',
      'saveCharacter': 'saveCharacter',
      'loadCharacter': 'loadCharacter',
      'validateCharacter': 'validateCharacter',
      'resetCharacter': 'resetCharacter',
    };

    const safeName = methodMap[methodName];
    if (!safeName) {
      throw new Error(`Unknown method name: ${methodName}`);
    }

    const method = hookResult[safeName];
    if (typeof method !== 'function') {
      throw new Error(`Method ${safeName} is not a function`);
    }

    return await method(...args);
  }
}

/**
 * Secure callback accessor for configuration objects
 * Replaces unsafe dynamic property access with explicit mapping
 */
export class SecureCallbackAccessor {

  /**
   * Safely accesses a callback from a configuration object
   * @param config - The configuration object
   * @param callbackName - The callback name to access
   * @returns The callback function or undefined
   */
  static getCallback(config: any, callbackName: string): Function | undefined {
    // Explicit callback mapping to avoid dynamic property access
    const callbackMap: Record<string, string> = {
      'jwt': 'jwt',
      'session': 'session',
      'signIn': 'signIn',
      'redirect': 'redirect',
      'authorized': 'authorized',
    };

    const safeName = callbackMap[callbackName];
    if (!safeName) {
      return undefined;
    }

    const callbacks = config.callbacks;
    if (!callbacks || typeof callbacks !== 'object') {
      return undefined;
    }

    return callbacks[safeName];
  }
}

/**
 * Secure action dispatcher for hook testing
 * Replaces unsafe dynamic method calls with explicit action mapping
 */
export class SecureActionDispatcher {

  /**
   * Safely dispatches an action on a hook result
   * @param hookResult - The hook result object
   * @param actionName - The action name to dispatch
   * @param args - Arguments to pass to the action
   */
  static dispatchAction(hookResult: any, actionName: string, ...args: any[]): void {
    // Explicit action mapping to avoid dynamic property access
    const actionMap: Record<string, string> = {
      'start': 'start',
      'pause': 'pause',
      'resume': 'resume',
      'stop': 'stop',
      'reset': 'reset',
      'next': 'next',
      'previous': 'previous',
      'update': 'update',
      // Round tracking actions
      'nextRound': 'nextRound',
      'previousRound': 'previousRound',
      'setRound': 'setRound',
      // History actions
      'addHistoryEvent': 'addHistoryEvent',
      'clearHistory': 'clearHistory',
      // Effect actions
      'addEffect': 'addEffect',
      'removeEffect': 'removeEffect',
      // Trigger actions
      'addTrigger': 'addTrigger',
      'activateTrigger': 'activateTrigger',
    };

    const safeName = actionMap[actionName];
    if (!safeName) {
      throw new Error(`Unknown action name: ${actionName}`);
    }

    const action = hookResult[safeName];
    if (typeof action !== 'function') {
      throw new Error(`Action ${safeName} is not a function`);
    }

    action(...args);
  }
}

/**
 * Secure keyboard action handler
 * Replaces unsafe dynamic property access with explicit key mapping
 */
export class SecureKeyboardActionHandler {

  /**
   * Safely gets a keyboard action by key code
   * @param keyActions - The key actions object
   * @param keyCode - The key code to look up
   * @returns The action function or undefined
   */
  static getKeyAction(keyActions: any, keyCode: string): Function | undefined {
    // Explicit key mapping to avoid dynamic property access
    const keyMap: Record<string, string> = {
      'Space': 'Space',
      'Enter': 'Enter',
      'Escape': 'Escape',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'KeyN': 'KeyN',
      'KeyP': 'KeyP',
      'KeyR': 'KeyR',
      'KeyS': 'KeyS',
    };

    const safeKey = keyMap[keyCode];
    if (!safeKey) {
      return undefined;
    }

    if (!keyActions || typeof keyActions !== 'object') {
      return undefined;
    }

    return keyActions[safeKey];
  }
}