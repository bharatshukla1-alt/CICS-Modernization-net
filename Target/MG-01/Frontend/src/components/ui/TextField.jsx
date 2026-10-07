import { useId } from 'react';

/**
 * TextField — label + input(.form-control) with full a11y wiring (UI §9):
 * aria-required, aria-invalid, aria-describedby -> hint + error, .is-invalid.
 */
export default function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required = false,
  disabled = false,
  readOnly = false,
  type = 'text',
  maxLength,
  inputMode,
  placeholder,
  autoFocus = false,
  className = '',
  inputRef,
  ...rest
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id} className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        readOnly={readOnly}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required || undefined}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
