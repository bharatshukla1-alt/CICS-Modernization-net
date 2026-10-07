/**
 * Presentation-layer validation (UI §6 / reconcile §5). Pure functions returning
 * { valid, message }. Copy is verbatim and identifier-free; the server re-checks
 * every rule independently (defense-in-depth).
 */

export const DESCRIPTION_MAX = 50;

const TWO_DIGITS = /^[0-9]{2}$/;
const NUMERIC = /^[0-9]+$/;
const ALNUM_SPACE = /^[A-Za-z0-9 ]+$/;

/** Zero-pad a 1-digit code to 2 chars (UI §6.2 G1 — `5` -> `05`). */
export function padTypeCode(raw) {
  const v = (raw ?? '').trim();
  if (v === '*') return ''; // placeholder normalises to not-supplied (BDD b20)
  if (v.length === 1 && NUMERIC.test(v)) return `0${v}`;
  return v;
}

/** F1 — Type-code filter (Screen 1). Optional; if present must be 2 digits. */
export function validateTypeCodeFilter(raw) {
  const v = (raw ?? '').trim();
  if (v === '') return { valid: true, message: '' }; // blank = no filter
  if (!TWO_DIGITS.test(v)) {
    return { valid: false, message: 'Type code must be a 2-digit number.' };
  }
  return { valid: true, message: '' };
}

/** G1 — Type-code search key (Screen 2). Required, numeric, not zero. */
export function validateSearchKey(raw) {
  const v = padTypeCode(raw);
  if (v === '') return { valid: false, message: 'Enter a transaction type code.' };
  if (!NUMERIC.test(v)) return { valid: false, message: 'Transaction type code must be numeric.' };
  if (Number(v) === 0) return { valid: false, message: 'Transaction type code cannot be zero.' };
  return { valid: true, message: '' };
}

/** F3 / G2 — Description. Required; letters, numbers, spaces only; <= 50. */
export function validateDescription(raw) {
  const trimmed = (raw ?? '').trim();
  const v = trimmed === '*' ? '' : trimmed; // placeholder normalises to not-supplied (BDD b20)
  if (v === '') return { valid: false, message: 'Enter a description.' };
  if (!ALNUM_SPACE.test(v)) {
    return { valid: false, message: 'Description can contain letters, numbers, and spaces only.' };
  }
  // Length is prevented at the input (maxLength=50); guard anyway.
  if (v.length > DESCRIPTION_MAX) {
    return { valid: false, message: 'Description can contain letters, numbers, and spaces only.' };
  }
  return { valid: true, message: '' };
}
