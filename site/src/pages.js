import { webglOK, h, $, $$, store, levelInfo, esc, shuffle, pick, rand, intToIp, subnetInfo, loop, onCleanup, toast } from './core.js';
import { MODULES, LEVELS, moduleById } from './data/modules.js';
import { GLOSSARY } from './data/glossary.js';
import { GLOSSARY_EN } from './data/glossary.en.js';
import { tr, lang } from './i18n.js';
import * as srs from './srs.js';
import { sfx } from './sfx.js';
import { mountWidgets, WIDGETS } from './widgets/index.js';


const footer = () => `<footer class="footer"><div class="wrap"><div><b style="color:var(--text);font-family:var(--font-display)">Packet<span style="color:var(--mint)">Craft</span></b> — ${tr('learn networking by poking at it.', 'Netzwerke lernen durch Ausprobieren.')}</div><div>${tr('Progress is saved in your browser', 'Fortschritt wird in deinem Browser gespeichert')} · <a href="#/" id="reset-progress">${tr('reset progress', 'Fortschritt zurücksetzen')}</a></div></div></footer>`;

function bindFooter(root) {
  const r = $('#reset-progress', root);
  if (r) r.onclick = (e) => { e.preventDefault(); if (confirm(tr('Reset all XP and progress?', 'Alle XP und Fortschritte zurücksetzen?'))) { store.reset(); toast(tr('Progress reset', 'Fortschritt zurückgesetzt')); location.hash = '#/'; } };
}

