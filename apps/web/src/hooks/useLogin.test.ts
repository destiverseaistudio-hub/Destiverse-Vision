import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock('@/services/auth', () => ({ signIn }));

import { useLogin } from './useLogin';

beforeEach(() => {
  signIn.mockReset();
});

describe('useLogin', () => {
  it('returns success and the session on a valid sign-in', async () => {
    const session = { access_token: 'token' };
    signIn.mockResolvedValue({ data: { session }, error: null });

    const { result } = renderHook(() => useLogin());

    const outcome = await act(async () =>
      result.current.login({ email: 'user@example.com', password: 'secret' }),
    );

    expect(signIn).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(outcome).toEqual({ success: true, session });
    expect(result.current.serverError).toBe('');
  });

  it('maps invalid-credential errors to a friendly message', async () => {
    signIn.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useLogin());

    const outcome = await act(async () =>
      result.current.login({ email: 'user@example.com', password: 'wrong' }),
    );

    expect(outcome.success).toBe(false);
    expect(result.current.serverError).toMatch(/email or password is incorrect/i);
  });

  it('maps network errors to a connection message', async () => {
    signIn.mockResolvedValue({
      data: { session: null },
      error: { message: 'Failed to fetch' },
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => result.current.login({ email: 'user@example.com', password: 'secret' }));

    expect(result.current.serverError).toMatch(/couldn't connect/i);
  });

  it('handles a thrown error during sign-in', async () => {
    signIn.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useLogin());

    const outcome = await act(async () =>
      result.current.login({ email: 'user@example.com', password: 'secret' }),
    );

    expect(outcome).toEqual({ success: false, session: null });
    expect(result.current.serverError).toMatch(/couldn't connect/i);
  });

  it('clears loading after completion', async () => {
    signIn.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useLogin());

    await act(async () => result.current.login({ email: 'user@example.com', password: 'secret' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
