import type { RefObject } from 'react';
import { Bold, Italic, Heading2, List, Link as LinkIcon, type LucideIcon } from 'lucide-react';
import { applyMarkdown, type MarkdownAction } from '../markdownFormat';
import styles from './MarkdownToolbar.module.css';

export interface MarkdownToolbarProps {
  /** Ref to the textarea the toolbar formats. */
  textareaRef: RefObject<HTMLTextAreaElement>;
  /** Controlled-value setter; receives the next body text. */
  onChange: (value: string) => void;
}

interface ToolDef {
  action: MarkdownAction;
  label: string;
  icon: LucideIcon;
  /** Keyboard hint shown in the tooltip / accessible name, e.g. "⌘B". */
  shortcut?: string;
}

const TOOLS: readonly ToolDef[] = [
  { action: 'bold', label: 'Bold', icon: Bold, shortcut: 'Ctrl+B' },
  { action: 'italic', label: 'Italic', icon: Italic, shortcut: 'Ctrl+I' },
  { action: 'heading', label: 'Heading', icon: Heading2 },
  { action: 'list', label: 'Bulleted list', icon: List },
  { action: 'link', label: 'Link', icon: LinkIcon, shortcut: 'Ctrl+K' },
];

/**
 * A small formatting toolbar that inserts markdown around the current
 * selection of the supplied textarea. The transforms live in
 * `markdownFormat.ts`; this component only bridges them to the DOM selection
 * and the controlled `onChange` handler.
 */
export function MarkdownToolbar({ textareaRef, onChange }: MarkdownToolbarProps) {
  function runAction(action: MarkdownAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = applyMarkdown(action, {
      value: textarea.value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    });

    onChange(result.value);

    // Restore focus + selection after React re-renders the controlled value.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      {TOOLS.map(({ action, label, icon: Icon, shortcut }) => {
        const title = shortcut ? `${label} (${shortcut})` : label;
        return (
          <button
            key={action}
            type="button"
            className={styles.button}
            // Prevent the textarea from losing its selection on mousedown.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runAction(action)}
            aria-label={title}
            title={title}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Map a keyboard event on the body textarea to a markdown action, or null when
 * the event is not a formatting shortcut. Exported for unit testing and reuse
 * by the composer's onKeyDown handler.
 */
export function shortcutAction(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}): MarkdownAction | null {
  if (!e.metaKey && !e.ctrlKey) return null;
  switch (e.key.toLowerCase()) {
    case 'b':
      return 'bold';
    case 'i':
      return 'italic';
    case 'k':
      return 'link';
    default:
      return null;
  }
}
