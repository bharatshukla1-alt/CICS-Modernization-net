import { useEffect, useRef, useId } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal — role="dialog" aria-modal, focus-trapped, Esc = cancel, backdrop
 * click = cancel, focus restored to the invoking control on close (UI §9).
 *
 * Props:
 *   title     — dialog heading (labels the dialog)
 *   onClose   — called for Esc / backdrop / close intent (treated as Cancel)
 *   footer    — action buttons node (rendered in .modal-footer)
 *   children  — dialog body
 */
export default function Modal({ title, onClose, footer, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    // Move focus into the dialog.
    const node = dialogRef.current;
    const focusables = node ? node.querySelectorAll(FOCUSABLE) : [];
    if (focusables.length) focusables[0].focus();
    else if (node) node.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = node.querySelectorAll(FOCUSABLE);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    // Prevent background scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the control that opened the dialog.
      if (previouslyFocused.current && previouslyFocused.current.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="card modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="card-header">
          <h3 id={titleId}>{title}</h3>
        </div>
        <div className="card-body">
          {children}
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
