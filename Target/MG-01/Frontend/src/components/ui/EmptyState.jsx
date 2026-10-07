/**
 * EmptyState — panel shown when the unfiltered list has no rows yet (UI §8).
 */
export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p className="text-muted u-mb-0">{description}</p>}
      {action && <div className="empty-actions">{action}</div>}
    </div>
  );
}
