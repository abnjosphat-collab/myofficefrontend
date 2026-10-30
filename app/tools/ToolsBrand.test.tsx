import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolsBrand } from './ToolsBrand';
import { DallaglioLogo } from '@/components/shared/DallaglioLogo';
import { AuthCard } from '@/components/app-shell/auth/AuthLayout';

describe('ToolsBrand', () => {
  it('shows the Dallaglio symbol beside the MyOffice name and links home', () => {
    // C8: the link says a separate sign-in may be needed; the visible wordmark stays short.
    render(<ToolsBrand />);
    const link = screen.getByRole('link', { name: 'Back to MyOffice (separate sign-in)' });
    expect(link).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: 'Dallaglio' })).toHaveAttribute('src', '/brand/dallaglio-mark.png');
    expect(screen.getByText('MyOffice')).toBeInTheDocument();
  });

  it('keeps only the symbol when the sidebar is collapsed', () => {
    render(<ToolsBrand compact />);
    expect(screen.getByRole('img', { name: 'Dallaglio' })).toBeInTheDocument();
    expect(screen.queryByText('MyOffice')).toBeNull();
  });
});

describe('Dallaglio logo on the sign-in card', () => {
  it('renders the full lockup above the title when given', () => {
    render(<AuthCard title="Tools" logo={<DallaglioLogo />} />);
    const logo = screen.getByRole('img', { name: /Dallaglio: mines are not found/ });
    expect(logo).toHaveAttribute('src', '/brand/dallaglio-logo.png');
    expect(logo).toHaveAttribute('width', '115');
    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
  });
});
