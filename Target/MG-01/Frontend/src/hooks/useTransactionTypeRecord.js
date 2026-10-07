import { useCallback, useReducer } from 'react';
import * as api from '../services/transactionTypeApi';
import { messageForError, MSG } from '../lib/messages';
import { ApiError } from '../services/http';

/**
 * Screen 2 state machine (UI §7.2):
 *   search-entry → found (view/edit) | not-found (offer create) → creating (armed, description open)
 *   → [save | create | delete] → reset to search-entry.
 * Holds the searched code, the originally fetched record (for Cancel revert),
 * loading/busy flags, and the current message.
 */
const initialState = {
  mode: 'search-entry', // 'search-entry' | 'found' | 'not-found' | 'creating'
  code: '',
  original: null, // { typeCode, description }
  loading: false, // find in flight
  busy: false, // save/create/delete in flight
  message: MSG.SEARCH_PROMPT,
};

function reducer(state, action) {
  switch (action.type) {
    case 'FIND_START':
      return { ...state, loading: true, message: null };
    case 'FOUND':
      return {
        ...state,
        loading: false,
        mode: 'found',
        code: action.record.typeCode,
        original: action.record,
        message: action.message || MSG.FOUND,
      };
    case 'NOT_FOUND':
      return {
        ...state,
        loading: false,
        mode: 'not-found',
        code: action.code,
        original: null,
        message: MSG.NOT_FOUND,
      };
    case 'FIND_ERROR':
      return { ...state, loading: false, message: action.message };
    case 'ARM_CREATE':
      return { ...state, mode: 'creating', message: MSG.CREATE_PROMPT };
    case 'BUSY':
      return { ...state, busy: action.busy };
    case 'SET_MESSAGE':
      return { ...state, message: action.message };
    case 'RESET':
      return { ...initialState, message: action.message || MSG.SEARCH_PROMPT };
    default:
      return state;
  }
}

export function useTransactionTypeRecord() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** `code` is already validated + zero-padded by the caller (Search). */
  const find = useCallback(async (code, foundMessage) => {
    dispatch({ type: 'FIND_START' });
    try {
      const record = await api.getOne(code);
      dispatch({ type: 'FOUND', record, message: foundMessage });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        dispatch({ type: 'NOT_FOUND', code });
      } else {
        dispatch({ type: 'FIND_ERROR', message: messageForError(err) });
      }
    }
  }, []);

  const saveChanges = useCallback(
    async (description) => {
      dispatch({ type: 'BUSY', busy: true });
      try {
        const { status, data } = await api.save(state.code, description, true);
        if (status === 201) {
          dispatch({ type: 'RESET', message: MSG.CREATED });
        } else if (data && data.changed === false) {
          dispatch({ type: 'SET_MESSAGE', message: MSG.NO_CHANGE });
        } else {
          dispatch({ type: 'RESET', message: MSG.SAVED });
        }
      } catch (err) {
        dispatch({ type: 'SET_MESSAGE', message: messageForError(err) });
      } finally {
        dispatch({ type: 'BUSY', busy: false });
      }
    },
    [state.code]
  );

  const createRecord = useCallback(
    async (description) => {
      dispatch({ type: 'BUSY', busy: true });
      try {
        await api.create({ typeCode: state.code, description });
        dispatch({ type: 'RESET', message: MSG.CREATED });
      } catch (err) {
        // G5: a concurrent create collided — surface the record that now exists.
        if (err instanceof ApiError && err.code === 'TXN_TYPE_ALREADY_EXISTS') {
          await find(state.code, messageForError(err));
        } else {
          dispatch({ type: 'SET_MESSAGE', message: messageForError(err) });
        }
      } finally {
        dispatch({ type: 'BUSY', busy: false });
      }
    },
    [state.code, find]
  );

  const deleteRecord = useCallback(async () => {
    dispatch({ type: 'BUSY', busy: true });
    try {
      await api.remove(state.code);
      dispatch({ type: 'RESET', message: MSG.DELETED });
    } catch (err) {
      dispatch({ type: 'SET_MESSAGE', message: messageForError(err) });
    } finally {
      dispatch({ type: 'BUSY', busy: false });
    }
  }, [state.code]);

  const armCreate = useCallback(() => dispatch({ type: 'ARM_CREATE' }), []);

  const cancelEdit = useCallback(
    () => dispatch({ type: 'SET_MESSAGE', message: MSG.UPDATE_CANCELLED }),
    []
  );
  const cancelDelete = useCallback(
    () => dispatch({ type: 'RESET', message: MSG.DELETE_CANCELLED }),
    []
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    find,
    saveChanges,
    createRecord,
    deleteRecord,
    armCreate,
    cancelEdit,
    cancelDelete,
    reset,
  };
}
