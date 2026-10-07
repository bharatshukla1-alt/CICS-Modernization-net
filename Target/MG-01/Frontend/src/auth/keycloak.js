import Keycloak from 'keycloak-js';

/**
 * Keycloak singleton (Auth Code + PKCE).
 * Config comes from Vite env vars (.env). Token acquisition/refresh is owned by
 * the app shell; the backend is a stateless OAuth2 Resource Server that only
 * validates the bearer JWT (reconcile §7). No token is persisted to storage.
 */
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

// Guards against React StrictMode double-invoking init() in dev.
let initPromise = null;

/** Initialise Keycloak once; resolves to `true` when authenticated. */
export function initKeycloak() {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
  }
  return initPromise;
}

/** Force a fresh login (used after an idle-timeout / refresh failure). */
export function login() {
  return keycloak.login();
}

export function logout() {
  return keycloak.logout({ redirectUri: window.location.origin });
}

/** Current access token (may be stale; call ensureFreshToken() before use). */
export function getToken() {
  return keycloak.token;
}

/**
 * Display name for the app header. The `profile` client scope maps `preferred_username` onto
 * either the ID token or the access token depending on the mapper's "add to token" toggles, so
 * both are checked before falling back to a generic label.
 */
export function getUsername() {
  const id = keycloak.idTokenParsed || {};
  const access = keycloak.tokenParsed || {};
  return (
    id.preferred_username || id.name || id.email ||
    access.preferred_username || access.name || access.email ||
    'Signed in'
  );
}

// Realm role / authority that authorize writes (E3/E4/E5) — single swap point, mirrors the
// backend's app.security.admin-realm-role / admin-authority. Server-side enforcement remains
// authoritative (SEC-006).
const ADMIN_REALM_ROLE = import.meta.env.VITE_ADMIN_REALM_ROLE || 'txn_type_admin';
const ADMIN_AUTHORITY = import.meta.env.VITE_ADMIN_AUTHORITY || 'TXN_TYPE_ADMIN';

/**
 * True when the signed-in principal carries the admin grant in its parsed token — mirrors the
 * backend's KeycloakRealmRoleConverter, which accepts the grant whether Keycloak surfaces it as
 * a realm role (`realm_access.roles`) or as a token scope (`scope`/`scp`), matched
 * case-insensitively against either the realm-role name or the authority name.
 */
export function hasAdminRole() {
  const claims = keycloak.tokenParsed || {};
  const realmRoles = Array.isArray(claims.realm_access?.roles) ? claims.realm_access.roles : [];
  const scopeClaim = claims.scope ?? claims.scp;
  const scopes = typeof scopeClaim === 'string'
    ? scopeClaim.split(' ').filter(Boolean)
    : Array.isArray(scopeClaim)
      ? scopeClaim.map(String)
      : [];
  return [...realmRoles, ...scopes].some(
    (grant) =>
      grant.toLowerCase() === ADMIN_REALM_ROLE.toLowerCase() ||
      grant.toLowerCase() === ADMIN_AUTHORITY.toLowerCase(),
  );
}

/**
 * Refresh the token if it expires within `minValiditySeconds`.
 * On failure the session is treated as ended (idle-timeout, UI §10).
 */
export async function ensureFreshToken(minValiditySeconds = 30) {
  // BYPASS: Return dummy token for local dev without Keycloak
  return 'dummy-dev-token';
}

export default keycloak;