/* ---------------- game catalogue ---------------- */
export const GAMES = [
  { id: 'journey', title: tr('Journey of a Click', 'Reise eines Klicks'), tag: 'Story · 3D', color: 'var(--sky)', blurb: tr('A guided 3D cinematic of everything that happens when you load a page: ARP, DNS recursion, the TCP handshake, TLS and HTTP, packet by packet.', 'Eine geführte 3D-Reise durch alles, was beim Laden einer Seite passiert: ARP, DNS-Auflösung, TCP-Handshake, TLS und HTTP, Paket für Paket.'), module: 'http-tls',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      <path d="M40 130 Q 90 100 120 120 T 200 110 T 285 120" stroke="#2c3a6a" stroke-width="2" fill="none"/>
      <path d="M120 120 Q 150 60 180 40 M180 40 L 230 45 L 270 60" stroke="#2c3a6a" stroke-width="2" fill="none"/>
      <path d="M40 130 Q 90 100 120 120 T 200 110 T 285 120" stroke="#5cf2c2" stroke-width="2.5" fill="none" stroke-dasharray="8 200"><animate attributeName="stroke-dashoffset" from="0" to="-260" dur="2.4s" repeatCount="indefinite"/></path>
      <rect x="24" y="118" width="32" height="20" rx="3" fill="#161d36" stroke="#5cf2c2"/><rect x="270" y="104" width="30" height="30" rx="3" fill="#161d36" stroke="#ff7a45"/>
      ${[[120, 120, '#8b7bff'], [180, 40, '#ffd166'], [230, 45, '#ffd166'], [270, 60, '#ffd166'], [200, 110, '#4cc9ff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="#161d36" stroke="${c}" stroke-width="2"/>`).join('')}
      <text x="274" y="96" font-size="14">🔒</text></svg>` },
  { id: 'builder', title: tr('Network Builder', 'Netzwerk-Baukasten'), tag: tr('Design · 3D', 'Bauen · 3D'), color: 'var(--mint)', blurb: tr('Place switches and routers, run cables and solve five missions — from a first LAN to a redundant office with a DMZ. Subnets light up as you build.', 'Setz Switches und Router, zieh Kabel und löse fünf Missionen – vom ersten LAN bis zum ausfallsicheren Büro mit DMZ. Subnetze leuchten beim Bauen auf.'), module: 'switching',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      ${Array.from({ length: 40 }, (_, i) => `<rect x="${20 + (i % 10) * 28}" y="${30 + Math.floor(i / 10) * 30}" width="24" height="24" rx="3" fill="${[0, 1, 10, 11, 20, 21].includes(i) ? '#5cf2c233' : [8, 9, 18, 19].includes(i) ? '#ff7a4533' : '#141b33'}"/>`).join('')}
      <path d="M32 42 L88 72 M32 102 L88 72 M88 72 L172 72 M172 72 L260 72" stroke="#5cf2c2" stroke-width="2.5" fill="none"/>
      <rect x="78" y="66" width="22" height="12" rx="2" fill="#1a2240" stroke="#5cf2c2"/><circle cx="172" cy="72" r="9" fill="#1a2240" stroke="#8b7bff" stroke-width="2"/>
      <circle cx="262" cy="70" r="14" fill="none" stroke="#4cc9ff" stroke-dasharray="3 3"/><text x="252" y="75" font-size="12">☁</text>
      <circle r="4" fill="#fff"><animateMotion dur="2.2s" repeatCount="indefinite" path="M32 42 L88 72 L172 72 L260 72"/></circle></svg>` },
  { id: 'blocks', title: tr('Subnet Blocks', 'Subnetz-Blöcke'), tag: 'Subnetting', color: 'var(--orange)', blurb: tr('A /24 as a 3D board of 256 addresses. Pick the right prefix for every team and fit aligned blocks together without wasting space.', 'Ein /24 als 3D-Brett mit 256 Adressen. Wähle für jedes Team das passende Präfix und setze ausgerichtete Blöcke platzsparend zusammen.'), module: 'subnetting',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      <g transform="translate(96 22)">${Array.from({ length: 64 }, (_, i) => `<rect x="${(i % 8) * 16}" y="${Math.floor(i / 8) * 17}" width="14" height="15" rx="2" fill="#141b33"/>`).join('')}
      <rect x="0" y="0" width="126" height="66" rx="3" fill="#5cf2c2" opacity=".75"/><rect x="0" y="68" width="62" height="32" rx="3" fill="#8b7bff" opacity=".8"/><rect x="64" y="68" width="30" height="15" rx="3" fill="#ff7a45" opacity=".85"/>
      <rect x="64" y="102" width="30" height="15" rx="3" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="3 2"><animate attributeName="y" values="102;85;102" dur="1.6s" repeatCount="indefinite"/></rect></g>
      <text x="20" y="40" fill="#7c86a2" font-family="monospace" font-size="11">/25</text><text x="20" y="100" fill="#7c86a2" font-family="monospace" font-size="11">/26</text><text x="20" y="120" fill="#7c86a2" font-family="monospace" font-size="11">/28</text></svg>` },
  { id: 'dnsdet', title: tr('DNS Detective', 'DNS-Detektiv'), tag: tr('Troubleshooting', 'Fehlersuche'), color: 'var(--yellow)', blurb: tr('Seven real-world DNS outages. Inspect caches, zone files and registry data, accuse the guilty server and pick the fix.', 'Sieben echte DNS-Störungen. Untersuche Caches, Zonendateien und Registry-Daten, überführe den schuldigen Server und wähle die Lösung.'), module: 'dns',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      ${[[50, 120, '#5cf2c2'], [120, 90, '#ffd166'], [190, 40, '#ffd166'], [250, 70, '#ffd166'], [260, 130, '#ff7a45']].map(([x, y, c]) => `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" rx="4" fill="#161d36" stroke="${c}" stroke-width="2"/>`).join('')}
      <path d="M50 120 L120 90 L190 40 M120 90 L250 70 M120 90 L260 130" stroke="#2c3a6a" stroke-width="2" stroke-dasharray="4 3" fill="none"/>
      <g><circle cx="230" cy="110" r="22" fill="none" stroke="#e9edf7" stroke-width="4"/><line x1="246" y1="126" x2="268" y2="150" stroke="#e9edf7" stroke-width="6" stroke-linecap="round"/><animateTransform attributeName="transform" type="translate" values="0 0;-110 -20;-40 -70;0 0" dur="5s" repeatCount="indefinite"/></g></svg>` },
  { id: 'runner', title: 'Packet Runner', tag: 'Routing', color: 'var(--mint)', blurb: tr('You are an IP packet. Read routing tables, apply longest-prefix match, and reach your destination before TTL hits zero.', 'Du bist ein IP-Paket. Lies Routingtabellen, wende Longest-Prefix-Match an und erreiche dein Ziel, bevor die TTL null wird.'), module: 'routing',
    art: `<svg viewBox="0 0 320 180"><defs><radialGradient id="ga" cx="50%" cy="50%"><stop offset="0" stop-color="#1b2150"/><stop offset="1" stop-color="#05070f"/></radialGradient></defs><rect width="320" height="180" fill="url(#ga)"/>
      <g stroke="#3a4a80" stroke-width="1.5"><line x1="40" y1="90" x2="110" y2="50"/><line x1="40" y1="90" x2="110" y2="130"/><line x1="110" y1="50" x2="190" y2="70"/><line x1="110" y1="130" x2="190" y2="70"/><line x1="110" y1="130" x2="190" y2="140"/><line x1="190" y1="70" x2="270" y2="95"/><line x1="190" y1="140" x2="270" y2="95"/></g>
      <path d="M40 90 L110 130 L190 70 L270 95" stroke="#5cf2c2" stroke-width="3" fill="none" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" from="22" to="0" dur="1s" repeatCount="indefinite"/></path>
      ${[[40, 90], [110, 50], [110, 130], [190, 70], [190, 140]].map(([x, y]) => `<g><ellipse cx="${x}" cy="${y}" rx="14" ry="6" fill="#1a2240" stroke="#8b7bff" stroke-width="2"/></g>`).join('')}
      <ellipse cx="270" cy="95" rx="14" ry="6" fill="#1a2240" stroke="#ff7a45" stroke-width="2"/><rect x="262" y="62" width="16" height="12" rx="2" fill="#ff7a45" opacity=".8"/>
      <rect x="183" y="56" width="14" height="14" fill="#5cf2c2" transform="rotate(20 190 63)"><animateTransform attributeName="transform" type="rotate" from="0 190 63" to="360 190 63" dur="4s" repeatCount="indefinite"/></rect></svg>` },
  { id: 'tower', title: 'Encapsulation Elevator', tag: tr('Layers', 'Schichten'), color: 'var(--violet)', blurb: tr('Ride a message down the sender’s stack adding headers, fire it across the wire as bits, then unwrap it layer by layer.', 'Fahre eine Nachricht durch den Stack des Senders, füge Header hinzu, schick sie als Bits über die Leitung und packe sie Schicht für Schicht wieder aus.'), module: 'layers',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      ${['#ff5c9a', '#5cf2c2', '#4cc9ff', '#8b7bff'].map((c, i) => `<rect x="40" y="${30 + i * 30}" width="70" height="24" rx="4" fill="none" stroke="${c}" stroke-width="2" opacity=".8"/><rect x="210" y="${30 + i * 30}" width="70" height="24" rx="4" fill="none" stroke="${c}" stroke-width="2" opacity=".8"/>`).join('')}
      <path d="M75 152 C 140 175, 180 130, 245 152" stroke="#ffd166" stroke-width="3" fill="none"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${100 + i * 15}" y="${150 + Math.sin(i) * 6}" width="5" height="5" fill="${i % 2 ? '#5cf2c2' : '#ffd166'}"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="${i * 0.12}s" repeatCount="indefinite"/></rect>`).join('')}
      <g transform="translate(75 92)"><rect x="-16" y="-16" width="32" height="32" fill="#4cc9ff" opacity=".2" stroke="#4cc9ff"/><rect x="-11" y="-11" width="22" height="22" fill="#5cf2c2" opacity=".25" stroke="#5cf2c2"/><rect x="-6" y="-6" width="12" height="12" fill="#fff"/></g></svg>` },
  { id: 'defender', title: 'Firewall Defender', tag: tr('Security', 'Sicherheit'), color: 'var(--orange)', blurb: tr('Packets swarm toward your data center. Read protocol, port and source — zap what the policy forbids, let the rest through.', 'Pakete strömen auf dein Rechenzentrum zu. Lies Protokoll, Port und Quelle – blocke, was die Regeln verbieten, und lass den Rest durch.'), module: 'nat-firewalls',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/><circle cx="160" cy="95" r="44" fill="none" stroke="#5cf2c2" stroke-dasharray="3 5" opacity=".6"><animateTransform attributeName="transform" type="rotate" from="0 160 95" to="360 160 95" dur="20s" repeatCount="indefinite"/></circle>
      ${[0, 1, 2, 3].map((i) => `<rect x="142" y="${74 + i * 11}" width="36" height="8" rx="1" fill="#161d36" stroke="#8b7bff"/>`).join('')}
      ${[[30, 30, '#4cc9ff'], [280, 40, '#ffd166'], [40, 160, '#4cc9ff'], [290, 150, '#ff5470'], [160, 10, '#4cc9ff']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="10" height="10" fill="${c}"><animate attributeName="x" from="${x}" to="155" dur="${2.5 + i * 0.4}s" repeatCount="indefinite"/><animate attributeName="y" from="${y}" to="90" dur="${2.5 + i * 0.4}s" repeatCount="indefinite"/></rect>`).join('')}
      <circle cx="270" cy="60" r="16" fill="none" stroke="#ff7a45" stroke-width="2"><animate attributeName="r" values="4;22" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="indefinite"/></circle></svg>` },
];

/* ======================================================================
   HOME
   ====================================================================== */
export async function home(app) {
  const st = store.get();
  const done = Object.keys(st.done).length;
  const next = MODULES.find((m) => !store.isDone(m.id)) || MODULES[0];
  app.innerHTML = `
  <section class="hero">
    <canvas class="hero-3d" aria-label="${tr('Interactive 3D globe of routers exchanging packets', 'Interaktiver 3D-Globus mit Routern, die Pakete austauschen')}"></canvas>
    <div class="hero-packet-log" id="hero-log"></div>
    <div class="wrap hero-inner">
      <div class="eyebrow">${tr('Interactive networking course', 'Interaktiver Netzwerk-Kurs')}</div>
      <h1>${tr('See the <span class="grad">Internet</span> from the inside.', 'Sieh das <span class="grad">Internet</span> von innen.')}</h1>
      <p class="lead">${tr('PacketCraft teaches computer networking by letting you touch it: flip bits, cut cables, poison a cache, route packets in 3D. Start with the basics, then dive as deep as you like.', 'PacketCraft bringt dir Netzwerktechnik bei, indem du sie anfasst: Bits umschalten, Kabel kappen, Caches vergiften, Pakete in 3D routen. Starte mit den Grundlagen und tauche so tief ein, wie du willst.')}</p>
      <div class="btn-row">
        <a class="btn" href="#/learn/${next.id}">${done ? tr('Continue', 'Weiter') : tr('Start learning', 'Jetzt lernen')} — ${esc(next.title)} →</a>
        <a class="btn ghost" href="#/play">🎮 ${tr('Play the 3D games', '3D-Spiele spielen')}</a>
      </div>
      <div class="hero-stats">
        <div><b>${MODULES.length}</b>${tr('modules', 'Lektionen')}</div>
        <div><b>${Object.keys(WIDGETS).length}</b>${tr('interactive labs', 'interaktive Labs')}</div>
        <div><b>${GAMES.length}</b>${tr('3D experiences', '3D-Erlebnisse')}</div>
        <div><b>${done}/${MODULES.length}</b>${tr('completed', 'abgeschlossen')}</div>
      </div>
    </div>
    <div class="hero-hint">⟲ ${tr('drag the globe', 'Globus drehen')}</div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="marquee-track">${Array(2).fill(['TCP handshake', 'Longest prefix match', 'ARP', 'Subnetting', 'DNS recursion', 'TLS 1.3', 'Dijkstra', 'NAT', 'Congestion control', 'BGP', 'QUIC', 'VLANs', 'IPv6'].map((x) => `<span>${x}</span>`).join('')).join('')}</div></div>

  <section class="section"><div class="wrap">
    <div class="eyebrow">${tr('How it works', 'So funktioniert es')}</div>
    <h2>${tr('Three ways in. Pick your depth.', 'Drei Wege hinein. Du bestimmst die Tiefe.')}</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:32px">
      <div class="card hover"><div class="tag mint">${tr('Learn', 'Lernen')}</div><h3 style="margin-top:14px">${tr('Plain-language lessons', 'Lektionen in klarer Sprache')}</h3><p>${tr('Every concept starts with an analogy and a picture, then a live lab you can break. No prior knowledge needed.', 'Jedes Konzept beginnt mit einer Analogie und einem Bild, dann folgt ein Live-Lab zum Ausprobieren. Kein Vorwissen nötig.')}</p></div>
      <div class="card hover"><div class="tag violet">${tr('Go deep', 'Tiefer gehen')}</div><h3 style="margin-top:14px">${tr('Optional deep dives', 'Optionale Vertiefungen')}</h3><p>${tr('Purple panels open into byte layouts, algorithms, RFC‑level detail, BGP politics and modern protocols like QUIC.', 'Lila Boxen führen zu Byte-Layouts, Algorithmen, RFC-Details, BGP-Politik und modernen Protokollen wie QUIC.')}</p></div>
      <div class="card hover"><div class="tag orange">${tr('Play', 'Spielen')}</div><h3 style="margin-top:14px">${tr('3D games that test you', '3D-Spiele, die dich prüfen')}</h3><p>${tr('Become a packet, defend a data center, ride the protocol stack. Earn XP for everything you master.', 'Werde zum Paket, verteidige ein Rechenzentrum, fahr durch den Protokollstapel. Sammle XP für alles, was du meisterst.')}</p></div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap"><div><div class="eyebrow">${tr('The path', 'Der Lernpfad')}</div><h2 style="margin:0">${tr('From “what is a network” to TLS', 'Von „Was ist ein Netzwerk?“ bis TLS')}</h2></div><a class="btn ghost" href="#/learn">${tr('See all modules →', 'Alle Lektionen →')}</a></div>
    ${pathHTML(true)}
  </div></section>

  <section class="section" style="background:linear-gradient(180deg,transparent,rgba(139,123,255,0.06),transparent)"><div class="wrap split">
    <div class="game-tile">${GAMES.find((g) => g.id === 'runner').art}<div class="play-overlay"><a class="btn" href="#/play/runner">▶ ${tr('Play Packet Runner', 'Packet Runner spielen')}</a></div></div>
    <div>
      <div class="eyebrow">${tr('Playable 3D', 'Spielbares 3D')}</div>
      <h2>${tr('Be the packet.', 'Sei das Paket.')}</h2>
      <p class="lead">${tr('In <b>Packet Runner</b> you fly through a 3D network of routers. Each one shows its routing table — pick the right interface before your TTL runs out.', 'In <b>Packet Runner</b> fliegst du durch ein 3D-Netz aus Routern. Jeder zeigt seine Routingtabelle – wähle das richtige Interface, bevor deine TTL abläuft.')}</p>
      <ul class="feature-list"><li>${tr('Longest-prefix match under time pressure', 'Longest-Prefix-Match unter Zeitdruck')}</li><li>${tr('Default routes, covering /8s and sneaky look-alike /24s', 'Default-Routen, überdeckende /8 und tückisch ähnliche /24')}</li><li>${tr('Five levels, growing networks, a personal best to beat', 'Fünf Level, wachsende Netze, ein Rekord zum Knacken')}</li></ul>
      <div class="btn-row"><a class="btn ghost" href="#/play/tower">Encapsulation Elevator</a><a class="btn ghost" href="#/play/defender">Firewall Defender</a></div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap split">
    <div>
      <div class="eyebrow">${tr('New · 3D story', 'Neu · 3D-Story')}</div>
      <h2>${tr('Follow one click across the Internet.', 'Folge einem Klick durchs Internet.')}</h2>
      <p class="lead">${tr('<b>Journey of a Click</b> slows a page load down to human speed. Watch ARP, NAT, a DNS resolver walking the root→TLD→authoritative chain, the TCP handshake, TLS key exchange and HTTP, all as packets flying through a 3D network.', '<b>Reise eines Klicks</b> verlangsamt einen Seitenaufruf auf Menschentempo. Sieh ARP, NAT, einen DNS-Resolver auf dem Weg Root→TLD→autoritativ, den TCP-Handshake, den TLS-Schlüsseltausch und HTTP – alles als Pakete in einem 3D-Netz.')}</p>
      <div class="btn-row"><a class="btn" href="#/play/journey">▶ ${tr('Start the journey', 'Reise starten')}</a><a class="btn ghost" href="#/learn/troubleshooting">⌨️ ${tr('Open the terminal', 'Terminal öffnen')}</a></div>
    </div>
    <a class="game-tile" href="#/play/journey" aria-label="${tr('Journey of a Click', 'Reise eines Klicks')}">${GAMES.find((g) => g.id === 'journey').art}</a>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="eyebrow">${tr('Try it right now', 'Gleich ausprobieren')}</div>
    <h2>${tr('Every lesson has a lab like this one.', 'Jede Lektion hat ein Lab wie dieses.')}</h2>
    <p class="lead">${tr('Pick a topology, then click links to cut them. Watch which machines can still hear the broadcast.', 'Wähle eine Topologie und klicke Verbindungen an, um sie zu kappen. Sieh, welche Geräte den Broadcast noch hören.')}</p>
    <div data-widget="topology"></div>
  </div></section>
  ${footer()}`;
  mountWidgets(app);
  bindFooter(app);
  if (webglOK()) {
    const { mountHero } = await import('./three/hero.js');
    mountHero($('.hero-3d', app), $('#hero-log', app));
  }
}

function pathHTML(compact = false) {
  return LEVELS.map((lv) => {
    const mods = MODULES.filter((m) => m.level === lv.id);
    return `<div class="level-band"><h3>${lv.name}</h3><span class="line"></span><span class="mono" style="color:var(--muted);font-size:.8rem">${mods.filter((m) => store.isDone(m.id)).length}/${mods.length}</span></div>
      ${compact ? '' : `<p style="margin-top:-6px">${lv.blurb}</p>`}
      <div class="path-grid">${mods.map((m) => {
        const i = MODULES.indexOf(m) + 1;
        const d = store.isDone(m.id);
        return `<a class="card hover module-card ${d ? 'done' : ''}" href="#/learn/${m.id}" style="--mc:${m.color}">
          <span class="num">${String(i).padStart(2, '0')}</span>
          ${d ? `<span class="check-badge" title="${tr('Completed', 'Abgeschlossen')}">✓</span>` : ''}
          <span class="ico" style="box-shadow:inset 0 0 0 1px ${m.color}33">${m.icon}</span>
          <h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p>
          <div class="meta"><span class="tag">${m.minutes} min</span><span class="tag" style="color:${m.color};border-color:${m.color}44">lab</span>${m.body.includes('deep-dive') ? `<span class="tag violet">${tr('deep dives', 'Vertiefungen')}</span>` : ''}</div></a>`;
      }).join('')}</div>`;
  }).join('');
}

/* ======================================================================
   LEARN INDEX
   ====================================================================== */
export function learn(app) {
  const { lvl, into, need } = levelInfo();
  const done = Object.keys(store.get().done).length;
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">${tr('Course', 'Kurs')}</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('The learning path', 'Der Lernpfad')}</h1>
    <p class="lead">${tr(`${MODULES.length} modules in ${LEVELS.length} tracks. Do them in order, or jump to whatever you're curious about — every lesson stands on its own.`, `${MODULES.length} Lektionen in ${LEVELS.length} Spuren. Mach sie der Reihe nach oder spring zu dem, was dich interessiert – jede Lektion steht für sich.`)}</p>
    <div class="card" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap;margin:28px 0 8px">
      <div><small class="mono" style="color:var(--muted)">LEVEL</small><div style="font:800 2.4rem var(--font-display)">${lvl}</div></div>
      <div style="flex:1;min-width:220px"><div style="display:flex;justify-content:space-between" class="mono"><small style="color:var(--muted)">${into}/${need} ${tr(`XP to level ${lvl + 1}`, `XP bis Level ${lvl + 1}`)}</small><small style="color:var(--muted)">${done}/${MODULES.length} ${tr('modules', 'Lektionen')}</small></div>
        <div class="progress-bar" style="margin-top:8px"><div style="width:${(into / need) * 100}%"></div></div>
        <div class="progress-bar" style="margin-top:8px"><div style="width:${(done / MODULES.length) * 100}%;background:linear-gradient(90deg,var(--orange),var(--pink))"></div></div></div>
      <a class="btn ghost" href="#/review">🗂 ${tr('Flashcards', 'Karteikarten')}</a><a class="btn" href="#/challenge">⚡ ${tr('Take the challenge', 'Zur Challenge')}</a>
    </div>
    ${pathHTML()}
  </div>${footer()}`;
  bindFooter(app);
}

/* ======================================================================
   MODULE
   ====================================================================== */
export function module(app, id) {
  const m = moduleById(id);
  if (!m) return notFound(app);
  const idx = MODULES.indexOf(m);
  const prev = MODULES[idx - 1], next = MODULES[idx + 1];
  const lvl = LEVELS.find((l) => l.id === m.level);
  app.innerHTML = `<div class="page-enter">
    <div class="module-hero" style="background:radial-gradient(800px 300px at 20% 0%, ${m.color}18, transparent 70%)"><div class="wrap">
      <div class="crumbs"><a href="#/learn">${tr('Learn', 'Lernen')}</a><span>/</span><span>${lvl.name}</span><span>/</span><span style="color:var(--text)">${tr('Module', 'Lektion')} ${idx + 1}</span></div>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><span style="font-size:3rem">${m.icon}</span><div><h1 style="font-size:clamp(2rem,4.5vw,3.4rem);margin:0">${esc(m.title)}</h1><p class="lead" style="margin:8px 0 0">${esc(m.summary)}</p></div></div>
      <div class="btn-row" style="margin-top:20px"><span class="tag">${m.minutes} min</span><span class="tag mint">${(m.body.match(/data-widget/g) || []).length} ${tr('interactive labs', 'interaktive Labs')}</span><span class="tag violet">${(m.body.match(/deep-dive/g) || []).length} ${tr('deep dives', 'Vertiefungen')}</span>${store.isDone(m.id) ? `<span class="tag mint">✓ ${tr('completed', 'abgeschlossen')}</span>` : ''}</div>
    </div></div>
    <div class="wrap module-layout">
      <aside class="toc" id="toc"></aside>
      <article class="prose module-content" id="content">${m.body}
        <section class="quiz" id="quiz"><h2 id="check">${tr('Check yourself', 'Teste dich')}</h2><p>${tr('Answer all three correctly to complete the module. Mistakes become flashcards automatically.', 'Beantworte alle drei richtig, um die Lektion abzuschließen. Fehler werden automatisch zu Karteikarten.')}</p><div id="quiz-body"></div></section>
        <div class="module-nav">
          ${prev ? `<a href="#/learn/${prev.id}"><div class="card hover"><small>← ${tr('Previous', 'Zurück')}</small><h3 style="margin:6px 0 0">${prev.icon} ${esc(prev.title)}</h3></div></a>` : '<span></span>'}
          ${next ? `<a href="#/learn/${next.id}" class="next"><div class="card hover"><small>${tr('Next', 'Weiter')} →</small><h3 style="margin:6px 0 0">${next.icon} ${esc(next.title)}</h3></div></a>` : `<a href="#/challenge" class="next"><div class="card hover"><small>Finale →</small><h3 style="margin:6px 0 0">⚡ ${tr('The Challenge', 'Die Challenge')}</h3></div></a>`}
        </div>
      </article>
    </div>${footer()}</div>`;
  bindFooter(app);
  const content = $('#content', app);
  // TOC
  const heads = $$('h2[id]', content);
  const dds = $$('details.deep-dive', content);
  dds.forEach((d, i) => (d.id = 'deep-' + i));
  $('#toc', app).innerHTML = `<h4>${tr('On this page', 'Auf dieser Seite')}</h4>${heads.map((x) => `<a href="#/learn/${m.id}" data-to="${x.id}">${esc(x.textContent)}</a>`).join('')}${dds.length ? `<h4 style="margin-top:20px">${tr('Deep dives', 'Vertiefungen')}</h4>${dds.map((d) => `<a class="deep" href="#/learn/${m.id}" data-to="${d.id}">${esc(d.querySelector('.dd-title').textContent)}</a>`).join('')}` : ''}`;
  $$('#toc a', app).forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.getElementById(a.dataset.to);
    if (t.tagName === 'DETAILS') t.open = true;
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  dds.forEach((d, i) => d.addEventListener('toggle', () => { if (d.open) store.award(`deep-${m.id}-${i}`, 5, tr('Deep dive opened', 'Vertiefung geöffnet')); }));
  mountWidgets(content);
  renderQuiz($('#quiz-body', app), m);
}

function renderQuiz(root, m) {
  const answered = new Array(m.quiz.length).fill(null);
  root.innerHTML = m.quiz.map((q, qi) => `<div class="quiz-q" data-q="${qi}"><div class="q">${qi + 1}. ${esc(q.q)}</div><div class="quiz-opts">${shuffle(q.a.map((a, ai) => `<button class="quiz-opt" data-a="${ai}">${esc(a)}</button>`)).join('')}</div></div>`).join('') + '<div id="quiz-result"></div>';
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.quiz-opt'); if (!b) return;
    const qEl = b.closest('.quiz-q'); const qi = +qEl.dataset.q; const ai = +b.dataset.a;
    if (answered[qi] !== null) return;
    const q = m.quiz[qi];
    answered[qi] = ai === q.c;
    if (!answered[qi]) srs.flag(`q:${m.id}:${qi}`);
    $$('.quiz-opt', qEl).forEach((o) => { const i = +o.dataset.a; o.disabled = true; if (i === q.c) o.classList.add('right'); else if (i === ai) o.classList.add('wrong'); });
    qEl.insertAdjacentHTML('beforeend', `<div class="quiz-explain">${answered[qi] ? '✓ ' : '✗ '}${esc(q.why)}</div>`);
    if (answered.every((x) => x !== null)) {
      const ok = answered.filter(Boolean).length;
      const res = $('#quiz-result', root);
      if (ok === m.quiz.length) {
        const first = !store.isDone(m.id);
        store.markDone(m.id);
        store.award(`mod-${m.id}`, 30, `${tr('Module complete', 'Lektion abgeschlossen')}: ${m.title}`);
        res.innerHTML = `<div class="callout"><span class="ci">🏁</span><div><p><b>${tr('Module complete!', 'Lektion abgeschlossen!')}</b> ${first ? tr('It’s now marked done on your learning path.', 'Sie ist jetzt auf deinem Lernpfad abgehakt.') : ''} ${tr('Its questions and terms are now in your', 'Ihre Fragen und Begriffe sind jetzt in deinen')} <a href="#/review">${tr('flashcards', 'Karteikarten')}</a>.</p></div></div>`;
      } else {
        res.innerHTML = `<div class="callout warn"><span class="ci">↺</span><div><p>${ok}/${m.quiz.length} ${tr('correct. Review the explanations, then', 'richtig. Lies die Erklärungen und')} <a href="#" id="quiz-retry">${tr('try again', 'versuch es noch mal')}</a>.</p></div></div>`;
        $('#quiz-retry', res).onclick = (e) => { e.preventDefault(); renderQuiz(root, m); };
      }
    }
  }, { once: false });
}

/* ======================================================================
   PLAY
   ====================================================================== */
export function play(app) {
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">Arcade</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('Playable 3D', 'Spielbares 3D')}</h1>
    <p class="lead">${tr(`${GAMES.length - 1} games and a 3D story, each built around a real networking skill. Drag to orbit, pinch or scroll to zoom, number keys to answer.`, `${GAMES.length - 1} Spiele und eine 3D-Story, jedes Erlebnis trainiert eine echte Netzwerk-Fähigkeit. Ziehen zum Drehen, Pinch oder Mausrad zum Zoomen, Zahlentasten zum Antworten.`)}</p>
    ${webglOK() ? '' : `<div class="callout warn"><span class="ci">⚠</span><div><p>${tr('Your browser doesn’t seem to support WebGL, which the 3D games need.', 'Dein Browser scheint kein WebGL zu unterstützen, das die 3D-Spiele brauchen.')}</p></div></div>`}
    <div class="games-grid" style="margin-top:32px">${GAMES.map((g) => `<a class="card hover game-card" href="#/play/${g.id}">
      <div class="art">${g.art}</div>
      <div class="body"><div class="btn-row" style="justify-content:space-between"><span class="tag" style="color:${g.color};border-color:currentColor">${g.tag}</span>${store.best(g.id) ? `<span class="mono" style="font-size:.8rem;color:var(--muted)">${tr('best', 'Rekord')} <b style="color:var(--text)">${store.best(g.id)}</b></span>` : ''}</div>
      <h3 style="margin:12px 0 6px;font-size:1.5rem">${g.title}</h3><p style="margin:0">${g.blurb}</p></div></a>`).join('')}</div>
  </div>${footer()}`;
  bindFooter(app);
}

