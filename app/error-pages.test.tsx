import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteError from './error';
import GlobalError from './global-error';
import NotFound from './not-found';
import Loading from './loading';
import ToolsError from './tools/error';

// A stack-trace-shaped message: nothing error-adjacent may ever render it.
const NASTY = Object.assign(new Error('boom in webpack-internal:///./app/x.tsx:12:34'), { digest: 'd1g357' });

describe('route error pages', () => {
  it('error.tsx explains, quotes the digest, and offers Try again + Back to Home', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<RouteError error={NASTY} reset={reset} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong on this page');
    expect(screen.getByText(/Your records are safe/)).toBeInTheDocument();
    expect(screen.getByText('d1g357')).toBeInTheDocument();
    expect(screen.queryByText(/boom in webpack-internal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\.tsx:\d+:\d+/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  });

  it('global-error.tsx renders its own document shell around the same content', () => {
    const { container } = render(<GlobalError error={NASTY} reset={() => {}} />);
    expect(container.querySelector('h1')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('d1g357')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/boom in webpack-internal/)).not.toBeInTheDocument();
  });

  it('not-found.tsx names the problem and points home without a retry', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('loading.tsx announces the page load', () => {
    render(<Loading />);
    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument();
  });

  it('tools/error.tsx points home to the Tools workspace', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ToolsError error={NASTY} reset={reset} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong in Tools');
    expect(screen.getByText('d1g357')).toBeInTheDocument();
    expect(screen.queryByText(/boom in webpack-internal/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/tools');
  });
});
