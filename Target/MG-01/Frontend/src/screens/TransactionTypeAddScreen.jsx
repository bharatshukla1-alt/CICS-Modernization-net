import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionTypeRecordForm from '../components/transaction-type/TransactionTypeRecordForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Button from '../components/ui/Button';
import { MessageRegion } from '../components/ui/Alert';
import { useAuth } from '../auth/useAuth';
import * as api from '../services/transactionTypeApi';
import { messageForError } from '../lib/messages';
import { padTypeCode, validateSearchKey } from '../validation/transactionTypeValidation';

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || '/admin';

/**
 * Screen for explicitly adding a Transaction Type.
 */
export default function TransactionTypeAddScreen() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { type: 'create', description }
  const [message, setMessage] = useState(null);

  function handleCancel() {
    navigate('/transaction-types');
  }

  function handleCodeChange(e) {
    // Only accept numeric up to 2 chars before padding
    setCode(e.target.value.slice(0, 2));
    if (message) setMessage(null);
  }

  async function confirmPending() {
    const p = pending;
    if (p.type === 'create') {
      setBusy(true);
      try {
        const paddedCode = padTypeCode(code);
        await api.create({ typeCode: paddedCode, description: p.description });
        navigate('/transaction-types', { state: { message: 'Transaction type created successfully.' } });
      } catch (err) {
        setMessage(messageForError(err));
      } finally {
        setBusy(false);
        setPending(null);
      }
    }
  }

  function cancelPending() {
    setPending(null);
  }

  function handleCreate(description) {
    const result = validateSearchKey(code);
    if (!result.valid) {
      setMessage(result.message);
      return;
    }
    setPending({ type: 'create', description });
  }

  return (
    <div className="container page workbench">
      <div className="page-header">
        <h1>Add Transaction Type</h1>
        <Button
          variant="ghost"
          className="screen-exit-btn"
          onClick={() => navigate('/transaction-types')}
        >
          Back
        </Button>
      </div>

      {message && (
        <div className="section">
          <MessageRegion message={message} />
        </div>
      )}

      <TransactionTypeRecordForm
        mode="add-new"
        code={code}
        onCodeChange={handleCodeChange}
        busy={busy}
        canWrite={canWrite}
        onCreate={handleCreate}
        onCancel={handleCancel}
      />

      {pending?.type === 'create' && (
        <ConfirmDialog
          title="Create transaction type"
          confirmLabel="Confirm create"
          loadingLabel="Creating…"
          busy={busy}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        >
          <p className="u-mb-0">
            Create transaction type <strong>{code}</strong>?
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
