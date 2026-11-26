import { MODULES } from './data/modules.js';
import { GLOSSARY } from './data/glossary.js';
import { esc } from './core.js';
import { tr } from './i18n.js';

/** ⌘K / Ctrl+K command palette: search lessons, sections, glossary, games and tools. */
let items = null;
function buildItems(GAMES, TOOLS) {
  const list = [];
  MODULES.forEach((m) => {
    list.push({ kind: 'lesson', icon: m.icon, title: m.title, sub: tr('Lesson', 'Lektion') + ' · ' + m.summary, href: `#/learn/${m.id}`, kw: m.title + ' ' + m.summary });
    [...m.body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)].forEach(([, , t]) => list.push({ icon: '§', title: t, sub: `${tr('in', 'in')} ${m.title}`, href: `#/learn/${m.id}`, kw: t + ' ' + m.title }));
  });
  GAMES.forEach((g) => list.push({ kind: 'game', icon: '🎮', title: g.title, sub: tr('Play', 'Spielen') + ' · ' + g.tag, href: `#/play/${g.id}`, kw: g.title + ' ' + g.blurb }));
  TOOLS.forEach((t) => list.push({ icon: t.icon, title: t.name, sub: tr('Toolkit', 'Werkzeuge'), href: `#/lab/${t.id}`, kw: t.name + ' tool' }));
  GLOSSARY.forEach(([t, d, mod]) => list.push({ icon: '📖', title: t, sub: d, href: mod ? `#/learn/${mod}` : '#/glossary', kw: t + ' ' + d }));
  [['🏠', tr('Home', 'Startseite'), '#/'], ['🗺️', tr('Learning path', 'Lernpfad'), '#/learn'], ['🗂', tr('Flashcards', 'Karteikarten'), '#/review'], ['⚡', 'Challenge', '#/challenge'], ['🏅', tr('Profile & badges', 'Profil & Abzeichen'), '#/profile'], ['📖', tr('Glossary', 'Glossar'), '#/glossary']].forEach(([icon, title, href]) => list.push({ icon, title, sub: tr('Page', 'Seite'), href, kw: title }));
  return list;
}

export function initPalette(GAMES, TOOLS) {
  const root = document.createElement('div');
  root.className = 'palette';
  root.hidden = true;
  root.innerHTML = `<div class="palette-box" role="dialog" aria-label="${tr('Search', 'Suche')}"><input class="palette-in" placeholder="${tr('Search lessons, terms, games, tools…', 'Lektionen, Begriffe, Spiele, Werkzeuge suchen …')}" autocomplete="off"><div class="palette-list"></div><div class="palette-foot mono">${tr('↑↓ navigate · ↵ open · esc close', '↑↓ auswählen · ↵ öffnen · Esc schließen')}</div></div>`;
  document.body.appendChild(root);
  const input = root.querySelector('.palette-in'), listEl = root.querySelector('.palette-list');
  let results = [], sel = 0;
  const score = (it, q) => {
    const t = it.title.toLowerCase(), k = it.kw.toLowerCase();
    if (t === q) return 100; if (t.startsWith(q)) return 80; if (t.includes(q)) return 60;
    const words = q.split(/\s+/); return words.every((w) => k.includes(w)) ? 30 : 0;
  };
  function render() {
    items = items || buildItems(GAMES, TOOLS);
    const q = input.value.trim().toLowerCase();
    results = q ? items.map((it) => [score(it, q), it]).filter(([s]) => s).sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, it]) => it) : items.filter((i) => i.kind).slice(0, 12);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    listEl.innerHTML = results.length ? results.map((r, i) => `<a href="${r.href}" class="palette-item ${i === sel ? 'sel' : ''}" data-i="${i}"><span class="pi">${r.icon}</span><span><b>${esc(r.title)}</b><small>${esc(r.sub.slice(0, 90))}</small></span></a>`).join('') : `<div class="palette-empty">${tr('No results. Try “subnet”, “TTL” or “handshake”.', 'Keine Treffer. Versuch „Subnetz“, „TTL“ oder „Handshake“.')}</div>`;
    listEl.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }
  const open = () => { root.hidden = false; input.value = ''; sel = 0; render(); input.focus(); };
  const close = () => { root.hidden = true; };
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
    else if (e.key === 'Enter' && results[sel]) { location.hash = results[sel].href; close(); }
    else if (e.key === 'Escape') close();
  });
  root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('.palette-item')) close(); });
  window.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); root.hidden ? open() : close(); }
  });
  return open;
}
