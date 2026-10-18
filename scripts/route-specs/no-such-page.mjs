// /no-such-page: the 404 page. A plain-English message and a way back home —
// never a stack trace. The harness screenshots ready@1440 and ready@390 itself.
const spec = {
  route: '/no-such-page',
  h1: 'Page not found',
  data: {},
  async ready(page, _calls, { check }) {
    check(await page.getByRole('link', { name: 'Back to Home' }).isVisible(), 'a way back home is offered');
    const body = await page.locator('main').innerText();
    check(!/\.tsx?:\d+|webpack-internal|node_modules|at\s+\w+\s+\(/.test(body), 'no stack trace or bundle internals leak');
    check(/does not exist or was moved/.test(body), 'the message says what happened in plain English');
  },
};

export default spec;
