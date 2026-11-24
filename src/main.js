import './styles.css';
import { $, $$, renderXP, runCleanups } from './core.js';
import * as pages from './pages.js';

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
  const titles = { learn: 'Learn', play: 'Play 3D', lab: 'Toolkit', glossary: 'Glossary', challenge: 'Challenge' };
  const seg = path.split('/')[1];
  document.title = titles[seg] ? `${titles[seg]} · PacketCraft` : 'PacketCraft — Learn Networking by Playing';
}

window.addEventListener('hashchange', route);
$('#menu-btn').addEventListener('click', () => $('#nav').classList.toggle('open'));
renderXP();
route();
