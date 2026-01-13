import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../../src/components/Sidebar';

function renderSidebar(isOpen: boolean = true, onClose: () => void = vi.fn()) {
  return render(
    <BrowserRouter>
      <Sidebar isOpen={isOpen} onClose={onClose} />
    </BrowserRouter>
  );
}

describe('Sidebar', () => {
  it('renders navigation links', () => {
    renderSidebar();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
  });

  it('renders app title', () => {
    renderSidebar();

    expect(screen.getByText('Spending')).toBeInTheDocument();
  });

  it('shows overlay when open on mobile', () => {
    const { container } = renderSidebar(true);

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
  });

  it('does not show overlay when closed', () => {
    const { container } = renderSidebar(false);

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeInTheDocument();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    const { container } = renderSidebar(true, onClose);

    const overlay = container.querySelector('[aria-hidden="true"]');
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    renderSidebar(true, onClose);

    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when nav link clicked', () => {
    const onClose = vi.fn();
    renderSidebar(true, onClose);

    fireEvent.click(screen.getByText('Dashboard'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct classes when open', () => {
    const { container } = renderSidebar(true);

    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('translate-x-0');
  });

  it('applies correct classes when closed', () => {
    const { container } = renderSidebar(false);

    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  it('has correct href for navigation links', () => {
    renderSidebar();

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Transactions').closest('a')).toHaveAttribute('href', '/transactions');
    expect(screen.getByText('Upload').closest('a')).toHaveAttribute('href', '/upload');
    expect(screen.getByText('Rules').closest('a')).toHaveAttribute('href', '/rules');
  });
});
