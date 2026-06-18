import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { NoteComposer } from './NoteComposer';
import type { NoteColor } from '../api';

/**
 * Render the composer with a controlled body so the markdown toolbar can be
 * exercised end-to-end (button click -> onBodyChange -> re-render).
 */
function renderControlledComposer(initialBody = '') {
  function Harness() {
    const [body, setBody] = useState(initialBody);
    const ref = createRef<HTMLInputElement>();
    return (
      <NoteComposer
        title=""
        onTitleChange={() => {}}
        body={body}
        onBodyChange={setBody}
        tagsInput=""
        onTagsInputChange={() => {}}
        color={'none' as NoteColor}
        onColorChange={() => {}}
        onSubmit={(e) => e.preventDefault()}
        newNoteTitleRef={ref}
      />
    );
  }
  render(<Harness />);
  return screen.getByLabelText(/^body$/i) as HTMLTextAreaElement;
}

function selectAll(textarea: HTMLTextAreaElement) {
  textarea.focus();
  textarea.setSelectionRange(0, textarea.value.length);
}

describe('MarkdownToolbar', () => {
  it('renders an accessible formatting toolbar', () => {
    renderControlledComposer();
    expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
  });

  it('renders accessible buttons for every action', () => {
    renderControlledComposer();
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /heading/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulleted list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^link/i })).toBeInTheDocument();
  });

  it('exposes keyboard shortcuts in the button accessible name', () => {
    renderControlledComposer();
    expect(screen.getByRole('button', { name: /bold \(ctrl\+b\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic \(ctrl\+i\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /link \(ctrl\+k\)/i })).toBeInTheDocument();
  });

  it('wraps the selection in ** when the Bold button is clicked', async () => {
    const textarea = renderControlledComposer('hello');
    selectAll(textarea);
    await userEvent.click(screen.getByRole('button', { name: /bold/i }));
    expect(textarea.value).toBe('**hello**');
  });

  it('wraps the selection in _ when the Italic button is clicked', async () => {
    const textarea = renderControlledComposer('hello');
    selectAll(textarea);
    await userEvent.click(screen.getByRole('button', { name: /italic/i }));
    expect(textarea.value).toBe('_hello_');
  });

  it('prefixes the line with "## " when the Heading button is clicked', async () => {
    const textarea = renderControlledComposer('Title');
    selectAll(textarea);
    await userEvent.click(screen.getByRole('button', { name: /heading/i }));
    expect(textarea.value).toBe('## Title');
  });

  it('prefixes lines with "- " when the List button is clicked', async () => {
    const textarea = renderControlledComposer('one\ntwo');
    selectAll(textarea);
    await userEvent.click(screen.getByRole('button', { name: /bulleted list/i }));
    expect(textarea.value).toBe('- one\n- two');
  });

  it('inserts a markdown link when the Link button is clicked', async () => {
    const textarea = renderControlledComposer('site');
    selectAll(textarea);
    await userEvent.click(screen.getByRole('button', { name: /^link/i }));
    expect(textarea.value).toBe('[site]()');
  });

  it('applies bold via the Ctrl+B keyboard shortcut', () => {
    const textarea = renderControlledComposer('hello');
    selectAll(textarea);
    act(() => {
      fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    });
    expect(textarea.value).toBe('**hello**');
  });

  it('applies a link via the Ctrl+K keyboard shortcut', () => {
    const textarea = renderControlledComposer('site');
    selectAll(textarea);
    act(() => {
      fireEvent.keyDown(textarea, { key: 'k', metaKey: true });
    });
    expect(textarea.value).toBe('[site]()');
  });

  it('does not alter the body for non-shortcut keys', () => {
    const textarea = renderControlledComposer('hello');
    selectAll(textarea);
    act(() => {
      fireEvent.keyDown(textarea, { key: 'b' });
    });
    expect(textarea.value).toBe('hello');
  });
});
