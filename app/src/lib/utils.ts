/**
 * Asserts that the given value is not null or undefined.
 * @param value The value to check
 * @param message Optional error message
 * @returns The non-null value
 * @throws Error if the value is null or undefined
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value must not be null or undefined');
  }
}
