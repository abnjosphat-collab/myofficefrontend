import { describe, expect, it, vi } from 'vitest';
import { ToolsApiError, retryUndelivered, toolsErrorMessage, toolsLoginErrorMessage } from './toolsApi';

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

describe('retryUndelivered', () => {
  it('tries again when the request never arrived or the service was unavailable, then succeeds', async () => {
    const run = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockRejectedValueOnce(new ToolsApiError('unavailable', 503)).mockResolvedValue('token');
    await expect(retryUndelivered(run, [1, 1, 1])).resolves.toBe('token');
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('reports a wrong password, or a 502 that may have been acted on, at once', async () => {
    for (const status of [401, 422, 502, 504]) {
      const run = vi.fn().mockRejectedValue(new ToolsApiError('no', status));
      await expect(retryUndelivered(run, [1, 1])).rejects.toThrow('no');
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it('gives up after the last delay', async () => {
    const run = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(retryUndelivered(run, [1, 1])).rejects.toThrow('fetch failed');
    expect(run).toHaveBeenCalledTimes(3);
  });
});
