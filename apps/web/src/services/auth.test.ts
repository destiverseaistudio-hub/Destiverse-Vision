import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signInWithPassword,
  signUp: signUpMock,
  resetPasswordForEmail,
  updateUser,
  getSession,
  signOut: signOutMock,
} = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword,
      signUp: signUpMock,
      resetPasswordForEmail,
      updateUser,
      getSession,
      signOut: signOutMock,
    },
  },
}));

import {
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  updatePassword,
  getCurrentSession,
} from './auth';

beforeEach(() => {
  signInWithPassword.mockReset();
  signUpMock.mockReset();
  resetPasswordForEmail.mockReset();
  updateUser.mockReset();
  getSession.mockReset();
  signOutMock.mockReset();
});

describe('signIn', () => {
  it('normalizes the email and forwards the password', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const result = await signIn('  User@Example.COM  ', 'secret');

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    });
    expect(result).toEqual({
      data: { user: { id: 'u1' } },
      error: null,
    });
  });

  it('surfaces an auth error from supabase', async () => {
    const error = new Error('Invalid login credentials');
    signInWithPassword.mockResolvedValue({ data: { user: null }, error });

    const result = await signIn('user@example.com', 'wrong');

    expect(result.error).toBe(error);
  });
});

describe('signUp', () => {
  it('normalizes the email and forwards the password', async () => {
    signUpMock.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });

    await signUp(' NEW@User.com ', 'hunter2');

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'new@user.com',
      password: 'hunter2',
    });
  });

  it('returns the data payload on success', async () => {
    const data = { user: { id: 'u2' }, session: null };
    signUpMock.mockResolvedValue({ data, error: null });

    const result = await signUp('new@user.com', 'hunter2');

    expect(result.data).toBe(data);
  });
});

describe('signOut', () => {
  it('delegates to supabase auth signOut', async () => {
    signOutMock.mockResolvedValue({ error: null });

    const result = await signOut();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ error: null });
  });

  it('propagates a signOut error', async () => {
    const error = new Error('Network error');
    signOutMock.mockResolvedValue({ error });

    const result = await signOut();

    expect(result.error).toBe(error);
  });
});

describe('requestPasswordReset', () => {
  it('builds the reset redirect from the current origin', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await requestPasswordReset(' Reset@User.com ');

    expect(resetPasswordForEmail).toHaveBeenCalledWith('reset@user.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });
});

describe('updatePassword', () => {
  it('forwards the new password to supabase', async () => {
    updateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    await updatePassword('new-secret');

    expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret' });
  });
});

describe('getCurrentSession', () => {
  it('delegates to supabase auth getSession', async () => {
    const session = { access_token: 'token' };
    getSession.mockResolvedValue({ data: { session }, error: null });

    const result = await getCurrentSession();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(result.data.session).toBe(session);
  });
});
