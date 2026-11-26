// Language: 'de' or 'en'. Chosen once per page load; switching reloads so imported data matches.
const KEY = 'packetcraft.lang';
function detect() {
  try { const s = localStorage.getItem(KEY); if (s === 'de' || s === 'en') return s; } catch { /* storage blocked */ }
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}
export const lang = detect();
/** Inline translation: tr('English', 'Deutsch'). Falls back to English when no German is given. */
export const tr = (en, de) => (lang === 'de' && de != null ? de : en);
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  location.reload();
}
