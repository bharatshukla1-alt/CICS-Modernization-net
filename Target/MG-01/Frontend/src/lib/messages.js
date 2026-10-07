/**
 * Reconciled message catalogue (UI §8 + reconcile gaps G4/G5/G6).
 * Maps a backend `code` -> user-facing copy + alert variant. Copy is
 * identifier-free; raw SQLSTATE / traceId is never shown.
 */

// Server error codes -> presentation.
const ERROR_CATALOGUE = {
  TXN_TYPE_NO_CHANGE: { text: 'No changes to save.', variant: 'info' },
  TXN_TYPE_HAS_DEPENDENTS: {
    text: 'This transaction type is in use and cannot be deleted while related records exist.',
    variant: 'warning',
  },
  TXN_TYPE_CONCURRENTLY_DELETED: {
    text: 'This record was removed by someone else. Refresh and try again.',
    variant: 'warning',
  },
  // CQ-002/SEC-004: the compare-and-swap update found the row already changed by someone else.
  TXN_TYPE_CONCURRENTLY_MODIFIED: {
    text: 'This record was changed by someone else. Refresh and try again.',
    variant: 'warning',
  },
  TXN_TYPE_LOCK_CONFLICT: {
    text: 'This record is being changed by someone else. Try again shortly.',
    variant: 'warning',
  },
  TXN_TYPE_ALREADY_EXISTS: {
    text: 'A transaction type with this code already exists.',
    variant: 'warning',
  }, // G5
  SERVICE_UNAVAILABLE: {
    text: 'The service is temporarily unavailable. Please try again shortly.',
    variant: 'danger',
  }, // G4
  TXN_TYPE_DB_ERROR: {
    text: 'Something went wrong and your change was not saved. Please try again.',
    variant: 'danger',
  },
  // SEC-006: the service throttled this caller; the response carries Retry-After.
  TOO_MANY_REQUESTS: {
    text: 'Too many requests. Please wait a moment and try again.',
    variant: 'warning',
  },
  FORBIDDEN: { text: 'You are not authorized to perform this action.', variant: 'danger' }, // G6
  UNAUTHENTICATED: { text: 'Your session ended. Please sign in again.', variant: 'warning' },
};

const GENERIC_ERROR = { text: 'Something went wrong. Please try again.', variant: 'danger' };

/**
 * Resolve a normalized ApiError to { text, variant }. Any unrecognized code
 * (incl. INVALID_DIRECTION / INVALID_PAGE_SIZE / INVALID_CURSOR, which a correct
 * client never triggers) falls back to the generic danger message (G6).
 */
export function messageForError(err) {
  const code = err && err.code;
  if (code && ERROR_CATALOGUE[code]) return ERROR_CATALOGUE[code];
  return GENERIC_ERROR;
}

// Success / info copy (UI §7–8) — referenced directly by the screens.
export const MSG = {
  // Screen 1
  UPDATED: { text: 'Transaction type updated.', variant: 'success' },
  DELETED: { text: 'Transaction type deleted.', variant: 'success' },
  NO_CHANGE: { text: 'No changes to save.', variant: 'info' },
  EMPTY_NO_FILTER: { text: 'No transaction types to show yet.', variant: 'info' },
  EMPTY_FILTERED: { text: 'No transaction types match those filters.', variant: 'info' },
  LAST_PAGE: { text: "You're on the last page.", variant: 'info' },
  FIRST_PAGE: { text: "You're on the first page.", variant: 'info' },
  // Screen 2
  SEARCH_PROMPT: { text: 'Enter a transaction type code to begin.', variant: 'info' },
  FOUND: { text: 'Review or update the details below.', variant: 'info' },
  NOT_FOUND: { text: 'No record exists for this code. You can create it.', variant: 'info' },
  CREATE_PROMPT: { text: 'Enter details for the new transaction type.', variant: 'info' },
  SAVED: { text: 'Changes saved.', variant: 'success' },
  CREATED: { text: 'Transaction type created.', variant: 'success' },
  DELETE_CANCELLED: { text: 'Delete cancelled.', variant: 'info' },
  UPDATE_CANCELLED: { text: 'Update cancelled.', variant: 'info' },
};
