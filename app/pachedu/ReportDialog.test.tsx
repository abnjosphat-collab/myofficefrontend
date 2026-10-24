import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfirmProvider } from '@/components/ui-system';
import { ReportDialog } from './page';

vi.mock('@/hooks/useLookups', () => ({ useEmployees: () => [] }));
vi.mock('./usePacheduData', () => ({ createPacheduReport: vi.fn(), updatePacheduReport: vi.fn() }));
const authState = vi.hoisted(() => ({ scope: null as string | null }));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ scope: authState.scope }),
}));

function setup() {
  render(
    <ConfirmProvider>
      <ReportDialog open onOpenChange={() => {}} onSaved={() => {}} />
    </ConfirmProvider>,
  );
}

describe('Pachedu ReportDialog scoped account', () => {
  afterEach(() => { authState.scope = null; });

  it('pins the section field to the scope on a new observation', () => {
    authState.scope = 'Projects';
    setup();
    const section = screen.getByLabelText('Section');
    expect(section).toHaveValue('Projects');
    expect(section).toBeDisabled();
  });

  it('offers every section to an unscoped account', () => {
    setup();
    expect(screen.getByLabelText('Section')).toHaveTextContent('Mechanical');
  });
});
