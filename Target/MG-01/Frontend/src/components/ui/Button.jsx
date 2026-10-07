/**
 * Button — thin wrapper over bfsi-theme .btn classes.
 * variant: primary | danger | outline | ghost | secondary | success | danger-ghost
 * Supports loading (spinner + aria-busy, disabled in-flight) and size/block.
 */
const VARIANT_CLASS = {
  primary: 'btn-primary',
  danger: 'btn-danger',
  'danger-ghost': 'btn-danger-ghost',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  secondary: 'btn-secondary',
  success: 'btn-success',
};

export default function Button({
  variant = 'primary',
  size,
  block = false,
  loading = false,
  loadingLabel,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    VARIANT_CLASS[variant] || 'btn-primary',
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading ? loadingLabel || children : children}
    </button>
  );
}
