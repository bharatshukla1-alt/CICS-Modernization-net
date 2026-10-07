import { useCallback, useEffect, useReducer } from 'react';
import * as api from '../services/transactionTypeApi';
import { messageForError, MSG } from '../lib/messages';

/**
 * Screen 1 client state (reconcile §3, G1). Holds the applied filters, the
 * keyset cursor/direction, the current page's rows, hasNext/hasPrevious, and a
 * client-derived page number (count of Next/Previous from the first page = G1;
 * the backend returns no page number). Also the list-level message.
 */
const initialState = {
  appliedFilters: { typeCode: '', description: '' },
  items: [],
  hasNext: false,
  hasPrevious: false,
  nextCursor: null,
  prevCursor: null,
  pageNumber: 1,
  loading: false,
  loaded: false, // a request has completed at least once
  message: null, // { text, variant }
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, message: null };
    case 'LOAD_SUCCESS': {
      const { page, appliedFilters, pageNumber } = action;
      const filtered = Boolean(appliedFilters.typeCode || appliedFilters.description);
      let message = null;
      if ((page.items || []).length === 0) {
        message = filtered ? MSG.EMPTY_FILTERED : MSG.EMPTY_NO_FILTER;
      }
      return {
        ...state,
        appliedFilters,
        items: page.items || [],
        hasNext: !!page.hasNext,
        hasPrevious: !!page.hasPrevious,
        nextCursor: page.nextCursor ?? null,
        prevCursor: page.prevCursor ?? null,
        pageNumber,
        loading: false,
        loaded: true,
        message,
      };
    }
    case 'LOAD_ERROR':
      return { ...state, loading: false, loaded: true, message: action.message };
    case 'SET_MESSAGE':
      return { ...state, message: action.message };
    default:
      return state;
  }
}

export function useTransactionTypeList() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async ({ filters, cursor, direction, pageNumber }) => {
    dispatch({ type: 'LOAD_START' });
    try {
      const page = await api.search({
        typeCode: filters.typeCode || undefined,
        description: filters.description ? filters.description.trim() : undefined,
        cursor,
        direction,
      });
      dispatch({ type: 'LOAD_SUCCESS', page, appliedFilters: filters, pageNumber });
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', message: messageForError(err) });
    }
  }, []);

  // First page on mount (unfiltered).
  useEffect(() => {
    load({ filters: { typeCode: '', description: '' }, pageNumber: 1 });
  }, [load]);

  const search = useCallback(
    (filters) => load({ filters, pageNumber: 1 }),
    [load]
  );

  const clear = useCallback(
    () => load({ filters: { typeCode: '', description: '' }, pageNumber: 1 }),
    [load]
  );

  const next = useCallback(() => {
    if (!state.hasNext) {
      dispatch({ type: 'SET_MESSAGE', message: MSG.LAST_PAGE });
      return;
    }
    load({
      filters: state.appliedFilters,
      cursor: state.nextCursor,
      direction: 'forward',
      pageNumber: state.pageNumber + 1,
    });
  }, [load, state.hasNext, state.nextCursor, state.appliedFilters, state.pageNumber]);

  const previous = useCallback(() => {
    if (!state.hasPrevious) {
      dispatch({ type: 'SET_MESSAGE', message: MSG.FIRST_PAGE });
      return;
    }
    load({
      filters: state.appliedFilters,
      cursor: state.prevCursor,
      direction: 'backward',
      pageNumber: Math.max(1, state.pageNumber - 1),
    });
  }, [load, state.hasPrevious, state.prevCursor, state.appliedFilters, state.pageNumber]);

  // After a successful edit/delete, refresh to the first page keeping filters.
  const refreshFirstPage = useCallback(
    (message) => {
      load({ filters: state.appliedFilters, pageNumber: 1 }).then(() => {
        if (message) dispatch({ type: 'SET_MESSAGE', message });
      });
    },
    [load, state.appliedFilters]
  );

  const setMessage = useCallback((message) => dispatch({ type: 'SET_MESSAGE', message }), []);

  return { state, search, clear, next, previous, refreshFirstPage, setMessage };
}
