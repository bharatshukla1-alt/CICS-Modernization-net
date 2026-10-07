import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionTypeRecord } from '../hooks/useTransactionTypeRecord';
import TransactionTypeSearch from '../components/transaction-type/TransactionTypeSearch';
import TransactionTypeRecordForm from '../components/transaction-type/TransactionTypeRecordForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Button from '../components/ui/Button';
import { MessageRegion } from '../components/ui/Alert';
import { useAuth } from '../auth/useAuth';

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || '/admin';

/**
 * Screen 2 — Transaction Type Details. Search card → record card (revealed after
 * a search) → message region. Save / Create / Delete each gated by a confirm
 * dialog; Cancel is state-dependent (UI §7.2).
 */
export default function TransactionTypeDetailScreen() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const {
    state,
    find,
    saveChanges,
    createRecord,
    deleteRecord,
    armCreate,
    cancelEdit,
    cancelDelete,
    reset,
  } = useTransactionTypeRecord();

  const [pending, setPending] = useState(null); // { type: 'save'|'create'|'delete', description? }

  const showRecord = state.mode === 'found' || state.mode === 'not-found' || state.mode === 'creating';

  function handleCancel() {
    if (state.mode === 'not-found' || state.mode === 'creating') reset();
    else cancelEdit();
  }

  async function confirmPending() {
    const p = pending;
    if (p.type === 'save') await saveChanges(p.description);
    else if (p.type === 'create') await createRecord(p.description);
    else if (p.type === 'delete') await deleteRecord();
    setPending(null);
  }

  function cancelPending() {
    // Cancelling a delete confirmation is itself a "delete cancelled" outcome.
    if (pending?.type === 'delete') cancelDelete();
    setPending(null);
  }

  return (
    <div className="container page workbench">
      <div className="page-header">
        <h1>Transaction Type Details</h1>
        {/* BR-017: exit must succeed from every state, including while a save/delete
            confirmation dialog is open. The dialog overlay covers the whole viewport
            (app.css .modal-overlay), so this control is raised above it (.screen-exit-btn)
            without changing the dialog's own backdrop/Esc-cancel behaviour. */}
        <Button
          variant="ghost"
          className="screen-exit-btn"
          onClick={() => navigate(ADMIN_ROUTE)}
        >
          Back
        </Button>
      </div>

      <TransactionTypeSearch
        mode={state.mode}
        code={state.code}
        loading={state.loading}
        onFind={find}
        onNewSearch={reset}
      />

      {state.message && (
        <div className="section">
          <MessageRegion message={state.message} />
        </div>
      )}

      {showRecord && (
        <TransactionTypeRecordForm
          key={`${state.mode}-${state.code}`}
          mode={state.mode}
          code={state.code}
          original={state.original}
          busy={state.busy}
          canWrite={canWrite}
          onSave={(description) => setPending({ type: 'save', description })}
          onCreate={(description) => setPending({ type: 'create', description })}
          onArmCreate={armCreate}
          onDelete={() => setPending({ type: 'delete' })}
          onCancel={handleCancel}
        />
      )}

      {pending?.type === 'save' && (
        <ConfirmDialog
          title="Save changes"
          confirmLabel="Confirm save"
          loadingLabel="Saving…"
          busy={state.busy}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        >
          <p className="u-mb-0">Save changes to this transaction type?</p>
        </ConfirmDialog>
      )}
      {pending?.type === 'create' && (
        <ConfirmDialog
          title="Create transaction type"
          confirmLabel="Confirm create"
          loadingLabel="Creating…"
          busy={state.busy}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        >
          <p className="u-mb-0">
            Create transaction type <strong>{state.code}</strong>?
          </p>
        </ConfirmDialog>
      )}
      {pending?.type === 'delete' && (
        <ConfirmDialog
          title="Delete transaction type"
          confirmLabel="Delete"
          confirmVariant="danger"
          loadingLabel="Deleting…"
          busy={state.busy}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        >
          <p className="u-mb-0">
            Delete transaction type <strong>{state.code}</strong>? This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