export async function game(app, id) {
  const g = GAMES.find((x) => x.id === id);
  if (!g) return notFound(app);
  document.body.style.overflow = 'hidden';
  onCleanup(() => (document.body.style.overflow = ''));
  app.innerHTML = `<div class="game-shell"><canvas class="g3d"></canvas><div class="hud-layer" style="position:absolute;inset:0;pointer-events:none;z-index:4"></div>
    <a href="#/play" class="btn small ghost game-back" aria-label="${tr('Back to arcade', 'Zurück zur Spieleübersicht')}">← Arcade</a>
    <button class="btn small ghost game-mute" aria-label="${tr('Sound on/off', 'Ton an/aus')}">${sfx.muted ? '🔇' : '🔊'}</button></div>`;
  const shell = $('.game-shell', app);
  $('.game-mute', shell).onclick = (e) => { e.currentTarget.textContent = sfx.toggle() ? '🔇' : '🔊'; sfx.play('click'); };
  if (!webglOK()) { shell.innerHTML = `<div class="overlay"><div class="panel"><h2>${tr('WebGL unavailable', 'WebGL nicht verfügbar')}</h2><p>${tr('This game needs WebGL. Try a recent Chrome, Firefox, Safari or Edge.', 'Dieses Spiel braucht WebGL. Probier einen aktuellen Chrome, Firefox, Safari oder Edge.')}</p><a class="btn" href="#/play">${tr('Back', 'Zurück')}</a></div></div>`; return; }
  const loaders = { runner: () => import('./three/runner.js').then((m) => m.mountRunner), tower: () => import('./three/tower.js').then((m) => m.mountTower), defender: () => import('./three/defender.js').then((m) => m.mountDefender), journey: () => import('./three/journey.js').then((m) => m.mountJourney), builder: () => import('./three/builder.js').then((m) => m.mountBuilder), blocks: () => import('./three/subnetblocks.js').then((m) => m.mountSubnetBlocks), dnsdet: () => import('./three/dnsdetective.js').then((m) => m.mountDnsDetective) };
  const mount = await loaders[id]();
  if (!document.body.contains(shell)) return; // navigated away while loading
  mount(shell);
}

