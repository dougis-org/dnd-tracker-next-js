/**
 * Shared test utilities for reducing complexity across test files
 * Provides data-driven testing helpers and common patterns
 */

// ===== DATA-DRIVEN TEST UTILITIES =====

/**
 * Generic function to run parameterized tests
 */
export function runParameterizedTests<T>(
  testName: string,
  testData: T[],
  testFn: (_data: T) => void,
  dataFormatter?: (_data: T) => string
): void {
  testData.forEach((data, index) => {
    const description = dataFormatter
      ? `${testName} - ${dataFormatter(data)}`
      : `${testName} - case ${index + 1}`;

    it(description, () => testFn(data));
  });
}

/**
 * Creates test scenarios for validation testing
 */
export interface ValidationTestCase<T> {
  input: T;
  expected: boolean;
  description: string;
}

export function createValidationTests<T>(
  cases: ValidationTestCase<T>[],
  validationFn: (_input: T) => boolean
): void {
  cases.forEach(({ input, expected, description }) => {
    it(`should ${expected ? 'pass' : 'fail'} validation: ${description}`, () => {
      expect(validationFn(input)).toBe(expected);
    });
  });
}