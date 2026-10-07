import Button from '../ui/Button';

/**
 * Pager (UI §3.1 / §5.1 / §7.1). Previous / Next + a client-derived page
 * indicator (G1). Boundary buttons expose aria-disabled but remain pressable so
 * pressing at the last/first page can announce the boundary toast (UI §7.1).
 */
export default function TransactionTypePager({ pageNumber, hasNext, hasPrevious, onNext, onPrevious }) {
  return (
    <nav className="pager" aria-label="Results pages">
      <span className="text-muted text-sm" aria-live="polite">
        Page {pageNumber}
      </span>
      <div className="pager-controls">
        <Button
          variant="outline"
          onClick={onPrevious}
          aria-disabled={!hasPrevious || undefined}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          aria-disabled={!hasNext || undefined}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