/* ======================================================================
   LAB / TOOLKIT
   ====================================================================== */
export const TOOLS = [
  { id: 'terminal', name: 'Terminal', icon: '⌨️' },
  { id: 'subnet', name: tr('Subnet calculator', 'Subnetzrechner'), icon: '🧮' },
  { id: 'subnet-practice', name: tr('Subnet drills', 'Subnetz-Training'), icon: '🎯' },
  { id: 'bits', name: tr('Binary ↔ IP', 'Binär ↔ IP'), icon: '🔢' },
  { id: 'lpm', name: tr('Route lookup', 'Routensuche'), icon: '🧭' },
  { id: 'dijkstra', name: tr('Shortest paths', 'Kürzeste Wege'), icon: '🗺️' },
  { id: 'tcp', name: tr('TCP tracer', 'TCP-Tracer'), icon: '🤝' },
  { id: 'dns', name: tr('DNS resolver', 'DNS-Resolver'), icon: '📇' },
  { id: 'http', name: tr('HTTP client', 'HTTP-Client'), icon: '🌐' },
  { id: 'firewall', name: tr('Firewall rules', 'Firewall-Regeln'), icon: '🛡️' },
  { id: 'signal', name: tr('Line codes', 'Leitungscodes'), icon: '〰️' },
  { id: 'wifi', name: tr('Wi‑Fi planner', 'WLAN-Planer'), icon: '📶' },
  { id: 'loadbalancer', name: tr('Load balancer', 'Loadbalancer'), icon: '⚖️' },
  { id: 'ipv6', name: 'IPv6', icon: '6️⃣' },
  { id: 'vlan', name: 'VLAN / STP', icon: '🌳' },
  { id: 'vpn', name: 'VPN', icon: '🔐' },
  { id: 'email', name: tr('E-mail trace', 'E-Mail-Weg'), icon: '✉️' },
];
export function lab(app, tool) {
  const cur = TOOLS.find((t) => t.id === tool) || TOOLS[0];
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">${tr('Toolkit', 'Werkzeuge')}</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('The network toolkit', 'Der Netzwerk-Werkzeugkasten')}</h1>
    <p class="lead">${tr('Every lab from the course, standalone. Useful as a real calculator long after you finish.', 'Alle Labs aus dem Kurs einzeln. Auch nach dem Kurs als echter Rechner nützlich.')}</p>
    <div class="tool-tabs" style="margin-top:28px">${TOOLS.map((t) => `<a class="btn small ${t.id === cur.id ? '' : 'ghost'}" href="#/lab/${t.id}">${t.icon} ${t.name}</a>`).join('')}</div>
    <div data-widget="${cur.id}"></div>
  </div>${footer()}`;
  mountWidgets(app);
  bindFooter(app);
}

/* ======================================================================
   GLOSSARY
   ====================================================================== */
export function glossary(app) {
  const letters = [...new Set(GLOSSARY.map(([t]) => t[0].toUpperCase()))].sort();
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">${tr('Reference', 'Nachschlagen')}</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('Glossary', 'Glossar')}</h1>
    <p class="lead">${tr(`${GLOSSARY.length} terms, each linked to the lesson that explains it.`, `${GLOSSARY.length} Begriffe, jeweils mit der Lektion verlinkt, die sie erklärt.`)}</p>
    <div class="gloss-search"><input class="input" id="gq" placeholder="${tr('Search terms… (try “TTL” or “handshake”)', 'Begriffe suchen … (z. B. „TTL“ oder „Handshake“)')}" autocomplete="off"></div>
    <div class="gloss-letters">${letters.map((l) => `<button data-l="${l}">${l}</button>`).join('')}</div>
    <div class="gloss-grid" id="gg"></div>
  </div>${footer()}`;
  bindFooter(app);
  let letter = null;
  const render = () => {
    const q = $('#gq', app).value.trim().toLowerCase();
    const list = GLOSSARY.filter(([t, d]) => (!q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q)) && (!letter || t[0].toUpperCase() === letter));
    $('#gg', app).innerHTML = list.map(([t, d, mod]) => {
      const m = moduleById(mod);
      return `<div class="card gloss-item"><h3>${esc(t)}</h3><p>${esc(d)}</p>${m ? `<a href="#/learn/${m.id}" style="font-size:.82rem;display:inline-block;margin-top:10px">${m.icon} ${esc(m.title)} →</a>` : ''}</div>`;
    }).join('') || `<p>${tr('No matches.', 'Keine Treffer.')}</p>`;
  };
  $('#gq', app).addEventListener('input', render);
  $$('.gloss-letters button', app).forEach((b) => b.addEventListener('click', () => {
    letter = letter === b.dataset.l ? null : b.dataset.l;
    $$('.gloss-letters button', app).forEach((x) => x.classList.toggle('on', x.dataset.l === letter));
    render();
  }));
  render();
  $('#gq', app).focus({ preventScroll: true });
}

