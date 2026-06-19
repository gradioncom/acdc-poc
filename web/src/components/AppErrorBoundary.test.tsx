import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from './AppErrorBoundary';

/** A child that throws during render to simulate a crashing subtree. */
function Boom({ message = 'kaboom' }: { message?: string }): never {
  throw new Error(message);
}

describe('AppErrorBoundary', () => {
  // React logs caught errors to console.error; silence it to keep test output clean.
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children when no error is thrown', () => {
    render(
      <AppErrorBoundary>
        <p>all good</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
    // No toast should be shown when everything is fine.
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('renders the recoverable fallback and reports the error via a toast', () => {
    render(
      <AppErrorBoundary>
        <Boom message="reported failure" />
      </AppErrorBoundary>,
    );

    // Fallback from the underlying ErrorBoundary is shown.
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    // The caught error is surfaced to the user as an error toast.
    const toast = screen.getByTestId('toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Something went wrong: reported failure');
  });
});
