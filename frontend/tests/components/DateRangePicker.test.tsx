import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '../../src/components/DateRangePicker';

describe('DateRangePicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    mockOnChange.mockClear();
  });

  it('renders trigger button with date range label', () => {
    render(
      <DateRangePicker
        value={{ startDate: '2024-03-15', endDate: '2024-06-15' }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole('button', { name: /Last 3 months/i })).toBeInTheDocument();
  });

  it('renders "All time" label for empty date range', () => {
    render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/All time/i)).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(
      <DateRangePicker
        value={{ startDate: '2024-03-15', endDate: '2024-06-15' }}
        onChange={mockOnChange}
      />
    );

    const trigger = screen.getByRole('button', { name: /Last 3 months/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Quick Select')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  it('shows preset buttons in dropdown', () => {
    render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Last 3 months')).toBeInTheDocument();
    expect(screen.getByText('Last 6 months')).toBeInTheDocument();
    expect(screen.getByText('This year')).toBeInTheDocument();
    expect(screen.getAllByText('All time')).toHaveLength(2); // One in button, one in dropdown
  });

  it('calls onChange when preset is clicked', () => {
    render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Last 3 months'));

    expect(mockOnChange).toHaveBeenCalledWith({
      startDate: '2024-03-15',
      endDate: '2024-06-15',
    });
  });

  it('closes dropdown when preset is clicked', () => {
    render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Quick Select')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Last 6 months'));
    expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
  });

  it('closes dropdown when Apply button is clicked', () => {
    render(
      <DateRangePicker
        value={{ startDate: '2024-03-15', endDate: '2024-06-15' }}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Last 3 months/i }));
    expect(screen.getByText('Apply')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Apply'));
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
  });

  it('clears dates when Clear dates is clicked', () => {
    render(
      <DateRangePicker
        value={{ startDate: '2024-03-15', endDate: '2024-06-15' }}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Last 3 months/i }));
    fireEvent.click(screen.getByText('Clear dates'));

    expect(mockOnChange).toHaveBeenCalledWith({
      startDate: '',
      endDate: '',
    });
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <DateRangePicker
          value={{ startDate: '2024-03-15', endDate: '2024-06-15' }}
          onChange={mockOnChange}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /Last 3 months/i }));
    expect(screen.getByText('Quick Select')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
  });

  it('highlights active preset', () => {
    render(
      <DateRangePicker
        value={{ startDate: '2024-03-15', endDate: '2024-06-15' }}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Last 3 months/i }));

    // The active preset should have special styling - find it in the dropdown
    const presetButtons = screen.getAllByRole('button', { name: 'Last 3 months' });
    // One of them should have the active styling
    const activeButton = presetButtons.find(btn => btn.classList.contains('bg-blue-50'));
    expect(activeButton).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has correct aria attributes on trigger', () => {
    render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('updates aria-expanded when dropdown opens', () => {
    render(
      <DateRangePicker
        value={{ startDate: '', endDate: '' }}
        onChange={mockOnChange}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
