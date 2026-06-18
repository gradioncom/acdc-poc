/*
 * Pure helpers for the composer's markdown formatting toolbar.
 *
 * Each helper takes the current textarea value plus the selection range and
 * returns the next value together with the selection that should be restored
 * afterwards. Keeping the transforms pure makes them trivial to unit-test and
 * keeps the React component free of string-slicing logic.
 */

export interface FormatInput {
  /** Current textarea value. */
  value: string;
  /** Selection start offset (inclusive). */
  selectionStart: number;
  /** Selection end offset (exclusive). */
  selectionEnd: number;
}

export interface FormatResult {
  /** The new textarea value. */
  value: string;
  /** Where the selection should start after applying the change. */
  selectionStart: number;
  /** Where the selection should end after applying the change. */
  selectionEnd: number;
}

/** The markdown actions the toolbar can apply. */
export type MarkdownAction = 'bold' | 'italic' | 'heading' | 'list' | 'link';

/**
 * Wrap the current selection with `marker` on both sides (e.g. `**` for bold).
 *
 * Toggling: when the selection is already wrapped with the marker the wrapping
 * is removed instead, so pressing the same button/shortcut twice is a no-op on
 * the rendered output.
 *
 * When there is no selection the markers are inserted and the caret is placed
 * between them, ready for the user to type.
 */
function wrapSelection(input: FormatInput, marker: string, placeholder: string): FormatResult {
  const { value, selectionStart, selectionEnd } = input;
  const selected = value.slice(selectionStart, selectionEnd);
  const markerLen = marker.length;

  // Already wrapped? Unwrap (toggle off).
  const before = value.slice(selectionStart - markerLen, selectionStart);
  const after = value.slice(selectionEnd, selectionEnd + markerLen);
  if (selected.length > 0 && before === marker && after === marker) {
    const nextValue =
      value.slice(0, selectionStart - markerLen) + selected + value.slice(selectionEnd + markerLen);
    return {
      value: nextValue,
      selectionStart: selectionStart - markerLen,
      selectionEnd: selectionEnd - markerLen,
    };
  }

  const inner = selected.length > 0 ? selected : placeholder;
  const nextValue =
    value.slice(0, selectionStart) + marker + inner + marker + value.slice(selectionEnd);
  // Select the inner text so the user can keep typing / re-toggle.
  const innerStart = selectionStart + markerLen;
  return {
    value: nextValue,
    selectionStart: innerStart,
    selectionEnd: innerStart + inner.length,
  };
}

/**
 * Prefix every line touched by the selection with `prefix` (e.g. `## ` for a
 * heading, `- ` for a list). Toggles the prefix off when all touched lines
 * already start with it.
 */
function prefixLines(input: FormatInput, prefix: string): FormatResult {
  const { value, selectionStart, selectionEnd } = input;

  // Expand the range to cover whole lines.
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineEndIdx = value.indexOf('\n', selectionEnd);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const allPrefixed = lines.every((line) => line.startsWith(prefix));

  const nextLines = allPrefixed
    ? lines.map((line) => line.slice(prefix.length))
    : lines.map((line) => prefix + line);
  const nextBlock = nextLines.join('\n');

  const delta = nextBlock.length - block.length;
  const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);

  return {
    value: nextValue,
    selectionStart: lineStart,
    selectionEnd: lineEnd + delta,
  };
}

/**
 * Insert a markdown link. Any selected text becomes the link label; the caret
 * lands inside the `()` so the user can type the URL.
 */
function insertLink(input: FormatInput): FormatResult {
  const { value, selectionStart, selectionEnd } = input;
  const selected = value.slice(selectionStart, selectionEnd);
  const label = selected.length > 0 ? selected : 'link text';
  const snippet = `[${label}]()`;
  const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
  // Place the caret between the parentheses: after "[label](".
  const caret = selectionStart + label.length + 3;
  return { value: nextValue, selectionStart: caret, selectionEnd: caret };
}

/** Apply the given markdown action to a textarea value + selection. */
export function applyMarkdown(action: MarkdownAction, input: FormatInput): FormatResult {
  switch (action) {
    case 'bold':
      return wrapSelection(input, '**', 'bold text');
    case 'italic':
      return wrapSelection(input, '_', 'italic text');
    case 'heading':
      return prefixLines(input, '## ');
    case 'list':
      return prefixLines(input, '- ');
    case 'link':
      return insertLink(input);
  }
}
