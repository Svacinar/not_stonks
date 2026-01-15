import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from '../../src/components/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders error message', () => {
    render(<ErrorMessage message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has alert role for accessibility', () => {
    render(<ErrorMessage message="Error occurred" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorMessage message="Error occurred" />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const mockRetry = vi.fn();
    render(<ErrorMessage message="Error occurred" onRetry={mockRetry} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const mockRetry = vi.fn();
    render(<ErrorMessage message="Error occurred" onRetry={mockRetry} />);

    fireEvent.click(screen.getByText('Retry'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<ErrorMessage message="Error" className="custom-class" />);

    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });

  it('has destructive background styling', () => {
    render(<ErrorMessage message="Error" />);

    expect(screen.getByRole('alert')).toHaveClass('bg-destructive/10');
  });
});