/* ======================================================================
   CHALLENGE — timed mixed quiz
   ====================================================================== */
function opts4(right, cands, fallback) {
  const out = [String(right)];
  for (const c of [...cands, ...fallback]) { const v = String(c); if (out.length < 4 && !out.includes(v)) out.push(v); }
  return shuffle(out);
}
function generatedQuestions() {
  const qs = [];
  const ports = [['HTTPS', 443], ['SSH', 22], ['DNS', 53], ['HTTP', 80], [tr('SMTP submission', 'SMTP-Einlieferung'), 587], ['RDP', 3389]];
  const [name, port] = pick(ports);
  qs.push({ q: tr(`Which port does ${name} use by default?`, `Welchen Port nutzt ${name} standardmäßig?`), a: opts4(port, shuffle(ports.filter((x) => x[1] !== port)).map((x) => x[1]), []), why: tr(`${name} listens on ${port}.`, `${name} lauscht auf Port ${port}.`), right: String(port) });
  const p = rand(20, 30);
  const s = subnetInfo(((rand(1, 223) << 24) | (rand(0, 255) << 16) | (rand(0, 255) << 8) | rand(0, 255)) >>> 0, p);
  qs.push({ q: tr(`How many usable hosts are in a /${p}?`, `Wie viele nutzbare Hosts hat ein /${p}?`), a: opts4(s.hosts, [s.total, s.hosts * 2 + 2, s.hosts / 2 - 1, s.hosts - 1], [s.hosts + 1, s.total * 2, 1]), why: `2^(32−${p}) − 2 = ${s.hosts}.`, right: String(s.hosts) });
  const ip = intToIp(s.network + rand(1, Math.max(1, s.hosts)));
  qs.push({ q: tr(`What is the network address of ${ip}/${p}?`, `Wie lautet die Netzadresse von ${ip}/${p}?`), a: opts4(intToIp(s.network), [intToIp((s.network + s.total) >>> 0), intToIp(s.broadcast), intToIp(Math.max(0, s.network - s.total))], [intToIp((s.network + 2 * s.total) >>> 0), intToIp(s.network + 1)]), why: tr(`AND the address with the /${p} mask → ${intToIp(s.network)}.`, `Adresse UND /${p}-Maske → ${intToIp(s.network)}.`), right: intToIp(s.network) });
  return qs;
}
export function challenge(app) {
  const bank = [
    ...MODULES.flatMap((m) => m.quiz.map((q, qi) => ({ q: q.q, a: q.a, right: q.a[q.c], why: q.why, mod: m, card: `q:${m.id}:${qi}` }))),
    ...generatedQuestions(), ...generatedQuestions(),
  ];
  const qs = shuffle(bank).slice(0, 12).map((q) => ({ ...q, a: shuffle(q.a) }));
  let i = 0, score = 0, correct = 0, timeLeft = 15, streak = 0, state = 'intro';
  const PER = 15;
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px;max-width:820px">
    <div class="eyebrow">⚡ Challenge</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('12 questions. 15 seconds each.', '12 Fragen. 15 Sekunden pro Frage.')}</h1>
    <p class="lead">${tr('Questions from every module plus freshly generated subnetting and port puzzles. Faster answers score more; streaks multiply.', 'Fragen aus allen Lektionen plus frisch erzeugte Subnetz- und Port-Rätsel. Schnelle Antworten bringen mehr Punkte, Serien multiplizieren.')}</p>
    <div class="card" id="ch" style="margin-top:28px;padding:clamp(20px,4vw,36px)"></div>
  </div>${footer()}`;
  bindFooter(app);
  const box = $('#ch', app);
  const best = store.best('challenge');
  box.innerHTML = `<div style="text-align:center"><div style="font-size:3rem">⚡</div><h2>${tr('Ready?', 'Bereit?')}</h2><p>${best ? `${tr('Your best score', 'Dein Rekord')}: <b style="color:var(--mint)">${best}</b>` : tr('Set your first high score.', 'Stell deinen ersten Rekord auf.')}</p><button class="btn" id="ch-go">${tr('Start the clock', 'Uhr starten')}</button></div>`;
  $('#ch-go', box).onclick = () => { state = 'q'; show(); };

  function show() {
    const q = qs[i];
    timeLeft = PER;
    box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px" class="mono"><small style="color:var(--muted)">${tr('QUESTION', 'FRAGE')} ${i + 1}/${qs.length}${q.mod ? ` · ${q.mod.icon} ${esc(q.mod.title)}` : ` · 🎲 ${tr('generated', 'generiert')}`}</small><small>${tr('score', 'Punkte')} <b style="color:var(--mint)">${score}</b>${streak > 1 ? ` · 🔥 ×${Math.min(streak, 4)}` : ''}</small></div>
      <div class="progress-bar timer-bar" style="margin-bottom:22px"><div id="ch-t" style="width:100%"></div></div>
      <div class="challenge-q">${esc(q.q)}</div>
      <div class="quiz-opts">${q.a.map((a) => `<button class="quiz-opt" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div><div id="ch-x"></div>`;
    $$('.quiz-opt', box).forEach((b) => (b.onclick = () => answer(b.dataset.a)));
    state = 'q';
  }
  function answer(a) {
    if (state !== 'q') return;
    state = 'a';
    const q = qs[i];
    const ok = a === String(q.right);
    if (ok) { streak++; correct++; score += Math.round((50 + timeLeft * 10) * Math.min(streak, 4)); } else { streak = 0; if (q.card) srs.flag(q.card); }
    $$('.quiz-opt', box).forEach((b) => { b.disabled = true; if (b.dataset.a === String(q.right)) b.classList.add('right'); else if (b.dataset.a === a) b.classList.add('wrong'); });
    $('#ch-x', box).innerHTML = `<div class="quiz-explain">${a === null ? tr('⏱ Time’s up. ', '⏱ Zeit abgelaufen. ') : ok ? '✓ ' : '✗ '}${esc(q.why)}</div><div class="btn-row" style="margin-top:16px"><button class="btn small" id="ch-n">${i < qs.length - 1 ? tr('Next →', 'Weiter →') : tr('See results', 'Ergebnis ansehen')}</button></div>`;
    $('#ch-n', box).onclick = () => { i++; i < qs.length ? show() : finish(); };
  }
  function finish() {
    state = 'done';
    const isBest = store.setBest('challenge', score);
    store.award('challenge-done', 20, tr('Challenge complete', 'Challenge geschafft'));
    if (correct >= 10) store.award('challenge-10', 40, tr('Network wizard (10+ correct)', 'Netzwerk-Magier (10+ richtig)'));
    const rank = correct >= 11 ? ['🧙', tr('Network wizard', 'Netzwerk-Magier')] : correct >= 8 ? ['🛰', tr('Backbone engineer', 'Backbone-Ingenieur')] : correct >= 5 ? ['📡', tr('Router apprentice', 'Router-Azubi')] : ['🔌', tr('Packet in training', 'Paket in Ausbildung')];
    box.innerHTML = `<div style="text-align:center"><div style="font-size:3.4rem">${rank[0]}</div><h2>${rank[1]}</h2><div class="big-score">${score}</div><p>${correct}/${qs.length} ${tr('correct', 'richtig')}${isBest ? tr(' · 🏆 new best!', ' · 🏆 neuer Rekord!') : ` · ${tr('best', 'Rekord')} ${store.best('challenge')}`}</p><p style="font-size:.9rem">${correct < qs.length ? tr('Missed questions were added to your <a href="#/review">flashcards</a>.', 'Falsche Antworten sind jetzt in deinen <a href="#/review">Karteikarten</a>.') : ''}</p><div class="btn-row" style="justify-content:center"><button class="btn" id="ch-again">${tr('Try again', 'Noch mal')}</button><a class="btn ghost" href="#/learn">${tr('Back to lessons', 'Zurück zu den Lektionen')}</a></div></div>`;
    $('#ch-again', box).onclick = () => challenge(app);
  }
  loop((dt) => {
    if (state !== 'q') return;
    timeLeft -= dt;
    const bar = $('#ch-t', box);
    if (bar) bar.style.width = Math.max(0, (timeLeft / PER) * 100) + '%';
    if (timeLeft <= 0) answer(null);
  });
}

export function notFound(app) {
  app.innerHTML = `<div class="wrap" style="padding:120px 0;text-align:center"><div style="font:800 6rem var(--font-display);color:var(--orange)">404</div><h2>${tr('Destination host unreachable', 'Zielhost nicht erreichbar')}</h2><p>${tr('ICMP type 3 — this route doesn’t exist.', 'ICMP Typ 3 – diese Route gibt es nicht.')}</p><a class="btn" href="#/">${tr('Back to the default route', 'Zurück zur Default-Route')}</a></div>`;
}

/* ======================================================================
   PROFILE & ACHIEVEMENTS
   ====================================================================== */
const has = (id) => !!store.get().awarded[id];
const countPrefix = (p) => Object.keys(store.get().awarded).filter((k) => k.startsWith(p)).length;
const trackDone = (lv) => MODULES.filter((m) => m.level === lv).every((m) => store.isDone(m.id));
export const BADGES = [
  { icon: '🌱', name: tr('First steps', 'Erste Schritte'), desc: tr('Complete any module', 'Schließe eine Lektion ab'), test: () => Object.keys(store.get().done).length >= 1 },
  { icon: '🧱', name: tr('Solid foundations', 'Solides Fundament'), desc: tr('Complete every Foundations module', 'Alle Grundlagen-Lektionen'), test: () => trackDone('foundations') },
  { icon: '⚙️', name: tr('Core engineer', 'Kern-Ingenieur'), desc: tr('Complete every Core module', 'Alle Kernmechanik-Lektionen'), test: () => trackDone('core') },
  { icon: '🌍', name: 'Netizen', desc: tr('Complete the Internet track', 'Die Internet-Spur abschließen'), test: () => trackDone('apps') },
  { icon: '🩺', name: tr('Pro', 'Profi'), desc: tr('Complete the Pro track', 'Die Profi-Spur abschließen'), test: () => trackDone('pro') },
  { icon: '🎓', name: tr('Graduate', 'Absolvent'), desc: tr('Complete all modules', 'Alle Lektionen abschließen'), test: () => MODULES.every((m) => store.isDone(m.id)) },
  { icon: '🤿', name: tr('Deep diver', 'Tiefentaucher'), desc: tr('Open 10 deep dives', '10 Vertiefungen öffnen'), test: () => countPrefix('deep-') >= 10 },
  { icon: '🗂', name: tr('Card collector', 'Kartensammler'), desc: tr('Learn 100 flashcards (box 3+)', '100 Karteikarten gelernt (Fach 3+)'), test: () => srs.learnedCount() >= 100 },
  { icon: '📅', name: tr('Habit', 'Gewohnheit'), desc: tr('Review 7 days in a row', '7 Tage am Stück wiederholen'), test: () => store.get().streak.days >= 7 },
  { icon: '🧮', name: tr('Subnet slayer', 'Subnetz-Bezwinger'), desc: tr('Reach a 5-streak in subnet drills', '5er-Serie im Subnetz-Training'), test: () => has('subnet-win-5') },
  { icon: '🧭', name: 'Packet Runner', desc: tr('Clear all 5 routing levels', 'Alle 5 Routing-Level schaffen'), test: () => has('runner-win') },
  { icon: '🧅', name: tr('Stack master', 'Stack-Meister'), desc: tr('Finish Encapsulation Elevator', 'Encapsulation Elevator beenden'), test: () => has('tower-win') },
  { icon: '🛡️', name: tr('Gatekeeper', 'Torwächter'), desc: tr('Win Firewall Defender', 'Firewall Defender gewinnen'), test: () => has('defender-win') },
  { icon: '🎬', name: tr('Tourist', 'Tourist'), desc: tr('Finish Journey of a Click', 'Die Reise eines Klicks beenden'), test: () => has('journey-done') },
  { icon: '⌨️', name: tr('Terminal master', 'Terminal-Meister'), desc: tr('Finish every terminal mission', 'Alle Terminal-Missionen'), test: () => has('term-all') },
  { icon: '🔥', name: tr('Firewall architect', 'Firewall-Architekt'), desc: tr('Solve the firewall puzzle with ≤ 4 rules', 'Firewall-Rätsel mit ≤ 4 Regeln lösen'), test: () => has('fw-lean') },
  { icon: '⚖️', name: tr('Traffic cop', 'Verkehrspolizist'), desc: tr('Tame a slow server with least-connections', 'Langsamen Server mit Least-Connections bändigen'), test: () => has('lb-lc') },
  { icon: '🏗', name: tr('Network architect', 'Netzwerk-Architekt'), desc: tr('Finish all Network Builder missions', 'Alle Baukasten-Missionen schaffen'), test: () => has('builder-win') },
  { icon: '🧱', name: tr('Address architect', 'Adress-Architekt'), desc: tr('Finish Subnet Blocks', 'Subnetz-Blöcke durchspielen'), test: () => has('blocks-win') },
  { icon: '🕵', name: tr('DNS detective', 'DNS-Detektiv'), desc: tr('Solve every DNS case', 'Alle DNS-Fälle lösen'), test: () => has('dnsdet-win') },
  { icon: '🧙', name: tr('Network wizard', 'Netzwerk-Magier'), desc: tr('10+ correct in the Challenge', '10+ richtig in der Challenge'), test: () => has('challenge-10') },
  { icon: '🌐', name: tr('Status collector', 'Statuscode-Sammler'), desc: tr('Find all 9 HTTP status codes', 'Alle 9 HTTP-Statuscodes finden'), test: () => has('http-9') },
];

export function profile(app) {
  const st = store.get();
  const { lvl, into, need } = levelInfo();
  const got = BADGES.filter((b) => b.test()).length;
  const done = Object.keys(st.done).length;
  const allDone = done >= MODULES.length;
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">${tr('Profile', 'Profil')}</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('Your progress', 'Dein Fortschritt')}</h1>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:28px 0">
      <div class="card"><small class="mono" style="color:var(--muted)">LEVEL</small><div class="big-score" style="margin:6px 0 10px">${lvl}</div><div class="progress-bar"><div style="width:${(into / need) * 100}%"></div></div><small class="mono" style="color:var(--muted)">${into}/${need} ${tr('XP to next', 'XP bis zum nächsten')}</small></div>
      <div class="card"><small class="mono" style="color:var(--muted)">${tr('TOTAL XP', 'XP GESAMT')}</small><div class="big-score" style="margin:6px 0 10px;color:var(--violet)">${st.xp}</div><small class="mono" style="color:var(--muted)">${Object.keys(st.awarded).length} ${tr('achievements earned', 'Erfolge verdient')}</small></div>
      <div class="card"><small class="mono" style="color:var(--muted)">${tr('MODULES', 'LEKTIONEN')}</small><div class="big-score" style="margin:6px 0 10px;color:var(--orange)">${done}/${MODULES.length}</div><div class="progress-bar"><div style="width:${(done / MODULES.length) * 100}%;background:linear-gradient(90deg,var(--orange),var(--pink))"></div></div></div>
      <div class="card"><small class="mono" style="color:var(--muted)">${tr('FLASHCARD STREAK', 'KARTEIKARTEN-SERIE')}</small><div class="big-score" style="margin:6px 0 10px;color:var(--yellow)">${st.streak.days} 🔥</div><small class="mono" style="color:var(--muted)">${srs.learnedCount()} ${tr('cards learned', 'Karten gelernt')}</small></div>
    </div>
    ${allDone ? `<div class="callout"><span class="ci">🎓</span><div><p><b>${tr('You finished every module!', 'Du hast alle Lektionen abgeschlossen!')}</b> <a href="#/certificate">${tr('Get your certificate →', 'Hol dir dein Zertifikat →')}</a></p></div></div>` : `<p style="color:var(--muted)">🎓 ${tr(`Finish all ${MODULES.length} modules to unlock your certificate.`, `Schließe alle ${MODULES.length} Lektionen ab, um dein Zertifikat freizuschalten.`)}</p>`}
    <h2>${tr('Badges', 'Abzeichen')} <span class="mono" style="font-size:1rem;color:var(--muted)">${got}/${BADGES.length}</span></h2>
    <div class="badge-grid">${BADGES.map((b) => { const ok = b.test(); return `<div class="badge ${ok ? 'on' : ''}"><div class="badge-ico">${ok ? b.icon : '🔒'}</div><b>${b.name}</b><small>${b.desc}</small></div>`; }).join('')}</div>
    <h2 style="margin-top:48px">${tr('High scores', 'Rekorde')}</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${[...GAMES.filter((g) => g.id !== 'journey').map((g) => [g.id, g.title]), ['challenge', 'Challenge']].map(([id, n]) => `<a class="card hover" href="#/${id === 'challenge' ? 'challenge' : 'play/' + id}" style="color:var(--text)"><small class="mono" style="color:var(--muted)">${esc(n).toUpperCase()}</small><div style="font:800 2rem var(--font-display);margin-top:6px">${store.best(id) || '—'}</div></a>`).join('')}</div>
    <h2 style="margin-top:48px">${tr('Modules', 'Lektionen')}</h2>
    <div class="tbl-wrap"><table class="tbl">${MODULES.map((m) => `<tr><td>${m.icon} <a href="#/learn/${m.id}">${esc(m.title)}</a></td><td>${LEVELS.find((l) => l.id === m.level).name}</td><td>${store.isDone(m.id) ? `<span style="color:var(--mint)">✓ ${new Date(st.done[m.id]).toLocaleDateString(lang)}</span>` : `<span style="color:var(--muted)">${tr('not yet', 'noch nicht')}</span>`}</td></tr>`).join('')}</table></div>
  </div>${footer()}`;
  bindFooter(app);
}

