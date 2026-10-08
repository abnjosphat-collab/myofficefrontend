// /test-homepage: TEMPORARY design concept (homepage as a briefing). Minimal spec:
// the sections render; behavior coverage stays on the real home page.
const spec = {
  route: '/test-homepage',
  h1: 'Home concept',
  data: {},
  async ready(page, calls, { check, shot }) {
    check(await page.getByRole('region', { name: 'Operations summary' }).isVisible(), 'the operations summary renders');
    check(await page.getByRole('region', { name: 'Key figures' }).isVisible(), 'the key figures render');
    check(await page.locator('#modules').isVisible(), 'the module directory renders');
    await shot(page, 'concept@1440');
  },
};
export default spec;
