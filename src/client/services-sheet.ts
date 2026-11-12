import { api, getMode } from './api';
import { clear, h } from './dom';
import { icon } from './icons';
import { providerLogo } from './poster';
import { openSheet } from './sheet';
import { prefs } from './store';
import type { Provider } from '../shared/types';

export function openServicesSheet(extra: Provider[] = []): void {
  openSheet(
    'My services',
    (body, sheet) => {
      const input = h('input', { class: 'input', type: 'search', placeholder: 'Find a service', 'aria-label': 'Find a service', autocomplete: 'off', 'data-testid': 'services-search' });
      const count = h('p', { class: 'small tnum', role: 'status' });
      const list = h('ul', { class: 'pick-list', 'aria-label': 'Services' }, h('li', { class: 'empty' }, 'Loading services…'));
      body.append(
        h('p', { class: 'small' }, 'Pick the services you pay for. They appear first and get a "Yours" tag. Saved in this browser only.'),
        h('label', { class: 'search-field search-small' }, icon('search', 'icon search-icon'), input),
        count,
        list,
        h('div', { class: 'sheet-actions' }, h('button', { class: 'btn btn-accent', type: 'button', onclick: () => sheet.close() }, 'Done')),
      );

      let all: Provider[] = [];
      const initial = prefs.myServices();
      const updateCount = () => {
        const n = prefs.myServices().size;
        count.textContent = n ? `${n} selected` : 'None selected';
      };
      const render = () => {
        const q = input.value.trim().toLowerCase();
        const mine = prefs.myServices();
        const shown = all.filter((p) => !q || p.name.toLowerCase().includes(q));
        if (!shown.length) return clear(list, h('li', { class: 'empty' }, `No service called "${input.value.trim()}".`));
        clear(
          list,
          shown.slice(0, 120).map((p) => {
            const box = h('input', { type: 'checkbox', class: 'check', value: String(p.id), checked: mine.has(p.id) });
            box.addEventListener('change', () => {
              prefs.toggleService(p.id);
              updateCount();
            });
            return h('li', null, h('label', { class: 'pick' }, box, providerLogo(p.name, p.logo, getMode() === 'live'), h('span', null, p.name)));
          }),
        );
      };
      input.addEventListener('input', render);
      api
        .providers()
        .then((ps) => {
          const byId = new Map<number, Provider>();
          for (const p of [...extra, ...ps]) if (!byId.has(p.id)) byId.set(p.id, p);
          all = [...byId.values()].sort((a, b) => Number(initial.has(b.id)) - Number(initial.has(a.id)));
          render();
          updateCount();
          input.focus();
        })
        .catch(() => clear(list, h('li', { class: 'empty' }, 'The service list did not load. Close this and try again.')));
    },
    { testid: 'services-sheet' },
  );
}
