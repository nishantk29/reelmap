import { h } from '../dom';

export function renderNotFound(main: HTMLElement): void {
  main.append(
    h(
      'div',
      { class: 'wrap page-msg' },
      h('h1', { class: 'display' }, 'This page is not on the programme'),
      h('p', null, 'The link may be old or mistyped. Search for a title instead.'),
      h('a', { class: 'btn btn-outline', href: '/' }, 'Go to search'),
    ),
  );
}
