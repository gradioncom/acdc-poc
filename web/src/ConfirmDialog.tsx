import { useEffect, useRef } from 'react';
import { Button } from './components/Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  /** Dialog heading — shown prominently at the top. */
  title: string;
  /** Descriptive message explaining what will happen. */
  message: string;
  /** Label for the confirm (destructive) button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Called when the user clicks the confirm button. */
  onConfirm: () => void;
  /** Called when the user clicks cancel, presses Escape, or clicks the backdrop. */
  onCancel: () => void;
}

/**
 * Accessible in-app confirmation dialog, implementing the ARIA APG modal dialog pattern.
 *
 * Accessibility properties:
 * - `role="dialog"` + `aria-modal="true"` so screen readers treat it as a modal.
 * - `aria-labelledby` points at the visible heading.
 * - The cancel button receives `autoFocus` so focus moves into the dialog on mount.
 * - Focus is trapped within the dialog panel: Tab/Shift+Tab cycle between focusable
 *   elements without escaping into the page behind the backdrop.
 * - The Escape key closes the dialog.
 * - Focus returns to the trigger element when the dialog closes (handled by the caller
 *   via `deleteTriggerRef`).
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = 'confirm-dialog-title';
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle Escape to close and Tab/Shift+Tab to trap focus within the dialog.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className={styles.backdrop}
      // Clicking outside the panel cancels.
      onClick={onCancel}
      data-testid="confirm-dialog-backdrop"
    >
      {/* Stop propagation so clicks inside the panel don't bubble to the backdrop. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {/* autoFocus moves focus into the dialog when it opens (cancel is safe default). */}
          <Button variant="secondary" autoFocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
