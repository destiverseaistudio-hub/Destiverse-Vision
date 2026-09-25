import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestPasswordReset, updatePassword } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('@/services/auth', () => ({ requestPasswordReset, updatePassword }));

import { usePasswordReset } from './usePasswordReset';

beforeEach(() => {
  requestPasswordReset.mockReset();
  updatePassword.mockReset();
});

describe('usePasswordReset', () => {
  it('sets a success message after a reset request', async () => {
    requestPasswordReset.mockResolvedValue({ error: null });

    const { result } = renderHook(() => usePasswordReset());

    const outcome = await act(async () => result.current.requestReset(' Reset@User.com '));

    expect(requestPasswordReset).toHaveBeenCalledWith('reset@user.com');
    expect(outcome).toEqual({ success: true });
    expect(result.current.successMessage).toMatch(/reset link has been sent/i);
  });

  it('maps a rate-limit error on reset request', async () => {
    requestPasswordReset.mockResolvedValue({
      error: { message: 'Too many requests' },
    });

    const { result } = renderHook(() => usePasswordReset());

    const outcome = await act(async () => result.current.requestReset('a@b.com'));

    expect(outcome).toEqual({ success: false });
    expect(result.current.serverError).toMatch(/too many attempts/i);
  });

  it('handles a thrown error on reset request', async () => {
    requestPasswordReset.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePasswordReset());

    const outcome = await act(async () => result.current.requestReset('a@b.com'));

    expect(outcome).toEqual({ success: false });
    expect(result.current.serverError).toMatch(/couldn't connect/i);
  });

  it('sets a success message after updating the password', async () => {
    updatePassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => usePasswordReset());

    const outcome = await act(async () =>
      result.current.resetPassword({
        password: 'new-secret',
        confirmPassword: 'new-secret',
      }),
    );

    expect(updatePassword).toHaveBeenCalledWith('new-secret');
    expect(outcome).toEqual({ success: true });
    expect(result.current.successMessage).toMatch(/updated successfully/i);
  });

  it('maps an invalid session error on password update', async () => {
    updatePassword.mockResolvedValue({
      error: { message: 'Auth session missing' },
    });

    const { result } = renderHook(() => usePasswordReset());

    const outcome = await act(async () =>
      result.current.resetPassword({
        password: 'new-secret',
        confirmPassword: 'new-secret',
      }),
    );

    expect(outcome).toEqual({ success: false });
    expect(result.current.serverError).toMatch(/no longer valid/i);
  });

  it('clears loading after a password update', async () => {
    updatePassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => usePasswordReset());

    await act(async () =>
      result.current.resetPassword({
        password: 'new-secret',
        confirmPassword: 'new-secret',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
