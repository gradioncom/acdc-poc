import { describe, it, expect } from 'vitest';
import { applyMarkdown } from './markdownFormat';

describe('applyMarkdown', () => {
  it('bold wraps the selection with ** and selects the inner text', () => {
    const r = applyMarkdown('bold', { value: 'hello world', selectionStart: 0, selectionEnd: 5 });
    expect(r.value).toBe('**hello** world');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('hello');
  });

  it('bold inserts a placeholder when there is no selection', () => {
    const r = applyMarkdown('bold', { value: '', selectionStart: 0, selectionEnd: 0 });
    expect(r.value).toBe('**bold text**');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('bold text');
  });

  it('bold toggles off when the selection is already wrapped', () => {
    // Selection covers "hello" inside "**hello**".
    const r = applyMarkdown('bold', { value: '**hello**', selectionStart: 2, selectionEnd: 7 });
    expect(r.value).toBe('hello');
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe('hello');
  });

  it('italic wraps the selection with single underscores', () => {
    const r = applyMarkdown('italic', { value: 'word', selectionStart: 0, selectionEnd: 4 });
    expect(r.value).toBe('_word_');
  });

  it('heading prefixes the current line with "## "', () => {
    const r = applyMarkdown('heading', { value: 'Title', selectionStart: 2, selectionEnd: 2 });
    expect(r.value).toBe('## Title');
  });

  it('heading toggles off when the line is already a heading', () => {
    const r = applyMarkdown('heading', { value: '## Title', selectionStart: 4, selectionEnd: 4 });
    expect(r.value).toBe('Title');
  });

  it('list prefixes every selected line with "- "', () => {
    const value = 'one\ntwo';
    const r = applyMarkdown('list', { value, selectionStart: 0, selectionEnd: value.length });
    expect(r.value).toBe('- one\n- two');
  });

  it('link wraps the selection as a label and places the caret in the parens', () => {
    const r = applyMarkdown('link', { value: 'click', selectionStart: 0, selectionEnd: 5 });
    expect(r.value).toBe('[click]()');
    // Caret (empty selection) sits between the parentheses.
    expect(r.selectionStart).toBe(r.selectionEnd);
    expect(r.value.slice(0, r.selectionStart)).toBe('[click](');
  });

  it('link uses placeholder label when there is no selection', () => {
    const r = applyMarkdown('link', { value: '', selectionStart: 0, selectionEnd: 0 });
    expect(r.value).toBe('[link text]()');
  });
});
