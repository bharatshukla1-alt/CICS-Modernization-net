import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import { MessageRegion } from '../ui/Alert';
import {
  validateDescription,
  DESCRIPTION_MAX,
} from '../../validation/transactionTypeValidation';

/**
 * Row edit dialog (UI §5.1 #15 / §7.1). Editable Description (Type code shown,
 * read-only). Save validates (F3) then requires an explicit confirm step
 * (arm-then-confirm preserved). `onConfirm(description)` performs the API call
 * (E4, createIfMissing=false) and returns a promise; the parent closes on done.
 * `banner` surfaces a submit-time server error (e.g. concurrent delete/lock
 * conflict) without discarding the armed edit, so the user can decide (CON-002/CON-004).
 */
export default function TransactionTypeEditDialog({ row, onConfirm, onCancel, saving, banner }) {
  const [description, setDescription] = useState(row.description || '');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const remaining = DESCRIPTION_MAX - description.length;

  function handleChange(e) {
    setDescription(e.target.value.slice(0, DESCRIPTION_MAX));
    if (error) setError('');
    if (confirming) setConfirming(false); // editing again cancels the pending confirm
  }

  function handleSave() {
    const result = validateDescription(description);
    if (!result.valid) {
      setError(result.message);
      return;
    }
    setError('');
    setConfirming(true);
  }

  const footer = confirming ? (
    <>
      <Button variant="outline" onClick={() => setConfirming(false)} disabled={saving}>
        Keep editing
      </Button>
      <Button
        variant="primary"
        onClick={() => onConfirm(description.trim())}
        loading={saving}
        loadingLabel="Saving…"
      >
        Confirm save
      </Button>
    </>
  ) : (
    <>
      <Button variant="outline" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save changes
      </Button>
    </>
  );

  return (
    <Modal title={`Edit transaction type ${row.typeCode}`} onClose={onCancel} footer={footer}>
      {banner && (
        <div className="u-mb-4">
          <MessageRegion message={banner} />
        </div>
      )}
      <TextField label="Type code" value={row.typeCode} readOnly disabled />
      <TextField
        label="Description"
        value={description}
        onChange={handleChange}
        onBlur={() => {
          const r = validateDescription(description);
          setError(r.valid ? '' : r.message);
        }}
        error={error}
        required
        maxLength={DESCRIPTION_MAX}
        hint={`${remaining} character${remaining === 1 ? '' : 's'} remaining`}
        autoFocus
      />
      {confirming && (
        <p className="text-muted u-mb-0">Save changes to this transaction type?</p>
      )}
    </Modal>
  );
}
