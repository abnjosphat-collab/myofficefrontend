// /deep-space-preview: standalone prototype (glass card over animated 3D particles, own chrome).
// Minimal spec in the test-homepage shape: the canvas and card render, no shell chrome, tabs switch.
const spec = {
  route: '/deep-space-preview',
  h1: 'Explore the deep field',
  data: {},
  async ready(page, calls, { check, shot }) {
    check(await page.locator('canvas[aria-hidden="true"]').count() === 1, 'the particle canvas renders');
    check(await page.getByRole('main', { name: 'Deep space preview card' }).isVisible(), 'the floating card renders');
    check(await page.getByRole('navigation').count() === 0, 'no shell chrome renders');
    await page.getByRole('tab', { name: 'Analytics' }).click();
    check(await page.getByRole('heading', { name: 'Read the vectors' }).isVisible(), 'tabs switch the panel');
    await shot(page, 'preview@1440');
  },
};
export default spec;
