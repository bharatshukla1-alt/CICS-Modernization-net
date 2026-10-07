import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionTypeList } from '../hooks/useTransactionTypeList';
import TransactionTypeFilters from '../components/transaction-type/TransactionTypeFilters';
import TransactionTypeTable from '../components/transaction-type/TransactionTypeTable';
import TransactionTypePager from '../components/transaction-type/TransactionTypePager';
import TransactionTypeEditDialog from '../components/transaction-type/TransactionTypeEditDialog';
import TransactionTypeDeleteDialog from '../components/transaction-type/TransactionTypeDeleteDialog';
import Button from '../components/ui/Button';
import { MessageRegion } from '../components/ui/Alert';
import { MSG, messageForError } from '../lib/messages';
import * as api from '../services/transactionTypeApi';
import { useAuth } from '../auth/useAuth';

/**
 * Screen 1 — Transaction Types (list). Page header → filter card → results card
 * → pager → message region. Inline edit/delete each gated by a dialog; changing
 * a filter/selection dismisses any pending confirmation (UI §7.1).
 */
export default function TransactionTypeListScreen() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const { state, search, clear, next, previous, refreshFirstPage, setMessage } =
    useTransactionTypeList();

  const [dialog, setDialog] = useState(null); // { type: 'edit'|'delete', row }
  const [busy, setBusy] = useState(false);

  const isFiltered = Boolean(state.appliedFilters.typeCode || state.appliedFilters.description);

  // Any filter/selection change dismisses a pending confirmation without acting.
  function dismissDialog() {
    if (dialog) setDialog(null);
  }

  async function handleEditConfirm(description) {
    setBusy(true);
    try {
      const { data } = await api.save(dialog.row.typeCode, description, false);
      setDialog(null);
      if (data && data.changed === false) {
        refreshFirstPage(MSG.NO_CHANGE);
      } else {
        refreshFirstPage(MSG.UPDATED);
      }
    } catch (err) {
      // CON-002/CON-004: leave the row armed for update so the user can decide,
      // rather than discarding the edit by closing the dialog.
      setDialog((d) => (d ? { ...d, banner: messageForError(err) } : d));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    setBusy(true);
    try {
      await api.remove(dialog.row.typeCode);
      setDialog(null);
      refreshFirstPage(MSG.DELETED);
    } catch (err) {
      setDialog(null);
      setMessage(messageForError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Transaction Types</h1>
        <div className="flex">
          {canWrite && (
            <Button variant="primary" onClick={() => navigate('/transaction-types/add')}>
              Add transaction type
            </Button>
          )}
        </div>
      </div>

      <TransactionTypeFilters
        onSearch={(filters) => {
          dismissDialog();
          search(filters);
        }}
        onClear={() => {
          dismissDialog();
          clear();
        }}
        onFilterChange={dismissDialog}
        disabled={state.loading}
      />

      <section className="card section" aria-label="Transaction type results">
        <div className="card-body">
          {state.message && (
            <div className="message-slot">
              <MessageRegion message={state.message} />
            </div>
          )}

          <TransactionTypeTable
            items={state.items}
            loading={state.loading}
            loaded={state.loaded}
            isFiltered={isFiltered}
            canWrite={canWrite}
            onEdit={(row) => setDialog({ type: 'edit', row })}
            onDelete={(row) => setDialog({ type: 'delete', row })}
            onAdd={() => navigate('/transaction-types/add')}
          />

          {(state.items.length > 0 || state.hasPrevious) && (
            <TransactionTypePager
              pageNumber={state.pageNumber}
              hasNext={state.hasNext}
              hasPrevious={state.hasPrevious}
              onNext={next}
              onPrevious={previous}
            />
          )}
        </div>
      </section>

      {dialog?.type === 'edit' && (
        <TransactionTypeEditDialog
          row={dialog.row}
          saving={busy}
          banner={dialog.banner}
          onConfirm={handleEditConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'delete' && (
        <TransactionTypeDeleteDialog
          row={dialog.row}
          deleting={busy}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
