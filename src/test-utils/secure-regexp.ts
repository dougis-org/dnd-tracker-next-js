/**
 * Secure RegExp utilities for test files
 *
 * This module provides secure alternatives to dynamic RegExp construction
 * to avoid Codacy security warnings while maintaining test functionality.
 */

/**
 * Escapes special RegExp characters in a string to prevent ReDoS attacks
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp constructor
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a case-insensitive RegExp pattern safely for test assertions
 * @param text - The text to match (will be escaped)
 * @returns A RegExp object safe for use in test assertions
 */
export function createSafeTestRegExp(text: string): RegExp {
  const escapedText = escapeRegExp(text);
  return new RegExp(escapedText, 'i');
}

/**
 * Creates a case-insensitive RegExp pattern with word boundaries for exact matching
 * @param text - The text to match (will be escaped)
 * @returns A RegExp object with word boundaries for precise matching
 */
export function createExactMatchRegExp(text: string): RegExp {
  const escapedText = escapeRegExp(text);
  return new RegExp(`\\b${escapedText}\\b`, 'i');
}

/**
 * Creates a RegExp pattern for partial text matching (contains)
 * @param text - The text to match (will be escaped)
 * @returns A RegExp object for partial matching
 */
export function createPartialMatchRegExp(text: string): RegExp {
  const escapedText = escapeRegExp(text);
  return new RegExp(escapedText, 'gi');
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