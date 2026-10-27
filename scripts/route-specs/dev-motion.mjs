// /dev/motion: the motion gallery (B3). Signed-in admin only, never in the
// nav. The fixture session is an admin, so every section renders.
const spec = {
  route: '/dev/motion',
  h1: 'Motion gallery',
  data: {},
  async ready(page, calls, { check, shot }) {
    for (const name of ['Springs', 'Animated icons', 'Icon swap', 'Numbers', 'Presence and lists', 'Data loading', 'Selection indicators', 'Overlays', 'Press', 'Effect matrix']) {
      check(await page.getByRole('heading', { name }).isVisible(), `section "${name}" renders`);
    }
    // The gallery is never in the navigation.
    check(await page.locator('a[href="/dev/motion"]').count() === 0, 'no nav link points at the gallery');
    // The simulated reduce-motion switch drives both halves (framer + CSS).
    const box = page.getByRole('checkbox', { name: 'Simulate reduced motion' });
    await box.check();
    check(await page.evaluate(() => document.documentElement.dataset.moMotion) === 'reduce', 'the switch marks the document for CSS pieces');
    check(await page.getByText('Simulating: movement is a crossfade').isVisible(), 'the switch announces simulation');
    await box.uncheck();
    check(await page.evaluate(() => document.documentElement.dataset.moMotion) !== 'reduce', 'unchecking clears the simulation');
    // The overlay demos open real overlays.
    await page.getByRole('button', { name: 'Open dialog' }).click();
    const dialog = page.getByRole('dialog', { name: 'Demo dialog' });
    check(await dialog.isVisible(), 'the dialog demo opens');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open drawer' }).click();
    check(await page.getByRole('dialog', { name: 'Demo drawer' }).isVisible(), 'the drawer demo opens');
    await page.keyboard.press('Escape');
    // The number stepper rolls.
    await page.getByRole('button', { name: '+10' }).click();
    await shot(page, 'gallery@1440');
  },
};
export default spec;
