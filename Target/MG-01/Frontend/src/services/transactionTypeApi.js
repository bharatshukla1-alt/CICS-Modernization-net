import { request, requestWithStatus } from './http';

/**
 * Transaction Type service client — endpoints E1–E5 (reconcile §3–4).
 * Base path `/api/v1` is applied by http.js. Page size is fixed at 7 (UI §3.1).
 *
 * DTO shapes (reconcile §3):
 *   TransactionTypeDto        { typeCode, description }
 *   TransactionTypePageDto    { items[], hasNext, hasPrevious, nextCursor, prevCursor }
 *   UpdateTransactionTypeResponse (E4 200 envelope, G2) { typeCode, description, changed, code }
 *   ErrorResponseDto          { code, message, field?, traceId }  (traceId stripped client-side)
 */
export const PAGE_SIZE = 7;

/** E1 — GET /transaction-types (list / filter / keyset page). */
export function search({ typeCode, description, cursor, direction } = {}) {
  return request('/transaction-types', {
    method: 'GET',
    params: { typeCode, description, cursor, direction, size: PAGE_SIZE },
  });
}

/** E2 — GET /transaction-types/{code} (single record; 404 = not found). */
export function getOne(code) {
  return request(`/transaction-types/${encodeURIComponent(code)}`, { method: 'GET' });
}

/** E3 — POST /transaction-types (create; 201). */
export function create({ typeCode, description }) {
  return request('/transaction-types', {
    method: 'POST',
    body: { typeCode, description },
  });
}

/**
 * E4 — PUT /transaction-types/{code} (save existing / create-if-missing).
 * G3: list edit sends createIfMissing=false; details save sends true.
 * Returns { status, data } so the caller distinguishes 200 (update / no-change)
 * from 201 (re-created after a concurrent delete).
 */
export function save(code, description, createIfMissing) {
  return requestWithStatus(`/transaction-types/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: { description, createIfMissing },
  });
}

/** E5 — DELETE /transaction-types/{code} (204). */
export function remove(code) {
  return request(`/transaction-types/${encodeURIComponent(code)}`, { method: 'DELETE' });
}
