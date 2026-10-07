import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Delete confirmation dialog (UI §5.1 #16 / §7.1). Names the code + description;
 * Confirm calls `onConfirm()` (E5). Parent closes + refreshes on success.
 */
export default function TransactionTypeDeleteDialog({ row, onConfirm, onCancel, deleting }) {
  const footer = (
    <>
      <Button variant="outline" onClick={onCancel} disabled={deleting}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm} loading={deleting} loadingLabel="Deleting…">
        Delete
      </Button>
    </>
  );

  return (
    <Modal title="Delete transaction type" onClose={onCancel} footer={footer}>
      <p>
        Delete transaction type <strong>{row.typeCode}</strong> — “{row.description}”? This cannot be
        undone.
      </p>
    </Modal>
  );
}
