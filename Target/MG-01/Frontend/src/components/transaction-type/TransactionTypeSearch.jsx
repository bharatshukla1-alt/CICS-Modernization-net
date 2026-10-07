import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { padTypeCode, validateSearchKey } from '../../validation/transactionTypeValidation';

/**
 * Search card (UI §3.2 / §7.2). Type code input + Find. Validates G1 (required,
 * numeric, not zero) and zero-pads a single digit on submit. Once a record is
 * shown/created the code is locked (read-only) and Find becomes "New search".
 */
export default function TransactionTypeSearch({ mode, code, onFind, onNewSearch, loading }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const locked = mode !== 'search-entry';

  // On reset to a fresh prompt (e.g. after a completed save/create/delete) the
  // parent clears state.code, but this field's own typed value must follow —
  // otherwise the last-searched code lingers and the next Find re-fetches it.
  useEffect(() => {
    if (mode === 'search-entry') {
      setValue('');
      setError('');
    }
  }, [mode]);

  function handleChange(e) {
    // Cap length only — an invalid (non-numeric) value must reach validateSearchKey
    // so the correct rule fires, rather than being silently discarded here.
    setValue(e.target.value.slice(0, 2));
    if (error) setError('');
  }

  function submit(e) {
    e.preventDefault();
    const result = validateSearchKey(value);
    if (!result.valid) {
      setError(result.message);
      return;
    }
    setError('');
    onFind(padTypeCode(value));
  }

  return (
    <section className="card section" aria-label="Search transaction type">
      <form className="card-body" onSubmit={submit} noValidate>
        <div className="filter-row">
          <TextField
            className="field-code"
            label="Type code"
            value={locked ? code : value}
            onChange={handleChange}
            onBlur={() => {
              if (locked) return;
              const r = validateSearchKey(value);
              setError(r.valid ? '' : r.message);
            }}
            error={error}
            required={!locked}
            readOnly={locked}
            disabled={locked}
            inputMode="numeric"
            maxLength={2}
            placeholder="00"
            autoFocus
          />
          <div className="filter-actions form-group">
            {locked ? (
              <Button type="button" variant="outline" onClick={onNewSearch}>
                New search
              </Button>
            ) : (
              <Button type="submit" variant="primary" loading={loading} loadingLabel="Finding…">
                Find
              </Button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
