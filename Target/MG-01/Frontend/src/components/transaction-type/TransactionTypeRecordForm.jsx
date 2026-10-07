import { useState } from 'react';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { validateDescription, DESCRIPTION_MAX } from '../../validation/transactionTypeValidation';

/**
 * Record card (UI §3.2 / §5.2 / §7.2). Locked Type code + editable Description.
 * Action bar varies by state: found → Save/Delete/Cancel; not-found → arm Create/Cancel
 * (description stays closed until armed); creating → Create/Cancel (description open).
 * Save/Create validate (G2) then delegate to the parent, which opens the confirm
 * dialog. Cancel is state-dependent (revert edit vs leave create).
 */
export default function TransactionTypeRecordForm({
  mode, // 'found' | 'not-found' | 'creating' | 'add-new'
  code,
  original, // { typeCode, description } when found
  busy,
  canWrite = false,
  onSave,
  onCreate,
  onArmCreate,
  onDelete,
  onCancel,
  onCodeChange, // optional, for add-new mode
}) {
  const isNotFound = mode === 'not-found';
  const isArmedCreate = mode === 'creating';
  const isAddNew = mode === 'add-new';
  const [description, setDescription] = useState(isArmedCreate || isAddNew ? '' : original?.description || '');
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState('');

  const remaining = DESCRIPTION_MAX - description.length;
  const descriptionOpen = canWrite && (mode === 'found' || isArmedCreate || isAddNew);

  function handleChange(e) {
    setDescription(e.target.value.slice(0, DESCRIPTION_MAX));
    if (error) setError('');
  }

  function handleCodeChangeLocal(e) {
    onCodeChange(e);
    if (codeError) setCodeError('');
  }

  function validate() {
    let isValid = true;
    
    // Validate Description
    const result = validateDescription(description);
    if (!result.valid) {
      setError(result.message);
      isValid = false;
    } else {
      setError('');
    }

    // Validate Code (only if in add-new mode)
    if (isAddNew) {
      const trimmedCode = (code || '').trim();
      if (!trimmedCode) {
        setCodeError('Tran Type code must be supplied.');
        isValid = false;
      } else if (!/^[0-9]+$/.test(trimmedCode)) {
        setCodeError('Transaction type code must be numeric.');
        isValid = false;
      } else if (Number(trimmedCode) === 0) {
        setCodeError('Transaction type code cannot be zero.');
        isValid = false;
      } else {
        setCodeError('');
      }
    }

    return isValid;
  }

  function handleSave() {
    if (validate()) onSave(description.trim());
  }
  function handleCreate() {
    if (validate()) onCreate(description.trim());
  }

  return (
    <section className="card section" aria-label={isNotFound || isArmedCreate || isAddNew ? 'New transaction type' : 'Transaction type record'}>
      <div className="card-body">
        {isAddNew ? (
          <TextField
            label="Type code"
            value={code}
            onChange={handleCodeChangeLocal}
            onBlur={validate}
            error={codeError}
            required
            autoFocus
            maxLength={2}
          />
        ) : (
          <TextField label="Type code" value={code} readOnly disabled />
        )}
        <TextField
          label="Description"
          value={description}
          onChange={handleChange}
          onBlur={validate}
          error={error}
          required
          readOnly={!descriptionOpen}
          disabled={!descriptionOpen}
          maxLength={DESCRIPTION_MAX}
          hint={
            !canWrite
              ? 'You do not have permission to change transaction types.'
              : descriptionOpen
              ? `${remaining} character${remaining === 1 ? '' : 's'} remaining`
              : undefined
          }
          autoFocus={descriptionOpen}
        />

        <div className="action-bar">
          {!canWrite ? (
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Back
            </Button>
          ) : isNotFound ? (
            <>
              <Button variant="primary" onClick={onArmCreate} disabled={busy}>
                Create record
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
            </>
          ) : isArmedCreate || isAddNew ? (
            <>
              <Button variant="primary" onClick={handleCreate} disabled={busy}>
                Create record
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={handleSave} disabled={busy}>
                Save changes
              </Button>
              <Button variant="danger" onClick={onDelete} disabled={busy}>
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDescription(original?.description || '');
                  setError('');
                  onCancel();
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