/* ======================================================================
   FLASHCARDS (Leitner review)
   ====================================================================== */
// Card ids use the English glossary term so they survive a language switch.
function cardContent(id) {
  if (id.startsWith('g:')) {
    const i = GLOSSARY_EN.findIndex(([t]) => t === id.slice(2));
    if (i < 0) return null;
    const [term, def, mod] = GLOSSARY[i];
    return { kind: tr('Term', 'Begriff'), front: `<b class="fc-term">${esc(term)}</b><span class="fc-hint">${tr('What does it mean?', 'Was bedeutet das?')}</span>`, back: esc(def), mod };
  }
  const [, mod, qi] = id.split(':');
  const q = moduleById(mod)?.quiz[+qi];
  if (!q) return null;
  return { kind: tr('Question', 'Frage'), front: esc(q.q), back: `<b>${esc(q.a[q.c])}</b><br><span style="color:var(--text-dim)">${esc(q.why)}</span>`, mod };
}
function candidateIds() {
  const done = MODULES.filter((m) => store.isDone(m.id));
  const mods = done.length ? done : [MODULES.find((m) => !store.isDone(m.id)) || MODULES[0]];
  const ids = new Set(mods.map((m) => m.id));
  return [...mods.flatMap((m) => m.quiz.map((_, qi) => `q:${m.id}:${qi}`)), ...GLOSSARY_EN.filter(([, , mod]) => ids.has(mod)).map(([t]) => `g:${t}`)];
}
export function updateDueBadge() {
  const b = document.getElementById('due-badge');
  if (!b) return;
  const n = srs.dueIds().length;
  b.hidden = !n;
  b.textContent = n > 99 ? '99+' : String(n);
}

