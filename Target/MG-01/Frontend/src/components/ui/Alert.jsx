/**
 * Alert / message region (UI §8/§9). Renders a themed .alert; the live-region
 * politeness is chosen by variant — errors/warnings assertive, info/success polite —
 * so screen readers announce without stealing focus mid-typing.
 */
export default function Alert({ variant = 'info', children, className = '' }) {
  const assertive = variant === 'danger' || variant === 'warning';
  return (
    <div
      className={`alert alert--${variant} ${className}`}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
    >
      <span>{children}</span>
    </div>
  );
}

/**
 * MessageRegion — always-present polite/assertive live region wrapper so
 * dynamically injected messages are announced. Renders nothing when empty.
 */
export function MessageRegion({ message }) {
  if (!message) return <div className="visually-hidden" aria-live="polite" />;
  return <Alert variant={message.variant}>{message.text}</Alert>;
}
