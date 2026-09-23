import { describe, expect, it } from 'vitest';
import { toolsErrorMessage } from './toolsApi';

describe('toolsErrorMessage', () => {
  it('turns FastAPI validation details into readable text', () => {
    expect(toolsErrorMessage([{ loc: ['body', 'username'], msg: 'String should match pattern' }]))
      .toBe('username: String should match pattern');
  });

  it('never renders an object as object Object', () => {
    expect(toolsErrorMessage({ unexpected: true })).toBe('The change could not be saved.');
  });
});
