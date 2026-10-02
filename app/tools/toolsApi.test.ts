import { describe, expect, it } from 'vitest';
import { ToolsApiError, toolsErrorMessage, toolsLoginErrorMessage } from './toolsApi';

describe('toolsErrorMessage', () => {
  it('turns FastAPI validation details into readable text', () => {
    expect(toolsErrorMessage([{ loc: ['body', 'username'], msg: 'String should match pattern' }]))
      .toBe('username: String should match pattern');
  });

  it('never renders an object as object Object', () => {
    expect(toolsErrorMessage({ unexpected: true })).toBe('The change could not be saved.');
  });
});

describe('toolsLoginErrorMessage', () => {
  it('keeps the mismatch message for wrong credentials', () => {
    expect(toolsLoginErrorMessage(new ToolsApiError('Username or password is incorrect.', 401)))
      .toBe('The username or password does not match.');
  });

  it('passes through other server errors unchanged', () => {
    expect(toolsLoginErrorMessage(new ToolsApiError('The service is unavailable.', 503)))
      .toBe('The service is unavailable.');
  });

  it('names an unreachable server instead of blaming the password', () => {
    expect(toolsLoginErrorMessage(new TypeError('fetch failed')))
      .toBe('The sign-in server could not be reached. Check your connection and try again.');
  });
});
