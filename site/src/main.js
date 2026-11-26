import './styles.css';
import { $, $$, renderXP, runCleanups } from './core.js';
import * as pages from './pages.js';
import { initPalette } from './palette.js';
import { lang, tr, setLang } from './i18n.js';

const app = $('#app');

const routes = [
  [/^\/?$/, () => pages.home(app), ''],
  [/^\/learn\/?$/, () => pages.learn(app), 'learn'],
  [/^\/learn\/([\w-]+)$/, (m) => pages.module(app, m[1]), 'learn'],
  [/^\/play\/?$/, () => pages.play(app), 'play'],
  [/^\/play\/([\w-]+)$/, (m) => pages.game(app, m[1]), 'play'],
  [/^\/lab\/?$/, () => pages.lab(app), 'lab'],
  [/^\/lab\/([\w-]+)$/, (m) => pages.lab(app, m[1]), 'lab'],
  [/^\/glossary\/?$/, () => pages.glossary(app), 'glossary'],
  [/^\/challenge\/?$/, () => pages.challenge(app), 'challenge'],
  [/^\/profile\/?$/, () => pages.profile(app), 'profile'],
  [/^\/review\/?$/, () => pages.review(app), 'review'],
  [/^\/certificate\/?$/, () => pages.certificate(app), 'profile'],
];

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  runCleanups();
  app.innerHTML = '';
  $('#nav').classList.remove('open');
  let matched = false;
  for (const [re, fn, nav] of routes) {
    const m = path.match(re);
    if (m) {
      matched = true;
      $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
      fn(m);
      break;
    }
  }
  if (!matched) pages.notFound(app);
  window.scrollTo({ top: 0, behavior: 'instant' });
  app.focus({ preventScroll: true });
  const titles = { profile: tr('Profile', 'Profil'), learn: tr('Learn', 'Lernen'), play: tr('Play 3D', '3D-Spiele'), lab: tr('Toolkit', 'Werkzeuge'), glossary: tr('Glossary', 'Glossar'), challenge: 'Challenge', review: tr('Flashcards', 'Karteikarten'), certificate: tr('Certificate', 'Zertifikat') };
  const seg = path.split('/')[1];
  document.title = titles[seg] ? `${titles[seg]} · PacketCraft` : tr('PacketCraft — Learn Networking by Playing', 'PacketCraft — Netzwerke spielerisch lernen');
  pages.updateDueBadge();
}

// static header text: swap to German where the markup provides it (keeps child elements like the badge)
if (lang === 'de') $$('[data-de]').forEach((el) => { el.firstChild.textContent = el.dataset.de + (el.childElementCount ? ' ' : ''); });
$('#lang-btn').textContent = lang === 'de' ? 'EN' : 'DE';
$('#lang-btn').title = tr('Auf Deutsch umschalten', 'Switch to English');
$('#lang-btn').addEventListener('click', () => setLang(lang === 'de' ? 'en' : 'de'));

window.addEventListener('hashchange', route);
$('#menu-btn').addEventListener('click', () => $('#nav').classList.toggle('open'));
renderXP();
const openPalette = initPalette(pages.GAMES, pages.TOOLS);
$('#search-btn').addEventListener('click', openPalette);
route();
