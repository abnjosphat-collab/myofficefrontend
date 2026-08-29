// e2e/mockApi.mjs — split out of shared.mjs specifically because @playwright/test's
// test-file transform can't handle `import.meta` (used by shared.mjs's APP_DIR) when
// it's imported from a .spec.ts file — confirmed: "SyntaxError: Cannot use
// 'import.meta' outside a module" even though this function itself never touches
// import.meta. Kept here, free of that dependency, so both smoke.mjs (plain Node,
// import.meta works fine) and visual.spec.ts (@playwright/test) can share the one
// mocking function without either one working around the other's constraints.

// Deterministic API stub: empty list for everything, so pages render their empty states
// without a backend or auth. Exception: the availability page has a built-in mock
// fallback for genuine network failure, so we 404 its calls to exercise that
// fallback render path instead of feeding it a wrong shape.
export function mockApi(route) {
  const url = route.request().url();
  if (url.includes('/api/availabilities')) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
}
