import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { PAGE_SIZE } from '../../services/transactionTypeApi';

/**
 * Results table (UI §3.1 / §5.1). Semantic table, <=7 rows, columns
 * Type code / Description / Actions with context-rich per-row action labels.
 * Handles loading (skeleton), empty-no-filter (EmptyState) and rows.
 * Filtered-no-match is surfaced by the parent's message region (UI §8).
 */
export default function TransactionTypeTable({
  items,
  loading,
  loaded,
  isFiltered,
  canWrite = false,
  onEdit,
  onDelete,
  onAdd,
}) {
  if (loading) {
    return (
      <div className="table-wrap" aria-busy="true">
        <table className="data-table">
          <caption className="visually-hidden">Transaction types (loading)</caption>
          <thead>
            <tr>
              <th scope="col">Type code</th>
              <th scope="col">Description</th>
              <th scope="col" className="u-text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <tr key={i}>
                <td>
                  <span className="skeleton skeleton-code" />
                </td>
                <td>
                  <span className="skeleton skeleton-desc" />
                </td>
                <td>
                  <span className="skeleton skeleton-actions" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty unfiltered list → dedicated empty-state panel.
  if (loaded && items.length === 0 && !isFiltered) {
    return (
      <EmptyState
        title="No transaction types to show yet."
        description="Create the first transaction type to get started."
        action={
          canWrite ? (
            <Button variant="primary" onClick={onAdd}>
              Add transaction type
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="visually-hidden">Transaction types</caption>
        <thead>
          <tr>
            <th scope="col">Type code</th>
            <th scope="col">Description</th>
            <th scope="col" className="u-text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.typeCode}>
              <td>{row.typeCode}</td>
              <td>{row.description}</td>
              <td className="col-actions">
                {canWrite ? (
                  <div className="row-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(row)}
                      aria-label={`Edit transaction type ${row.typeCode}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => onDelete(row)}
                      aria-label={`Delete transaction type ${row.typeCode}`}
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
