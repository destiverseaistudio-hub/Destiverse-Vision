import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));

vi.mock('@/services/auth', () => ({ signUp }));

import { useSignUp } from './useSignUp';

beforeEach(() => {
  signUp.mockReset();
});

describe('useSignUp', () => {
  it('returns success when a session is created', async () => {
    const session = { access_token: 'token' };
    signUp.mockResolvedValue({ data: { session }, error: null });

    const { result } = renderHook(() => useSignUp());

    const outcome = await act(async () =>
      result.current.register({
        email: 'New@User.com',
        password: 'hunter2',
        confirmPassword: 'hunter2',
      }),
    );

    expect(signUp).toHaveBeenCalledWith('new@user.com', 'hunter2');
    expect(outcome).toEqual({
      success: true,
      session,
      requiresEmailConfirmation: false,
    });
  });

  it('flags email confirmation when no session is returned', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSignUp());

    const outcome = await act(async () =>
      result.current.register({
        email: 'new@user.com',
        password: 'hunter2',
        confirmPassword: 'hunter2',
      }),
    );

    expect(outcome.requiresEmailConfirmation).toBe(true);
  });

  it('maps an already-registered error to a friendly message', async () => {
    signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered' },
    });

    const { result } = renderHook(() => useSignUp());

    await act(async () =>
      result.current.register({
        email: 'new@user.com',
        password: 'hunter2',
        confirmPassword: 'hunter2',
      }),
    );

    expect(result.current.serverError).toMatch(/already exists/i);
  });

  it('handles a thrown error during registration', async () => {
    signUp.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useSignUp());

    const outcome = await act(async () =>
      result.current.register({
        email: 'new@user.com',
        password: 'hunter2',
        confirmPassword: 'hunter2',
      }),
    );

    expect(outcome).toEqual({
      success: false,
      session: null,
      requiresEmailConfirmation: false,
    });
    expect(result.current.serverError).toMatch(/couldn't connect/i);
  });

  it('clears loading after completion', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useSignUp());

    await act(async () =>
      result.current.register({
        email: 'new@user.com',
        password: 'hunter2',
        confirmPassword: 'hunter2',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