export function review(app) {
  const st = store.get();
  const queue = [...srs.dueIds(), ...srs.freshIds(candidateIds()).map((id) => ({ fresh: id }))]
    .map((x) => (typeof x === 'string' ? { id: x } : { id: x.fresh, fresh: true }))
    .filter((c) => cardContent(c.id));
  let cur = null, flipped = false;
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px;max-width:760px">
    <div class="eyebrow">${tr('Learning system', 'Lernsystem')}</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">${tr('Flashcards', 'Karteikarten')}</h1>
    <p class="lead">${tr('Spaced repetition: cards you know come back later and later, mistakes come back today. Every wrong answer in quizzes and games lands here automatically.', 'Verteiltes Wiederholen: Bekannte Karten kommen immer später wieder, Fehler noch heute. Jede falsche Antwort aus Quiz und Spielen landet automatisch hier.')}</p>
    <div class="fc-stats" id="fc-stats"></div>
    <div id="fc-area"></div>
    <details class="deep-dive" style="margin-top:32px"><summary><span class="tag violet">?</span> <span class="dd-title">${tr('How the boxes work', 'So funktionieren die Fächer')}</span><span class="chev">▶</span></summary><div class="dd-body"><p>${tr('Every card sits in one of 5 boxes. Knowing it moves it one box up; a mistake sends it back to box 1.', 'Jede Karte liegt in einem von 5 Fächern. Gewusst schiebt sie ein Fach weiter, ein Fehler zurück in Fach 1.')}</p>
      <div class="tbl-wrap"><table class="tbl"><tr><th>${tr('Box', 'Fach')}</th>${[1, 2, 3, 4, 5].map((b) => `<td>${b}</td>`).join('')}</tr><tr><th>${tr('Next review', 'Nächste Wiederholung')}</th>${srs.INTERVAL_DAYS.slice(1).map((d) => `<td>${d ? tr(`in ${d} d`, `in ${d} T.`) : tr('today', 'heute')}</td>`).join('')}</tr></table></div>
      <p>${tr(`New cards come from modules you completed (${srs.NEW_PER_DAY} per day).`, `Neue Karten kommen aus abgeschlossenen Lektionen (${srs.NEW_PER_DAY} pro Tag).`)}</p></div></details>
  </div>${footer()}`;
  bindFooter(app);
  const area = $('#fc-area', app);

  function stats() {
    const d = st.daily.date === srs.today() ? st.daily.count : 0;
    const boxes = [1, 2, 3, 4, 5].map((b) => Object.values(st.cards).filter((c) => c.box === b).length);
    $('#fc-stats', app).innerHTML = `
      <div><small>${tr('LEFT TODAY', 'HEUTE OFFEN')}</small><b>${queue.length + (cur ? 1 : 0)}</b></div>
      <div><small>${tr('DAILY GOAL', 'TAGESZIEL')}</small><b>${Math.min(d, srs.DAILY_GOAL)}/${srs.DAILY_GOAL}</b><div class="progress-bar"><div style="width:${Math.min(100, (d / srs.DAILY_GOAL) * 100)}%"></div></div></div>
      <div><small>${tr('STREAK', 'SERIE')}</small><b>${st.streak.days} 🔥</b></div>
      <div><small>${tr('BOXES 1–5', 'FÄCHER 1–5')}</small><div class="fc-boxes">${boxes.map((n, i) => `<span title="${tr('Box', 'Fach')} ${i + 1}" style="height:${8 + Math.min(40, n * 2)}px"></span>`).join('')}</div></div>`;
    updateDueBadge();
  }
  function next() {
    cur = queue.shift() || null;
    flipped = false;
    stats();
    if (!cur) {
      area.innerHTML = `<div class="card" style="text-align:center;padding:40px 24px"><div style="font-size:3rem">🎉</div><h2>${tr('All caught up!', 'Alles erledigt!')}</h2><p>${Object.keys(st.done).length ? tr('Come back tomorrow for the next cards. Want more? Complete another module or play a game.', 'Komm morgen für die nächsten Karten wieder. Mehr? Schließ eine weitere Lektion ab oder spiel ein Spiel.') : tr('Complete your first module to unlock more cards.', 'Schließ deine erste Lektion ab, um mehr Karten freizuschalten.')}</p><div class="btn-row" style="justify-content:center"><a class="btn" href="#/learn">${tr('Lessons', 'Lektionen')}</a><a class="btn ghost" href="#/play">${tr('Games', 'Spiele')}</a></div></div>`;
      return;
    }
    const c = cardContent(cur.id);
    const m = moduleById(c.mod);
    const box = st.cards[cur.id]?.box;
    area.innerHTML = `<div class="flashcard" id="fc" tabindex="0" role="button" aria-label="${tr('Flip card', 'Karte umdrehen')}">
        <div class="fc-meta"><span class="tag ${cur.fresh ? 'mint' : 'violet'}">${cur.fresh ? tr('new', 'neu') : `${tr('box', 'Fach')} ${box}`}</span><span>${c.kind}${m ? ` · ${m.icon} ${esc(m.title)}` : ''}</span></div>
        <div class="fc-inner"><div class="fc-face fc-front">${c.front}</div><div class="fc-face fc-back">${c.back}${m ? `<a href="#/learn/${m.id}" class="fc-link">${tr('Open lesson', 'Zur Lektion')} →</a>` : ''}</div></div>
        <div class="fc-tap">${tr('Tap or press Space to flip', 'Tippen oder Leertaste zum Umdrehen')}</div>
      </div>
      <div class="btn-row fc-actions" id="fc-actions" hidden><button class="btn orange" id="fc-no">↺ ${tr('Again', 'Nochmal')} <kbd>1</kbd></button><button class="btn" id="fc-yes">✓ ${tr('Got it', 'Gewusst')} <kbd>2</kbd></button></div>`;
    const card = $('#fc', area);
    card.onclick = (e) => { if (!e.target.closest('a')) flip(); };
    $('#fc-no', area).onclick = () => grade(false);
    $('#fc-yes', area).onclick = () => grade(true);
  }
  function flip() {
    if (!cur || flipped) return;
    flipped = true;
    $('#fc', area).classList.add('flipped');
    $('#fc-actions', area).hidden = false;
  }
  function grade(ok) {
    if (!cur || !flipped) return;
    if (cur.fresh) srs.markFresh();
    srs.answer(cur.id, ok);
    if (!ok) queue.push({ id: cur.id }); // mistakes come back in this session
    if (ok) store.award(`fc-${srs.today()}-${st.daily.count}`, 2, tr('Card reviewed', 'Karte wiederholt'));
    if (st.daily.count === srs.DAILY_GOAL) store.award(`fc-goal-${srs.today()}`, 20, tr('Daily goal reached!', 'Tagesziel erreicht!'));
    next();
  }
  const onKey = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
    else if (e.key === '1') grade(false);
    else if (e.key === '2') grade(true);
  };
  window.addEventListener('keydown', onKey);
  onCleanup(() => window.removeEventListener('keydown', onKey));
  next();
}

/* ======================================================================
   CERTIFICATE
   ====================================================================== */
export function certificate(app) {
  const st = store.get();
  const done = Object.keys(st.done).length;
  if (done < MODULES.length) {
    app.innerHTML = `<div class="wrap" style="padding:100px 0;text-align:center;max-width:640px"><div style="font-size:3rem">🎓</div><h2>${tr('Not quite yet', 'Noch nicht ganz')}</h2><p>${tr(`You completed ${done} of ${MODULES.length} modules. Finish them all to unlock your certificate.`, `Du hast ${done} von ${MODULES.length} Lektionen abgeschlossen. Schließ alle ab, um dein Zertifikat freizuschalten.`)}</p><div class="progress-bar" style="margin:20px auto;max-width:400px"><div style="width:${(done / MODULES.length) * 100}%"></div></div><a class="btn" href="#/learn">${tr('Continue learning', 'Weiterlernen')}</a></div>`;
    return;
  }
  const last = Math.max(...Object.values(st.done));
  const { lvl } = levelInfo();
  app.innerHTML = `<div class="wrap page-enter" style="padding:40px 0 80px">
    <div class="no-print btn-row" style="justify-content:center;margin-bottom:24px"><input class="input" id="cert-name" placeholder="${tr('Your name', 'Dein Name')}" value="${esc(st.name || '')}" style="max-width:320px"><button class="btn" id="cert-print">🖨 ${tr('Print / save as PDF', 'Drucken / als PDF speichern')}</button></div>
    <div class="certificate">
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="18" cy="20" r="6" fill="#5cf2c2"/><circle cx="46" cy="20" r="6" fill="#8b7bff"/><circle cx="32" cy="46" r="6" fill="#ff7a45"/><path d="M18 20L46 20L32 46Z" fill="none" stroke="currentColor" stroke-width="3"/></svg>
      <div class="eyebrow" style="justify-content:center">${tr('Certificate of completion', 'Abschlusszertifikat')}</div>
      <p>${tr('This certifies that', 'Hiermit wird bestätigt, dass')}</p>
      <h1 id="cert-show">${esc(st.name || tr('Your name', 'Dein Name'))}</h1>
      <p>${tr(`has completed all ${MODULES.length} modules of the PacketCraft networking course: from bits on the wire to routing, TCP, DNS, TLS and running services at scale.`, `alle ${MODULES.length} Lektionen des PacketCraft-Netzwerkkurses abgeschlossen hat: von Bits auf der Leitung über Routing, TCP, DNS und TLS bis zum Betrieb von Diensten im großen Maßstab.`)}</p>
      <div class="cert-row"><div><small>${tr('Date', 'Datum')}</small><b>${new Date(last).toLocaleDateString(lang)}</b></div><div><small>Level</small><b>${lvl}</b></div><div><small>XP</small><b>${st.xp}</b></div></div>
    </div>
  </div>`;
  const input = $('#cert-name', app);
  input.addEventListener('input', () => { st.name = input.value.slice(0, 60); store.save(); $('#cert-show', app).textContent = st.name || tr('Your name', 'Dein Name'); });
  $('#cert-print', app).onclick = () => window.print();
  store.award('certificate', 50, tr('Course complete!', 'Kurs abgeschlossen!'));
}
