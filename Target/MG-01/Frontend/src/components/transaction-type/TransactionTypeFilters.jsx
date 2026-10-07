import { useRef, useState } from 'react';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { validateTypeCodeFilter } from '../../validation/transactionTypeValidation';

/**
 * Filter card (UI §3.1 / §5.1). Type code + Description contains + Search + Clear,
 * baseline-aligned. Search validates the 2-digit rule (F1); blank = no filter.
 * `onFilterChange` lets the parent dismiss any pending confirmation (UI §7.1).
 */
export default function TransactionTypeFilters({ onSearch, onClear, onFilterChange, disabled }) {
  const [typeCode, setTypeCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const typeCodeRef = useRef(null);

  function handleTypeCode(e) {
    // Cap length only — an invalid (non-numeric) value must reach validateTypeCodeFilter
    // so the field error fires, rather than being silently discarded here.
    const v = e.target.value.slice(0, 2);
    setTypeCode(v);
    if (error) setError('');
    onFilterChange?.();
  }

  function handleDescription(e) {
    setDescription(e.target.value);
    onFilterChange?.();
  }

  function submit(e) {
    e.preventDefault();
    const result = validateTypeCodeFilter(typeCode);
    if (!result.valid) {
      setError(result.message);
      typeCodeRef.current?.focus();
      return;
    }
    setError('');
    onSearch({ typeCode: typeCode.trim(), description: description.trim() });
  }

  function handleClear() {
    setTypeCode('');
    setDescription('');
    setError('');
    onFilterChange?.();
    onClear();
  }

  return (
    <section className="card section" aria-label="Filter transaction types">
      <form className="card-body" onSubmit={submit} noValidate>
        <div className="filter-row">
          <TextField
            className="field-code"
            label="Type code"
            value={typeCode}
            onChange={handleTypeCode}
            onBlur={() => {
              const r = validateTypeCodeFilter(typeCode);
              setError(r.valid ? '' : r.message);
            }}
            error={error}
            inputMode="numeric"
            maxLength={2}
            placeholder="00"
            inputRef={typeCodeRef}
          />
          <TextField
            className="field-desc"
            label="Description contains"
            value={description}
            onChange={handleDescription}
            maxLength={50}
            placeholder="Search descriptions"
          />
          <div className="filter-actions form-group">
            <Button type="submit" variant="primary" disabled={disabled}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={handleClear} disabled={disabled}>
              Clear
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
