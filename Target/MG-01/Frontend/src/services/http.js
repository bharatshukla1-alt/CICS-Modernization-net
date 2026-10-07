import { ensureFreshToken } from '../auth/keycloak';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

let onSessionExpired = () => {};
/** Registered by main.jsx — called when the token can't be refreshed / 401. */
export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

/**
 * Normalized API error. Carries only safe, presentation-ready fields; never the
 * server `traceId` or raw payload (UI §10 / reconcile §7 diagnostic hygiene).
 */
export class ApiError extends Error {
  constructor({ status, code, field, message }) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || null;
    this.field = field || null;
  }
}

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function parseError(res) {
  // Backend returns ErrorResponseDto { code, message, field?, traceId }.
  // We drop traceId here so it can never reach the DOM.
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  return new ApiError({
    status: res.status,
    code: body.code || null,
    field: body.field || null,
    message: body.message || null,
  });
}

/**
 * CQ-009: single implementation of the authenticated fetch — token refresh, headers,
 * the 401 hand-off and error parsing all live here so `request()` and
 * `requestWithStatus()` can never drift apart. Returns `{ status, data }`, where
 * `data` is `null` for 204/205 and empty bodies.
 */
async function send(path, { method = 'GET', params, body } = {}) {
  const token = await ensureFreshToken();
  if (!token) {
    // Session can't be renewed — hand off to the re-auth flow.
    onSessionExpired();
    throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Session expired.' });
  }

  const res = await fetch(`${API_BASE}${path}${buildQuery(params)}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    onSessionExpired();
    throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Session expired.' });
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204 || res.status === 205) return { status: res.status, data: null };
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

/**
 * Core request: attaches a fresh bearer JWT over the proxied `/api` origin.
 * Returns parsed JSON, or `null` for 204/empty responses.
 */
export async function request(path, options) {
  const { data } = await send(path, options);
  return data;
}

/** Expose the raw status alongside the body for endpoints where 200 vs 201 matters (E4). */
export async function requestWithStatus(path, options) {
  return send(path, options);
}
