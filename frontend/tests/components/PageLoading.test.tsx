import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoading } from '../../src/components/PageLoading';

describe('PageLoading', () => {
  it('renders default loading message', () => {
    render(<PageLoading />);

    // The text "Loading..." appears both as the message and in the sr-only span
    expect(screen.getAllByText('Loading...').length).toBeGreaterThanOrEqual(1);
  });

  it('renders custom loading message', () => {
    render(<PageLoading message="Fetching data..." />);

    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders loading spinner', () => {
    render(<PageLoading />);

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
