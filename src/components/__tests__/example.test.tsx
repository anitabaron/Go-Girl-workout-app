import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Example React component test using Vitest and React Testing Library
 * 
 * Guidelines:
 * - Use React Testing Library for user-centric testing
 * - Focus on accessibility and user interactions
 * - Use userEvent for realistic user interactions
 * - Test behavior, not implementation details
 */

// Example component (replace with actual component)
function ExampleButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick}>{children}</button>;
}

describe('Example Component Test', () => {
  it('should render button with text', () => {
    // Arrange & Act
    render(<ExampleButton onClick={vi.fn()}>Click me</ExampleButton>);

    // Assert
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick when button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ExampleButton onClick={handleClick}>Click me</ExampleButton>);

    // Act
    await user.click(screen.getByRole('button'));

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
