/** Bottom sheet on phones, centred panel on desktop. Built on <dialog>. */
import { h, nextId, type Child } from './dom';
import { icon } from './icons';

export interface Sheet {
  el: HTMLDialogElement;
  body: HTMLElement;
  close(): void;
}

export function openSheet(title: string, build: (body: HTMLElement, sheet: Sheet) => void, opts: { wide?: boolean; testid?: string; onClose?: () => void } = {}): Sheet {
  const titleId = nextId('sheet-title');
  const body = h('div', { class: 'sheet-body' });
  const closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close' }, icon('close'));
  const el = h(
    'dialog',
    { class: ['sheet', opts.wide && 'sheet-wide'], 'aria-labelledby': titleId, 'data-testid': opts.testid ?? null },
    h('div', { class: 'sheet-head' }, h('h2', { id: titleId, class: 'sheet-title' }, title), closeBtn),
    body,
  );
  const sheet: Sheet = {
    el,
    body,
    close() {
      if (el.open) el.close();
    },
  };
  closeBtn.addEventListener('click', () => sheet.close());
  // Clicking the backdrop (the dialog box itself, outside the content) closes it.
  el.addEventListener('click', (e) => {
    if (e.target === el) sheet.close();
  });
  el.addEventListener('close', () => {
    opts.onClose?.();
    el.remove();
  });
  build(body, sheet);
  document.body.append(el);
  el.showModal();
  return sheet;
}

export function section(heading: string, ...children: Child[]): HTMLElement {
  return h('section', { class: 'sheet-section' }, h('h3', { class: 'sheet-h' }, heading), ...children);
}
