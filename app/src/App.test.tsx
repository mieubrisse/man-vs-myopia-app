// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AppRoutes } from './App';
import { ROUTES } from './lib/routes';

// The router reads only who is signed in; the real provider would reach Firebase.
const authState = vi.hoisted(() => ({ currentUser: null as User | null }));

vi.mock('./firebase', () => ({ app: {}, auth: {}, db: {} }));
vi.mock('./lib/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    currentUser: authState.currentUser,
    loading: false,
    login: async () => {},
    logout: async () => {},
    signup: async () => {},
    loginWithGoogle: async () => {},
  }),
}));

// Signed-in pages load data on mount; these tests are about which page the router picks.
vi.mock('./pages/HomePage', () => ({ default: () => <div>home page</div> }));
vi.mock('./pages/AdminUserDataManagement.tsx', () => ({ default: () => <div>admin page</div> }));

const LocationProbe: React.FC = () => <div data-testid="pathname">{useLocation().pathname}</div>;

const renderAt = (pathname: string, user: User | null) => {
  authState.currentUser = user;
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>
  );
  return screen.getByTestId('pathname').textContent;
};

const SIGNED_IN_USER = { uid: 'test-user' } as User;
const UNKNOWN_PATH = '/no-such-page';

describe('AppRoutes', () => {
  afterEach(cleanup);

  it('sends a signed-out visitor at the admin page to login', () => {
    expect(renderAt(ROUTES.ADMIN, null)).toBe(ROUTES.LOGIN);
    expect(screen.queryByText('admin page')).toBeNull();
  });

  it('shows the admin page to a signed-in user', () => {
    expect(renderAt(ROUTES.ADMIN, SIGNED_IN_USER)).toBe(ROUTES.ADMIN);
    expect(screen.getByText('admin page')).toBeTruthy();
  });

  it('sends a signed-out visitor at an unknown path to login', () => {
    expect(renderAt(UNKNOWN_PATH, null)).toBe(ROUTES.LOGIN);
  });

  it('sends a signed-in user at an unknown path home', () => {
    expect(renderAt(UNKNOWN_PATH, SIGNED_IN_USER)).toBe(ROUTES.HOME);
    expect(screen.getByText('home page')).toBeTruthy();
  });
});
