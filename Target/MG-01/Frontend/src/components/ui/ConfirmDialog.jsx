import Modal from './Modal';
import Button from './Button';

/**
 * Generic confirmation dialog for state-changing actions (BFSI "clear
 * confirmation" rule; preserves the legacy arm-then-confirm intent).
 */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  loadingLabel,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const footer = (
    <>
      <Button variant="outline" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button variant={confirmVariant} onClick={onConfirm} loading={busy} loadingLabel={loadingLabel}>
        {confirmLabel}
      </Button>
    </>
  );
  return (
    <Modal title={title} onClose={onCancel} footer={footer}>
      {children}
    </Modal>
  );
}
