import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /** The persistent top header bar (brand, search, actions). */
  header: ReactNode;
  /** The persistent left navigation sidebar. */
  sidebar: ReactNode;
  /** The main content area for the currently selected view. */
  children: ReactNode;
}

/** Id of the main landmark; the skip link targets this. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * App shell layout: a sticky top header spanning the full width, a persistent
 * left sidebar, and a main content area to the right.
 *
 * Pure presentational wrapper — it owns only the grid layout and renders the
 * three regions it is handed. The single <main> landmark lives here so the rest
 * of the app composes cleanly inside it.
 *
 * A "Skip to main content" link is the first focusable element so keyboard and
 * screen-reader users can bypass the header and sidebar and jump straight to
 * the main landmark. It stays visually hidden until focused.
 */
export function AppShell({ header, sidebar, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href={`#${MAIN_CONTENT_ID}`}>
        Skip to main content
      </a>
      {header}
      <div className={styles.body}>
        {sidebar}
        <main id={MAIN_CONTENT_ID} className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
