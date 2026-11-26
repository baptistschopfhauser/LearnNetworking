import { webglOK, h, $, $$, store, levelInfo, esc, shuffle, pick, rand, intToIp, subnetInfo, loop, onCleanup, toast } from './core.js';
import { MODULES, LEVELS, moduleById } from './data/modules.js';
import { GLOSSARY } from './data/glossary.js';
import { mountWidgets, WIDGETS } from './widgets/index.js';


const footer = () => `<footer class="footer"><div class="wrap"><div><b style="color:var(--text);font-family:var(--font-display)">Packet<span style="color:var(--mint)">Craft</span></b> — learn networking by poking at it.</div><div>Progress is saved in your browser · <a href="#/" id="reset-progress">reset progress</a></div></div></footer>`;

function bindFooter(root) {
  const r = $('#reset-progress', root);
  if (r) r.onclick = (e) => { e.preventDefault(); if (confirm('Reset all XP and progress?')) { store.reset(); toast('Progress reset'); location.hash = '#/'; } };
}

/* ---------------- game catalogue ---------------- */
export const GAMES = [
  { id: 'journey', title: 'Journey of a Click', tag: 'Story · 3D', color: 'var(--sky)', blurb: 'A guided 3D cinematic of everything that happens when you load a page: ARP, DNS recursion, the TCP handshake, TLS and HTTP, packet by packet.', module: 'http-tls',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      <path d="M40 130 Q 90 100 120 120 T 200 110 T 285 120" stroke="#2c3a6a" stroke-width="2" fill="none"/>
      <path d="M120 120 Q 150 60 180 40 M180 40 L 230 45 L 270 60" stroke="#2c3a6a" stroke-width="2" fill="none"/>
      <path d="M40 130 Q 90 100 120 120 T 200 110 T 285 120" stroke="#5cf2c2" stroke-width="2.5" fill="none" stroke-dasharray="8 200"><animate attributeName="stroke-dashoffset" from="0" to="-260" dur="2.4s" repeatCount="indefinite"/></path>
      <rect x="24" y="118" width="32" height="20" rx="3" fill="#161d36" stroke="#5cf2c2"/><rect x="270" y="104" width="30" height="30" rx="3" fill="#161d36" stroke="#ff7a45"/>
      ${[[120, 120, '#8b7bff'], [180, 40, '#ffd166'], [230, 45, '#ffd166'], [270, 60, '#ffd166'], [200, 110, '#4cc9ff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="#161d36" stroke="${c}" stroke-width="2"/>`).join('')}
      <text x="274" y="96" font-size="14">🔒</text></svg>` },
  { id: 'runner', title: 'Packet Runner', tag: 'Routing', color: 'var(--mint)', blurb: 'You are an IP packet. Read routing tables, apply longest-prefix match, and reach your destination before TTL hits zero.', module: 'routing',
    art: `<svg viewBox="0 0 320 180"><defs><radialGradient id="ga" cx="50%" cy="50%"><stop offset="0" stop-color="#1b2150"/><stop offset="1" stop-color="#05070f"/></radialGradient></defs><rect width="320" height="180" fill="url(#ga)"/>
      <g stroke="#3a4a80" stroke-width="1.5"><line x1="40" y1="90" x2="110" y2="50"/><line x1="40" y1="90" x2="110" y2="130"/><line x1="110" y1="50" x2="190" y2="70"/><line x1="110" y1="130" x2="190" y2="70"/><line x1="110" y1="130" x2="190" y2="140"/><line x1="190" y1="70" x2="270" y2="95"/><line x1="190" y1="140" x2="270" y2="95"/></g>
      <path d="M40 90 L110 130 L190 70 L270 95" stroke="#5cf2c2" stroke-width="3" fill="none" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" from="22" to="0" dur="1s" repeatCount="indefinite"/></path>
      ${[[40, 90], [110, 50], [110, 130], [190, 70], [190, 140]].map(([x, y]) => `<g><ellipse cx="${x}" cy="${y}" rx="14" ry="6" fill="#1a2240" stroke="#8b7bff" stroke-width="2"/></g>`).join('')}
      <ellipse cx="270" cy="95" rx="14" ry="6" fill="#1a2240" stroke="#ff7a45" stroke-width="2"/><rect x="262" y="62" width="16" height="12" rx="2" fill="#ff7a45" opacity=".8"/>
      <rect x="183" y="56" width="14" height="14" fill="#5cf2c2" transform="rotate(20 190 63)"><animateTransform attributeName="transform" type="rotate" from="0 190 63" to="360 190 63" dur="4s" repeatCount="indefinite"/></rect></svg>` },
  { id: 'tower', title: 'Encapsulation Elevator', tag: 'Layers', color: 'var(--violet)', blurb: 'Ride a message down the sender’s stack adding headers, fire it across the wire as bits, then unwrap it layer by layer.', module: 'layers',
    art: `<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#070a16"/>
      ${['#ff5c9a', '#5cf2c2', '#4cc9ff', '#8b7bff'].map((c, i) => `<rect x="40" y="${30 + i * 30}" width="70" height="24" rx="4" fill="none" stroke="${c}" stroke-width="2" opacity=".8"/><rect x="210" y="${30 + i * 30}" width="70" height="24" rx="4" fill="none" stroke="${c}" stroke-width="2" opacity=".8"/>`).join('')}
      <path d="M75 152 C 140 175, 180 130, 245 152" stroke="#ffd166" stroke-width="3" fill="none"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${100 + i * 15}" y="${150 + Math.sin(i) * 6}" width="5" height="5" fill="${i % 2 ? '#5cf2c2' : '#ffd166'}"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="${i * 0.12}s" repeatCount="indefinite"/></rect>`).join('')}
      <g transform="translate(75 92)"><rect x="-16" y="-16" width="32" height="32" fill="#4cc9ff" opacity=".2" stroke="#4cc9ff"/><rect x="-11" y="-11" width="22" height="22" fill="#5cf2c2" opacity=".25" stroke="#5cf2c2"/><rect x="-6" y="-6" width="12" height="12" fill="#fff"/></g></svg>` },
  { id: 'defender', title: 'Firewall Defender', tag: 'Security', color: 'var(--orange)', blurb: 'Packets swarm toward your data center. Read protocol, port and source — zap what the policy forbids, let the rest through.', module: 'nat-firewalls',
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
    <canvas class="hero-3d" aria-label="Interactive 3D globe of routers exchanging packets"></canvas>
    <div class="hero-packet-log" id="hero-log"></div>
    <div class="wrap hero-inner">
      <div class="eyebrow">Interactive networking course</div>
      <h1>See the <span class="grad">Internet</span> from the inside.</h1>
      <p class="lead">PacketCraft teaches computer networking by letting you touch it: flip bits, cut cables, poison a cache, route packets in 3D. Start with the basics, then dive as deep as you like.</p>
      <div class="btn-row">
        <a class="btn" href="#/learn/${next.id}">${done ? 'Continue' : 'Start learning'} — ${esc(next.title)} →</a>
        <a class="btn ghost" href="#/play">🎮 Play the 3D games</a>
      </div>
      <div class="hero-stats">
        <div><b>${MODULES.length}</b>modules</div>
        <div><b>${Object.keys(WIDGETS).length}</b>interactive labs</div>
        <div><b>${GAMES.length}</b>3D experiences</div>
        <div><b>${done}/${MODULES.length}</b>completed</div>
      </div>
    </div>
    <div class="hero-hint">⟲ drag the globe</div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="marquee-track">${Array(2).fill(['TCP handshake', 'Longest prefix match', 'ARP', 'Subnetting', 'DNS recursion', 'TLS 1.3', 'Dijkstra', 'NAT', 'Congestion control', 'BGP', 'QUIC', 'VLANs', 'IPv6'].map((x) => `<span>${x}</span>`).join('')).join('')}</div></div>

  <section class="section"><div class="wrap">
    <div class="eyebrow">How it works</div>
    <h2>Three ways in. Pick your depth.</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:32px">
      <div class="card hover"><div class="tag mint">Learn</div><h3 style="margin-top:14px">Plain-language lessons</h3><p>Every concept starts with an analogy and a picture, then a live lab you can break. No prior knowledge needed.</p></div>
      <div class="card hover"><div class="tag violet">Go deep</div><h3 style="margin-top:14px">Optional deep dives</h3><p>Purple panels open into byte layouts, algorithms, RFC‑level detail, BGP politics and modern protocols like QUIC.</p></div>
      <div class="card hover"><div class="tag orange">Play</div><h3 style="margin-top:14px">3D games that test you</h3><p>Become a packet, defend a data center, ride the protocol stack. Earn XP for everything you master.</p></div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:end;gap:20px;flex-wrap:wrap"><div><div class="eyebrow">The path</div><h2 style="margin:0">From “what is a network” to TLS</h2></div><a class="btn ghost" href="#/learn">See all modules →</a></div>
    ${pathHTML(true)}
  </div></section>

  <section class="section" style="background:linear-gradient(180deg,transparent,rgba(139,123,255,0.06),transparent)"><div class="wrap split">
    <div class="game-tile">${GAMES[0].art}<div class="play-overlay"><a class="btn" href="#/play/runner">▶ Play Packet Runner</a></div></div>
    <div>
      <div class="eyebrow">Playable 3D</div>
      <h2>Be the packet.</h2>
      <p class="lead">In <b>Packet Runner</b> you fly through a 3D network of routers. Each one shows its routing table — pick the right interface before your TTL runs out.</p>
      <ul class="feature-list"><li>Longest-prefix match under time pressure</li><li>Default routes, covering /8s and sneaky look-alike /24s</li><li>Five levels, growing networks, a personal best to beat</li></ul>
      <div class="btn-row"><a class="btn ghost" href="#/play/tower">Encapsulation Elevator</a><a class="btn ghost" href="#/play/defender">Firewall Defender</a></div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap split">
    <div>
      <div class="eyebrow">New · 3D story</div>
      <h2>Follow one click across the Internet.</h2>
      <p class="lead"><b>Journey of a Click</b> slows a page load down to human speed. Watch ARP, NAT, a DNS resolver walking the root→TLD→authoritative chain, the TCP handshake, TLS key exchange and HTTP, all as packets flying through a 3D network.</p>
      <div class="btn-row"><a class="btn" href="#/play/journey">▶ Start the journey</a><a class="btn ghost" href="#/learn/troubleshooting">⌨️ Open the terminal</a></div>
    </div>
    <a class="game-tile" href="#/play/journey" aria-label="Journey of a Click">${GAMES.find((g) => g.id === 'journey').art}</a>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="eyebrow">Try it right now</div>
    <h2>Every lesson has a lab like this one.</h2>
    <p class="lead">Pick a topology, then click links to cut them. Watch which machines can still hear the broadcast.</p>
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
          ${d ? '<span class="check-badge" title="Completed">✓</span>' : ''}
          <span class="ico" style="box-shadow:inset 0 0 0 1px ${m.color}33">${m.icon}</span>
          <h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p>
          <div class="meta"><span class="tag">${m.minutes} min</span><span class="tag" style="color:${m.color};border-color:${m.color}44">lab</span>${m.body.includes('deep-dive') ? '<span class="tag violet">deep dives</span>' : ''}</div></a>`;
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
    <div class="eyebrow">Course</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">The learning path</h1>
    <p class="lead">${MODULES.length} modules in three tracks. Do them in order, or jump to whatever you're curious about — every lesson stands on its own.</p>
    <div class="card" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap;margin:28px 0 8px">
      <div><small class="mono" style="color:var(--muted)">LEVEL</small><div style="font:800 2.4rem var(--font-display)">${lvl}</div></div>
      <div style="flex:1;min-width:220px"><div style="display:flex;justify-content:space-between" class="mono"><small style="color:var(--muted)">${into}/${need} XP to level ${lvl + 1}</small><small style="color:var(--muted)">${done}/${MODULES.length} modules</small></div>
        <div class="progress-bar" style="margin-top:8px"><div style="width:${(into / need) * 100}%"></div></div>
        <div class="progress-bar" style="margin-top:8px"><div style="width:${(done / MODULES.length) * 100}%;background:linear-gradient(90deg,var(--orange),var(--pink))"></div></div></div>
      <a class="btn" href="#/challenge">⚡ Take the challenge</a>
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
      <div class="crumbs"><a href="#/learn">Learn</a><span>/</span><span>${lvl.name}</span><span>/</span><span style="color:var(--text)">Module ${idx + 1}</span></div>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><span style="font-size:3rem">${m.icon}</span><div><h1 style="font-size:clamp(2rem,4.5vw,3.4rem);margin:0">${esc(m.title)}</h1><p class="lead" style="margin:8px 0 0">${esc(m.summary)}</p></div></div>
      <div class="btn-row" style="margin-top:20px"><span class="tag">${m.minutes} min</span><span class="tag mint">${(m.body.match(/data-widget/g) || []).length} interactive lab${(m.body.match(/data-widget/g) || []).length === 1 ? '' : 's'}</span><span class="tag violet">${(m.body.match(/deep-dive/g) || []).length} deep dives</span>${store.isDone(m.id) ? '<span class="tag mint">✓ completed</span>' : ''}</div>
    </div></div>
    <div class="wrap module-layout">
      <aside class="toc" id="toc"></aside>
      <article class="prose module-content" id="content">${m.body}
        <section class="quiz" id="quiz"><h2 id="check">Check yourself</h2><p>Answer all three correctly to complete the module.</p><div id="quiz-body"></div></section>
        <div class="module-nav">
          ${prev ? `<a href="#/learn/${prev.id}"><div class="card hover"><small>← Previous</small><h3 style="margin:6px 0 0">${prev.icon} ${esc(prev.title)}</h3></div></a>` : '<span></span>'}
          ${next ? `<a href="#/learn/${next.id}" class="next"><div class="card hover"><small>Next →</small><h3 style="margin:6px 0 0">${next.icon} ${esc(next.title)}</h3></div></a>` : `<a href="#/challenge" class="next"><div class="card hover"><small>Finale →</small><h3 style="margin:6px 0 0">⚡ The Challenge</h3></div></a>`}
        </div>
      </article>
    </div>${footer()}</div>`;
  bindFooter(app);
  const content = $('#content', app);
  // TOC
  const heads = $$('h2[id]', content);
  const dds = $$('details.deep-dive', content);
  dds.forEach((d, i) => (d.id = 'deep-' + i));
  $('#toc', app).innerHTML = `<h4>On this page</h4>${heads.map((x) => `<a href="#/learn/${m.id}" data-to="${x.id}">${esc(x.textContent)}</a>`).join('')}${dds.length ? `<h4 style="margin-top:20px">Deep dives</h4>${dds.map((d) => `<a class="deep" href="#/learn/${m.id}" data-to="${d.id}">${esc(d.querySelector('summary').textContent.replace('Deep dive', '').replace('▶', '').trim())}</a>`).join('')}` : ''}`;
  $$('#toc a', app).forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.getElementById(a.dataset.to);
    if (t.tagName === 'DETAILS') t.open = true;
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  dds.forEach((d, i) => d.addEventListener('toggle', () => { if (d.open) store.award(`deep-${m.id}-${i}`, 5, 'Deep dive opened'); }));
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
    $$('.quiz-opt', qEl).forEach((o) => { const i = +o.dataset.a; o.disabled = true; if (i === q.c) o.classList.add('right'); else if (i === ai) o.classList.add('wrong'); });
    qEl.insertAdjacentHTML('beforeend', `<div class="quiz-explain">${answered[qi] ? '✓ ' : '✗ '}${esc(q.why)}</div>`);
    if (answered.every((x) => x !== null)) {
      const ok = answered.filter(Boolean).length;
      const res = $('#quiz-result', root);
      if (ok === m.quiz.length) {
        const first = !store.isDone(m.id);
        store.markDone(m.id);
        store.award(`mod-${m.id}`, 30, `Module complete: ${m.title}`);
        res.innerHTML = `<div class="callout"><span class="ci">🏁</span><div><p><b>Module complete!</b> ${first ? 'It’s now marked done on your learning path.' : ''}</p></div></div>`;
      } else {
        res.innerHTML = `<div class="callout warn"><span class="ci">↺</span><div><p>${ok}/${m.quiz.length} correct. Review the explanations, then <a href="#" id="quiz-retry">try again</a>.</p></div></div>`;
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
    <div class="eyebrow">Arcade</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">Playable 3D</h1>
    <p class="lead">A guided 3D story and three games, each built around a real networking skill. Drag to orbit, scroll to zoom, numbers on your keyboard to answer.</p>
    ${webglOK() ? '' : '<div class="callout warn"><span class="ci">⚠</span><div><p>Your browser doesn’t seem to support WebGL, which the 3D games need.</p></div></div>'}
    <div class="games-grid" style="margin-top:32px">${GAMES.map((g) => `<a class="card hover game-card" href="#/play/${g.id}">
      <div class="art">${g.art}</div>
      <div class="body"><div class="btn-row" style="justify-content:space-between"><span class="tag" style="color:${g.color};border-color:currentColor">${g.tag}</span>${store.best(g.id) ? `<span class="mono" style="font-size:.8rem;color:var(--muted)">best <b style="color:var(--text)">${store.best(g.id)}</b></span>` : ''}</div>
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
    <a href="#/play" class="btn small ghost game-back">← Arcade</a></div>`;
  const shell = $('.game-shell', app);
  if (!webglOK()) { shell.innerHTML = '<div class="overlay"><div class="panel"><h2>WebGL unavailable</h2><p>This game needs WebGL. Try a recent Chrome, Firefox, Safari or Edge.</p><a class="btn" href="#/play">Back</a></div></div>'; return; }
  const loaders = { runner: () => import('./three/runner.js').then((m) => m.mountRunner), tower: () => import('./three/tower.js').then((m) => m.mountTower), defender: () => import('./three/defender.js').then((m) => m.mountDefender), journey: () => import('./three/journey.js').then((m) => m.mountJourney) };
  const mount = await loaders[id]();
  if (!document.body.contains(shell)) return; // navigated away while loading
  mount(shell);
}

/* ======================================================================
   LAB / TOOLKIT
   ====================================================================== */
export const TOOLS = [
  { id: 'terminal', name: 'Terminal', icon: '⌨️' },
  { id: 'subnet', name: 'Subnet calculator', icon: '🧮' },
  { id: 'subnet-practice', name: 'Subnet drills', icon: '🎯' },
  { id: 'bits', name: 'Binary ↔ IP', icon: '🔢' },
  { id: 'lpm', name: 'Route lookup', icon: '🧭' },
  { id: 'dijkstra', name: 'Shortest paths', icon: '🗺️' },
  { id: 'tcp', name: 'TCP tracer', icon: '🤝' },
  { id: 'dns', name: 'DNS resolver', icon: '📇' },
  { id: 'http', name: 'HTTP client', icon: '🌐' },
  { id: 'firewall', name: 'Firewall rules', icon: '🛡️' },
  { id: 'signal', name: 'Line codes', icon: '〰️' },
  { id: 'wifi', name: 'Wi‑Fi planner', icon: '📶' },
  { id: 'loadbalancer', name: 'Load balancer', icon: '⚖️' },
];
export function lab(app, tool) {
  const cur = TOOLS.find((t) => t.id === tool) || TOOLS[0];
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">Toolkit</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">The network toolkit</h1>
    <p class="lead">Every lab from the course, standalone. Useful as a real calculator long after you finish.</p>
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
    <div class="eyebrow">Reference</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">Glossary</h1>
    <p class="lead">${GLOSSARY.length} terms, each linked to the lesson that explains it.</p>
    <div class="gloss-search"><input class="input" id="gq" placeholder="Search terms… (try “TTL” or “handshake”)" autocomplete="off"></div>
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
    }).join('') || '<p>No matches.</p>';
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
  const ports = [['HTTPS', 443], ['SSH', 22], ['DNS', 53], ['HTTP', 80], ['SMTP submission', 587], ['RDP', 3389]];
  const [name, port] = pick(ports);
  qs.push({ q: `Which port does ${name} use by default?`, a: opts4(port, shuffle(ports.filter((x) => x[1] !== port)).map((x) => x[1]), []), why: `${name} listens on ${port}.`, right: String(port) });
  const p = rand(20, 30);
  const s = subnetInfo(((rand(1, 223) << 24) | (rand(0, 255) << 16) | (rand(0, 255) << 8) | rand(0, 255)) >>> 0, p);
  qs.push({ q: `How many usable hosts are in a /${p}?`, a: opts4(s.hosts, [s.total, s.hosts * 2 + 2, s.hosts / 2 - 1, s.hosts - 1], [s.hosts + 1, s.total * 2, 1]), why: `2^(32−${p}) − 2 = ${s.hosts}.`, right: String(s.hosts) });
  const ip = intToIp(s.network + rand(1, Math.max(1, s.hosts)));
  qs.push({ q: `What is the network address of ${ip}/${p}?`, a: opts4(intToIp(s.network), [intToIp((s.network + s.total) >>> 0), intToIp(s.broadcast), intToIp(Math.max(0, s.network - s.total))], [intToIp((s.network + 2 * s.total) >>> 0), intToIp(s.network + 1)]), why: `AND the address with the /${p} mask → ${intToIp(s.network)}.`, right: intToIp(s.network) });
  return qs;
}
export function challenge(app) {
  const bank = [
    ...MODULES.flatMap((m) => m.quiz.map((q) => ({ q: q.q, a: q.a, right: q.a[q.c], why: q.why, mod: m }))),
    ...generatedQuestions(), ...generatedQuestions(),
  ];
  const qs = shuffle(bank).slice(0, 12).map((q) => ({ ...q, a: shuffle(q.a) }));
  let i = 0, score = 0, correct = 0, timeLeft = 15, streak = 0, state = 'intro';
  const PER = 15;
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px;max-width:820px">
    <div class="eyebrow">⚡ Challenge</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">12 questions. 15 seconds each.</h1>
    <p class="lead">Questions from every module plus freshly generated subnetting and port puzzles. Faster answers score more; streaks multiply.</p>
    <div class="card" id="ch" style="margin-top:28px;padding:clamp(20px,4vw,36px)"></div>
  </div>${footer()}`;
  bindFooter(app);
  const box = $('#ch', app);
  const best = store.best('challenge');
  box.innerHTML = `<div style="text-align:center"><div style="font-size:3rem">⚡</div><h2>Ready?</h2><p>${best ? `Your best score: <b style="color:var(--mint)">${best}</b>` : 'Set your first high score.'}</p><button class="btn" id="ch-go">Start the clock</button></div>`;
  $('#ch-go', box).onclick = () => { state = 'q'; show(); };

  function show() {
    const q = qs[i];
    timeLeft = PER;
    box.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px" class="mono"><small style="color:var(--muted)">QUESTION ${i + 1}/${qs.length}${q.mod ? ` · ${q.mod.icon} ${esc(q.mod.title)}` : ' · 🎲 generated'}</small><small>score <b style="color:var(--mint)">${score}</b>${streak > 1 ? ` · 🔥 ×${Math.min(streak, 4)}` : ''}</small></div>
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
    if (ok) { streak++; correct++; score += Math.round((50 + timeLeft * 10) * Math.min(streak, 4)); } else streak = 0;
    $$('.quiz-opt', box).forEach((b) => { b.disabled = true; if (b.dataset.a === String(q.right)) b.classList.add('right'); else if (b.dataset.a === a) b.classList.add('wrong'); });
    $('#ch-x', box).innerHTML = `<div class="quiz-explain">${a === null ? '⏱ Time’s up. ' : ok ? '✓ ' : '✗ '}${esc(q.why)}</div><div class="btn-row" style="margin-top:16px"><button class="btn small" id="ch-n">${i < qs.length - 1 ? 'Next →' : 'See results'}</button></div>`;
    $('#ch-n', box).onclick = () => { i++; i < qs.length ? show() : finish(); };
  }
  function finish() {
    state = 'done';
    const isBest = store.setBest('challenge', score);
    store.award('challenge-done', 20, 'Challenge complete');
    if (correct >= 10) store.award('challenge-10', 40, 'Network wizard (10+ correct)');
    const rank = correct >= 11 ? ['🧙', 'Network wizard'] : correct >= 8 ? ['🛰', 'Backbone engineer'] : correct >= 5 ? ['📡', 'Router apprentice'] : ['🔌', 'Packet in training'];
    box.innerHTML = `<div style="text-align:center"><div style="font-size:3.4rem">${rank[0]}</div><h2>${rank[1]}</h2><div class="big-score">${score}</div><p>${correct}/${qs.length} correct${isBest ? ' · 🏆 new best!' : ` · best ${store.best('challenge')}`}</p><div class="btn-row" style="justify-content:center"><button class="btn" id="ch-again">Try again</button><a class="btn ghost" href="#/learn">Back to lessons</a></div></div>`;
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
  app.innerHTML = `<div class="wrap" style="padding:120px 0;text-align:center"><div style="font:800 6rem var(--font-display);color:var(--orange)">404</div><h2>Destination host unreachable</h2><p>ICMP type 3 — this route doesn’t exist.</p><a class="btn" href="#/">Back to the default route</a></div>`;
}

/* ======================================================================
   PROFILE & ACHIEVEMENTS
   ====================================================================== */
const has = (id) => !!store.get().awarded[id];
const countPrefix = (p) => Object.keys(store.get().awarded).filter((k) => k.startsWith(p)).length;
export const BADGES = [
  { icon: '🌱', name: 'First steps', desc: 'Complete any module', test: () => Object.keys(store.get().done).length >= 1 },
  { icon: '🧱', name: 'Solid foundations', desc: 'Complete every Foundations module', test: () => MODULES.filter((m) => m.level === 'foundations').every((m) => store.isDone(m.id)) },
  { icon: '⚙️', name: 'Core engineer', desc: 'Complete every Core module', test: () => MODULES.filter((m) => m.level === 'core').every((m) => store.isDone(m.id)) },
  { icon: '🌍', name: 'Netizen', desc: 'Complete the Internet track', test: () => MODULES.filter((m) => m.level === 'apps').every((m) => store.isDone(m.id)) },
  { icon: '🎓', name: 'Graduate', desc: 'Complete all modules', test: () => MODULES.every((m) => store.isDone(m.id)) },
  { icon: '🤿', name: 'Deep diver', desc: 'Open 10 deep dives', test: () => countPrefix('deep-') >= 10 },
  { icon: '🧮', name: 'Subnet slayer', desc: 'Reach a 5-streak in subnet drills', test: () => has('subnet-win-5') },
  { icon: '🧭', name: 'Packet Runner', desc: 'Clear all 5 routing levels', test: () => has('runner-win') },
  { icon: '🧅', name: 'Stack master', desc: 'Finish Encapsulation Elevator', test: () => has('tower-win') },
  { icon: '🛡️', name: 'Gatekeeper', desc: 'Win Firewall Defender', test: () => has('defender-win') },
  { icon: '🎬', name: 'Tourist', desc: 'Finish Journey of a Click', test: () => has('journey-done') },
  { icon: '⌨️', name: 'Terminal master', desc: 'Finish every terminal mission', test: () => has('term-all') },
  { icon: '🔥', name: 'Firewall architect', desc: 'Solve the firewall puzzle with ≤ 4 rules', test: () => has('fw-lean') },
  { icon: '⚖️', name: 'Traffic cop', desc: 'Tame a slow server with least-connections', test: () => has('lb-lc') },
  { icon: '🧙', name: 'Network wizard', desc: '10+ correct in the Challenge', test: () => has('challenge-10') },
  { icon: '🌐', name: 'Status collector', desc: 'Find all 9 HTTP status codes', test: () => has('http-9') },
];

export function profile(app) {
  const st = store.get();
  const { lvl, into, need } = levelInfo();
  const got = BADGES.filter((b) => b.test()).length;
  const done = Object.keys(st.done).length;
  app.innerHTML = `<div class="wrap page-enter" style="padding-top:56px;padding-bottom:80px">
    <div class="eyebrow">Profile</div><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">Your progress</h1>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:28px 0">
      <div class="card"><small class="mono" style="color:var(--muted)">LEVEL</small><div class="big-score" style="margin:6px 0 10px">${lvl}</div><div class="progress-bar"><div style="width:${(into / need) * 100}%"></div></div><small class="mono" style="color:var(--muted)">${into}/${need} XP to next</small></div>
      <div class="card"><small class="mono" style="color:var(--muted)">TOTAL XP</small><div class="big-score" style="margin:6px 0 10px;color:var(--violet)">${st.xp}</div><small class="mono" style="color:var(--muted)">${Object.keys(st.awarded).length} achievements earned</small></div>
      <div class="card"><small class="mono" style="color:var(--muted)">MODULES</small><div class="big-score" style="margin:6px 0 10px;color:var(--orange)">${done}/${MODULES.length}</div><div class="progress-bar"><div style="width:${(done / MODULES.length) * 100}%;background:linear-gradient(90deg,var(--orange),var(--pink))"></div></div></div>
      <div class="card"><small class="mono" style="color:var(--muted)">BADGES</small><div class="big-score" style="margin:6px 0 10px;color:var(--yellow)">${got}/${BADGES.length}</div><small class="mono" style="color:var(--muted)">keep playing to unlock more</small></div>
    </div>
    <h2>Badges</h2>
    <div class="badge-grid">${BADGES.map((b) => { const ok = b.test(); return `<div class="badge ${ok ? 'on' : ''}"><div class="badge-ico">${ok ? b.icon : '🔒'}</div><b>${b.name}</b><small>${b.desc}</small></div>`; }).join('')}</div>
    <h2 style="margin-top:48px">High scores</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${[['runner', 'Packet Runner'], ['tower', 'Encapsulation Elevator'], ['defender', 'Firewall Defender'], ['challenge', 'Challenge']].map(([id, n]) => `<a class="card hover" href="#/${id === 'challenge' ? 'challenge' : 'play/' + id}" style="color:var(--text)"><small class="mono" style="color:var(--muted)">${n.toUpperCase()}</small><div style="font:800 2rem var(--font-display);margin-top:6px">${store.best(id) || '—'}</div></a>`).join('')}</div>
    <h2 style="margin-top:48px">Modules</h2>
    <div class="tbl-wrap"><table class="tbl">${MODULES.map((m) => `<tr><td>${m.icon} <a href="#/learn/${m.id}">${esc(m.title)}</a></td><td>${LEVELS.find((l) => l.id === m.level).name}</td><td>${store.isDone(m.id) ? `<span style="color:var(--mint)">✓ ${new Date(st.done[m.id]).toLocaleDateString()}</span>` : '<span style="color:var(--muted)">not yet</span>'}</td></tr>`).join('')}</table></div>
  </div>${footer()}`;
  bindFooter(app);
}
