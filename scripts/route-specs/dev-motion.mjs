// /dev/motion: the motion gallery (B3). Signed-in admin only, never in the
// nav. The fixture session is an admin, so every section renders.
const spec = {
  route: '/dev/motion',
  h1: 'Motion gallery',
  data: {},
  async ready(page, calls, { check, shot }) {
    for (const name of ['Springs', 'Animated icons', 'Icon swap', 'Numbers', 'Presence and lists', 'Data loading', 'Selection indicators', 'Overlays', 'Press', 'Zoom', 'Effect matrix']) {
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
    // Zoom: the card grows into its dialog and shrinks back on close.
    const cardOpen = page.getByRole('button', { name: 'Open order WO-1024' });
    const cardZoom = page.getByRole('dialog', { name: 'Order WO-1024' });
    const cardPanel = page.locator('[data-zoom-panel="gallery:order:1024"]');
    await cardOpen.click();
    await cardZoom.waitFor({ timeout: 5000 });
    check(await cardPanel.getAttribute('data-zoom-mode') === 'zoom', 'card zoom grows out of the card');
    await page.keyboard.press('Escape');
    await cardZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(!(await cardZoom.isVisible().catch(() => false)), 'the zoom dialog shrinks back and closes');
    // Closing mid-open reverses smoothly, and the zoom still works after.
    await cardOpen.click();
    await cardZoom.waitFor({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await cardZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    check(!(await cardZoom.isVisible().catch(() => false)), 'closing mid-open reverses cleanly');
    await cardOpen.click();
    await cardZoom.waitFor({ timeout: 5000 });
    check(await cardPanel.getAttribute('data-zoom-mode') === 'zoom', 'the zoom recovers after a mid-flight reversal');
    await page.keyboard.press('Escape');
    await cardZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    // The New button grows into its form; the drawer zoom takes the right placement.
    await page.getByRole('button', { name: 'New order' }).click();
    const formZoom = page.getByRole('dialog', { name: 'New order' });
    await formZoom.waitFor({ timeout: 5000 });
    check(await page.locator('[data-zoom-panel="gallery:new-order"]').getAttribute('data-zoom-mode') === 'zoom', 'the New button grows into its form');
    await page.keyboard.press('Escape');
    await formZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.getByRole('button', { name: 'Open the zoom drawer' }).click();
    const drawerZoom = page.getByRole('dialog', { name: 'Drawer record' });
    await drawerZoom.waitFor({ timeout: 5000 });
    check(await page.locator('[data-zoom-panel="gallery:drawer:1"]').getAttribute('data-zoom-mode') === 'zoom', 'the drawer zoom grows out of its source');
    await page.keyboard.press('Escape');
    await drawerZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    // A filtered-away source falls back to the plain open.
    await page.getByRole('checkbox', { name: 'Filter the source away' }).check();
    await page.getByRole('button', { name: 'Open without source' }).click();
    const fallbackZoom = page.getByRole('dialog', { name: 'Fallback record' });
    await fallbackZoom.waitFor({ timeout: 5000 });
    check(await page.locator('[data-zoom-panel="gallery:fallback:1"]').getAttribute('data-zoom-fallback') === 'true', 'a missing source falls back to the plain open');
    await page.keyboard.press('Escape');
    await fallbackZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.getByRole('checkbox', { name: 'Filter the source away' }).uncheck();
    // Reduced motion crossfades the zoom instead of travelling.
    await box.check();
    await cardOpen.click();
    await cardZoom.waitFor({ timeout: 5000 });
    check(await cardPanel.getAttribute('data-zoom-mode') === 'reduce', 'reduced motion crossfades the zoom');
    await page.keyboard.press('Escape');
    await cardZoom.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await box.uncheck();
    // The number stepper rolls.
    await page.getByRole('button', { name: '+10' }).click();
    await shot(page, 'gallery@1440');
  },
};
export default spec;
