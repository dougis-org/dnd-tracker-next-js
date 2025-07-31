/**
 * Secure RegExp utilities for test files
 *
 * This module provides secure alternatives to dynamic RegExp construction
 * to avoid Codacy security warnings while maintaining test functionality.
 */

// This function is kept for potential future use but currently unused

function _escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a case-insensitive string matching function for test assertions
 * Uses string methods instead of RegExp to avoid security warnings
 * @param text - The text to match
 * @returns A function that tests if a string contains the text (case-insensitive)
 */
export function createSafeTestMatcher(text: string): (_input: string) => boolean {
  const lowerText = text.toLowerCase();
  return (_input: string) => _input.toLowerCase().includes(lowerText);
}

/**
 * Creates a case-insensitive exact word matching function
 * Uses string methods instead of RegExp to avoid security warnings
 * @param text - The text to match as a whole word
 * @returns A function that tests if a string contains the exact word (case-insensitive)
 */
export function createExactMatchMatcher(text: string): (_input: string) => boolean {
  const lowerText = text.toLowerCase();
  return (_input: string) => {
    const lowerInput = _input.toLowerCase();
    const words = lowerInput.split(/\s+/);
    return words.includes(lowerText);
  };
}

/**
 * Creates a case-insensitive partial text matching function
 * Uses string methods instead of RegExp to avoid security warnings
 * @param text - The text to match
 * @returns A function that tests if a string contains the text (case-insensitive)
 */
export function createPartialMatchMatcher(text: string): (_input: string) => boolean {
  return createSafeTestMatcher(text); // Reuse the same logic
}

/**
 * Alternative to RegExp for simple case-insensitive text matching in tests
 * Uses string methods instead of RegExp to avoid security issues entirely
 * @param haystack - The text to search in
 * @param needle - The text to search for
 * @returns True if needle is found in haystack (case-insensitive)
 */
export function containsTextIgnoreCase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Gets element by text content using secure string matching instead of RegExp
 * @param text - The text to find
 * @returns A function that matches elements containing the text (case-insensitive)
 */
export function getByTextSecure(text: string) {
  return (content: string) => containsTextIgnoreCase(content, text);
}