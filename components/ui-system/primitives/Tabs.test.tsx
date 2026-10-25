import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsContent, TabsList, TabsTrigger, tabsGuideKey } from './Tabs';

const GUIDE = 'letters-guide';

function Strip({ guide }: { guide?: boolean }) {
  return (
    <Tabs defaultValue="a">
      <TabsList
        aria-label="Letters"
        guideId={guide ? GUIDE : undefined}
        guideText={guide ? 'Switch between letter panels here' : undefined}
      >
        <TabsTrigger value="a">Alpha</TabsTrigger>
        <TabsTrigger value="b">Beta</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
    </Tabs>
  );
}

afterEach(() => { window.localStorage.removeItem(tabsGuideKey(GUIDE)); });

describe('tabsGuideKey', () => {
  it('names one remembered key per strip', () => {
    expect(tabsGuideKey('sop')).toBe('myoffice.tabs.guide.sop');
  });
});

describe('TabsList guide', () => {
  it('shows the guide line on the first visit', () => {
    render(<Strip guide />);
    expect(screen.getByText('Switch between letter panels here')).toBeInTheDocument();
  });

  it('hides the guide once it has been dismissed', () => {
    window.localStorage.setItem(tabsGuideKey(GUIDE), '1');
    render(<Strip guide />);
    expect(screen.queryByText('Switch between letter panels here')).not.toBeInTheDocument();
  });

  it('dismisses the guide after the first tab change and remembers it', async () => {
    const user = userEvent.setup();
    render(<Strip guide />);
    expect(screen.getByText('Switch between letter panels here')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Beta' }));
    await waitFor(() => expect(screen.queryByText('Switch between letter panels here')).not.toBeInTheDocument());
    expect(window.localStorage.getItem(tabsGuideKey(GUIDE))).toBe('1');
  });

  it('shows no guide without a guide id', () => {
    render(<Strip />);
    expect(screen.queryByText('Switch between letter panels here')).not.toBeInTheDocument();
  });
});

describe('TabsList behaviour', () => {
  it('moves selection with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Strip />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    alpha.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Panel B')).toBeVisible();
  });

  it('renders counts on triggers', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Letters">
          <TabsTrigger value="a" count={3}>Alpha</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders no sliding indicator until the active tab can be measured', () => {
    render(<Strip />);
    expect(screen.queryByTestId('tabs-indicator')).not.toBeInTheDocument();
  });

  it('slides the indicator to the newly selected tab', async () => {
    const user = userEvent.setup();
    render(<Strip />);
    const beta = screen.getByRole('tab', { name: 'Beta' });
    Object.defineProperty(beta, 'offsetWidth', { value: 64, configurable: true });
    Object.defineProperty(beta, 'offsetLeft', { value: 96, configurable: true });
    await user.click(beta);
    const indicator = await screen.findByTestId('tabs-indicator');
    expect(indicator).toHaveStyle({ width: '64px', transform: 'translateX(96px)' });
  });
});
