import { describe, it, expect, vi } from 'vitest';

/**
 * Example unit test using Vitest
 * 
 * Guidelines:
 * - Use `vi` object for test doubles (vi.fn(), vi.spyOn(), vi.stubGlobal())
 * - Use `vi.mock()` factory patterns at the top level
 * - Structure tests with descriptive describe blocks
 * - Follow Arrange-Act-Assert pattern
 * - Use explicit assertion messages
 */
describe('Example Unit Test', () => {
  it('should perform a simple calculation', () => {
    // Arrange
    const a = 2;
    const b = 3;

    // Act
    const result = a + b;

    // Assert
    expect(result).toBe(5);
  });

  it('should demonstrate mocking with vi.fn()', () => {
    // Arrange
    const mockFn = vi.fn();
    
    // Act
    mockFn('test');
    
    // Assert
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
