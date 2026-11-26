import { tr } from '../i18n.js';
// HTML building blocks shared by the English and German lesson files.
export const analogy = (t) => `<div class="callout analogy"><span class="ci">💡</span><div><p>${t}</p></div></div>`;
export const note = (t) => `<div class="callout"><span class="ci">✦</span><div><p>${t}</p></div></div>`;
export const warn = (t) => `<div class="callout warn"><span class="ci">⚠</span><div><p>${t}</p></div></div>`;
export const deep = (title, body) => `<details class="deep-dive"><summary><span class="tag violet">${tr('Deep dive', 'Vertiefung')}</span> <span class="dd-title">${title}</span><span class="chev">▶</span></summary><div class="dd-body">${body}</div></details>`;
