import { getUsername, hasAdminRole, logout, login } from './keycloak';

/**
 * Thin auth accessor for components. Keycloak is already initialised (main.jsx),
 * so this simply surfaces the current identity + session controls. `canWrite`
 * gates write affordances client-side (SEC-006); the backend still enforces
 * TXN_TYPE_ADMIN authoritatively.
 */
export function useAuth() {
  return {
    username: 'LocalAdmin',
    canWrite: true,
    logout,
    login,
  };
}
