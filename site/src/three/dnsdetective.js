import { THREE, createStage, starfield, glowSprite, toScreen, gridFloor, orbit, isMobile, sfx, burst } from './common.js';
import { loop, onCleanup, store, h, $, esc, shuffle } from '../core.js';
import { tr } from '../i18n.js';
import { flag } from '../srs.js';

const NODES = {
  client: { pos: [-16, 0, 6], icon: '💻', name: tr('User’s laptop', 'Laptop des Nutzers'), color: 0x5cf2c2 },
  resolver: { pos: [-5, 0, -2], icon: '📇', name: tr('Resolver 1.1.1.1', 'Resolver 1.1.1.1'), color: 0xffd166 },
  root: { pos: [4, 7, -14], icon: '🌳', name: tr('Root server', 'Root-Server'), color: 0xffd166 },
  tld: { pos: [12, 7, -6], icon: '🗂', name: tr('TLD server', 'TLD-Server'), color: 0xffd166 },
  auth: { pos: [16, 2, 5], icon: '📜', name: tr('Authoritative server', 'Autoritativer Server'), color: 0xff7a45 },
  web: { pos: [4, 0, 12], icon: '🖥', name: tr('Web / mail server', 'Web-/Mailserver'), color: 0x8b7bff },
};
const code = (lines) => `<pre class="code" style="margin:0;font-size:.74rem;white-space:pre-wrap">${lines}</pre>`;
const OK = tr('nothing unusual', 'nichts Auffälliges');

// Each case: symptom, what every node shows when inspected, the culprit node, and fix options (first one is correct).
const CASES = [
  {
    id: 'stale', title: tr('The site moved — but not for everyone', 'Die Seite ist umgezogen – aber nicht für alle'),
    symptom: tr('shop.example moved to a new server (203.0.113.50) an hour ago. Some customers still land on the old, switched-off server.', 'shop.example ist vor einer Stunde auf einen neuen Server (203.0.113.50) umgezogen. Manche Kunden landen noch auf dem alten, abgeschalteten Server.'),
    nodes: {
      client: code(`$ dig shop.example +short\n<span class="r">198.51.100.7</span>   <span class="c">← old IP!</span>`),
      resolver: code(`<span class="k">cache:</span>\nshop.example. <span class="r">86400</span> IN A <span class="r">198.51.100.7</span>\n<span class="c">${tr('cached 1 h ago · TTL left: 82800 s (23 h)', 'vor 1 h gespeichert · TTL übrig: 82800 s (23 h)')}</span>`),
      root: code(`.example → NS a.nic.example  <span class="c">(${OK})</span>`),
      tld: code(`shop.example → NS ns1.shop.example  <span class="c">(${OK})</span>`),
      auth: code(`shop.example. <span class="g">300</span> IN A <span class="g">203.0.113.50</span>\n<span class="c">${tr('changed 1 h ago, TTL was 86400 before', 'vor 1 h geändert, TTL war vorher 86400')}</span>`),
      web: code(`198.51.100.7: <span class="r">${tr('offline (decommissioned)', 'offline (abgeschaltet)')}</span>\n203.0.113.50: <span class="g">${tr('online', 'online')}</span>`),
    },
    culprit: 'resolver',
    fixes: [tr('Flush the resolver cache (or wait for the TTL) — next time lower the TTL days before moving', 'Resolver-Cache leeren (oder TTL abwarten) – nächstes Mal die TTL Tage vor dem Umzug senken'), tr('Change the A record again', 'Den A-Eintrag noch einmal ändern'), tr('Restart the new web server', 'Den neuen Webserver neu starten')],
    why: tr('The authoritative answer is correct, but resolvers keep the old answer until its TTL (24 h!) runs out. Lowering the TTL before a migration avoids this.', 'Die autoritative Antwort stimmt, aber Resolver behalten die alte Antwort, bis ihre TTL (24 h!) abläuft. Die TTL vor einem Umzug zu senken verhindert das.'),
    card: 'g:TTL (DNS)',
  },
  {
    id: 'typo-a', title: tr('Everyone gets a timeout', 'Alle bekommen einen Timeout'),
    symptom: tr('Since this morning’s change, nobody can open blog.example. The browser waits and then shows “connection timed out”.', 'Seit der Änderung heute Morgen kann niemand blog.example öffnen. Der Browser wartet und zeigt dann „Zeitüberschreitung“.'),
    nodes: {
      client: code(`$ dig blog.example +short\n93.184.215.41\n$ curl -I https://blog.example\n<span class="r">curl: (28) Connection timed out</span>`),
      resolver: code(`<span class="k">cache:</span> blog.example. 300 IN A 93.184.215.41\n<span class="c">${tr('fresh from the authoritative server', 'frisch vom autoritativen Server')}</span>`),
      root: code(`.example → NS a.nic.example  <span class="c">(${OK})</span>`),
      tld: code(`blog.example → NS ns1.blog.example  <span class="c">(${OK})</span>`),
      auth: code(`<span class="k">zone blog.example</span>\n@    300 IN A    <span class="r">93.184.215.41</span>\nwww  300 IN CNAME @\n<span class="c">${tr('edited today 08:12', 'heute 08:12 bearbeitet')}</span>`),
      web: code(`${tr('web server address', 'Adresse des Webservers')}: <span class="g">93.184.215.14</span>\n${tr('nginx running, port 443 open', 'nginx läuft, Port 443 offen')}`),
    },
    culprit: 'auth',
    fixes: [tr('Fix the A record: 93.184.215.14 (two digits were swapped)', 'A-Eintrag korrigieren: 93.184.215.14 (zwei Ziffern vertauscht)'), tr('Open port 443 on the firewall', 'Port 443 in der Firewall öffnen'), tr('Flush the resolver cache', 'Resolver-Cache leeren')],
    why: tr('The zone points to .41, but the server lives at .14. DNS faithfully delivers the wrong address — garbage in, garbage out.', 'Die Zone zeigt auf .41, der Server hat aber .14. DNS liefert treu die falsche Adresse – Müll rein, Müll raus.'),
    card: 'q:dns:0',
  },
  {
    id: 'mx', title: tr('Mail bounces, web works', 'Mails kommen zurück, Web geht'),
    symptom: tr('The website of team.example works fine, but every e-mail to @team.example bounces with “no mail server for domain”.', 'Die Website von team.example läuft, aber jede E-Mail an @team.example kommt zurück mit „kein Mailserver für die Domain“.'),
    nodes: {
      client: code(`$ dig team.example MX +short\n<span class="r">${tr('(no answer)', '(keine Antwort)')}</span>\n$ dig team.example A +short\n203.0.113.80`),
      resolver: code(`team.example. MX → <span class="r">NOERROR, 0 answers</span>`),
      root: code(`.example → NS a.nic.example  <span class="c">(${OK})</span>`),
      tld: code(`team.example → NS ns1.team.example  <span class="c">(${OK})</span>`),
      auth: code(`<span class="k">zone team.example</span>\n@    3600 IN A    203.0.113.80\n@    3600 IN TXT  "v=spf1 mx -all"\n<span class="r">; ${tr('no MX record', 'kein MX-Eintrag')}</span>\n<span class="c">${tr('migrated from old DNS provider yesterday', 'gestern vom alten DNS-Anbieter umgezogen')}</span>`),
      web: code(`mail.team.example 203.0.113.81: <span class="g">${tr('SMTP on port 25 ready', 'SMTP auf Port 25 bereit')}</span>`),
    },
    culprit: 'auth',
    fixes: [tr('Add “team.example. MX 10 mail.team.example.” to the zone', '„team.example. MX 10 mail.team.example.“ zur Zone hinzufügen'), tr('Restart the mail server', 'Den Mailserver neu starten'), tr('Add an AAAA record', 'Einen AAAA-Eintrag hinzufügen')],
    why: tr('The MX record got lost in the DNS migration. Without it, other servers don’t know where to deliver mail — even though the mail server itself is fine.', 'Der MX-Eintrag ist beim DNS-Umzug verloren gegangen. Ohne ihn wissen andere Server nicht, wohin sie Mail liefern sollen – obwohl der Mailserver selbst läuft.'),
    card: 'q:email:0',
  },
  {
    id: 'cname', title: tr('www is broken', 'www ist kaputt'),
    symptom: tr('example.org opens fine, but www.example.org says “server not found”.', 'example.org öffnet sich, aber www.example.org meldet „Server nicht gefunden“.'),
    nodes: {
      client: code(`$ dig www.example.org\nwww.example.org. CNAME exmaple.org.\n;; status: <span class="r">NXDOMAIN</span>`),
      resolver: code(`www.example.org → CNAME <span class="r">exmaple.org</span>\nexmaple.org → <span class="r">NXDOMAIN</span>`),
      root: code(`.org → NS a0.org.afilias-nst.info  <span class="c">(${OK})</span>`),
      tld: code(`example.org → NS ns1.example.org  <span class="c">(${OK})</span>\n<span class="r">exmaple.org: ${tr('not registered', 'nicht registriert')}</span>`),
      auth: code(`<span class="k">zone example.org</span>\n@    300 IN A     93.184.215.14\nwww  300 IN CNAME <span class="r">exmaple.org.</span>`),
      web: code(`93.184.215.14: <span class="g">${tr('serves example.org and www.example.org', 'liefert example.org und www.example.org aus')}</span>`),
    },
    culprit: 'auth',
    fixes: [tr('Fix the CNAME target to example.org.', 'CNAME-Ziel auf example.org. korrigieren'), tr('Register exmaple.org', 'exmaple.org registrieren'), tr('Add www to the web server config', 'www in der Webserver-Konfiguration ergänzen')],
    why: tr('A typo in the CNAME target (“exmaple”) sends resolvers to a name that doesn’t exist, so they answer NXDOMAIN.', 'Ein Tippfehler im CNAME-Ziel („exmaple“) schickt Resolver zu einem Namen, den es nicht gibt – also antworten sie NXDOMAIN.'),
    card: 'g:CNAME',
  },
  {
    id: 'expired', title: tr('The whole domain vanished', 'Die ganze Domain ist weg'),
    symptom: tr('Website, mail, everything for bakery.example stopped working overnight. Nobody changed anything.', 'Website, Mail, alles von bakery.example funktioniert seit heute Nacht nicht mehr. Niemand hat etwas geändert.'),
    nodes: {
      client: code(`$ dig bakery.example\n;; status: <span class="r">NXDOMAIN</span>`),
      resolver: code(`bakery.example → <span class="r">NXDOMAIN</span> ${tr('from the TLD', 'vom TLD')}`),
      root: code(`.example → NS a.nic.example  <span class="c">(${OK})</span>`),
      tld: code(`$ whois bakery.example\nStatus: <span class="r">clientHold, redemptionPeriod</span>\nExpiry: <span class="r">${tr('yesterday', 'gestern')}</span>\n<span class="c">${tr('delegation removed', 'Delegation entfernt')}</span>`),
      auth: code(`<span class="k">zone bakery.example</span>\n@   IN A  203.0.113.30\n@   IN MX 10 mail\n<span class="g">${tr('all records present', 'alle Einträge vorhanden')}</span>`),
      web: code(`203.0.113.30: <span class="g">${tr('online', 'online')}</span>`),
    },
    culprit: 'tld',
    fixes: [tr('Renew the domain at the registrar (and turn on auto-renew)', 'Domain beim Registrar verlängern (und Auto-Verlängerung einschalten)'), tr('Add the records again on the authoritative server', 'Die Einträge auf dem autoritativen Server neu anlegen'), tr('Switch to another resolver', 'Einen anderen Resolver nutzen')],
    why: tr('The registration expired, so the registry removed the delegation at the TLD. The zone itself is fine — nobody is sent to it anymore.', 'Die Registrierung ist abgelaufen, also hat die Registry die Delegation beim TLD entfernt. Die Zone selbst ist in Ordnung – nur schickt niemand mehr Anfragen dorthin.'),
    card: 'g:TLD',
  },
  {
    id: 'dnssec', title: tr('SERVFAIL, but only on some networks', 'SERVFAIL – aber nur in manchen Netzen'),
    symptom: tr('secure.example fails for users of validating resolvers (like 1.1.1.1) with SERVFAIL. On some old networks it still works.', 'secure.example scheitert bei Nutzern validierender Resolver (wie 1.1.1.1) mit SERVFAIL. In manchen alten Netzen geht es noch.'),
    nodes: {
      client: code(`$ dig secure.example\n;; status: <span class="r">SERVFAIL</span>\n$ dig secure.example +cd   <span class="c">${tr('(checking disabled)', '(Prüfung aus)')}</span>\nsecure.example. A 203.0.113.60  <span class="g">${tr('works!', 'geht!')}</span>`),
      resolver: code(`${tr('DNSSEC validation', 'DNSSEC-Prüfung')}: <span class="r">${tr('BOGUS — signature expired', 'BOGUS – Signatur abgelaufen')}</span>`),
      root: code(`.example ${tr('signed', 'signiert')}  <span class="c">(${OK})</span>`),
      tld: code(`secure.example DS 12345 13 2 …  <span class="c">(${OK})</span>`),
      auth: code(`secure.example. A 203.0.113.60\nRRSIG A 13 2 300 <span class="r">${tr('expiry: 3 days ago', 'Ablauf: vor 3 Tagen')}</span>\n<span class="c">${tr('signing cron job failed silently', 'Signier-Cronjob ist still fehlgeschlagen')}</span>`),
      web: code(`203.0.113.60: <span class="g">${tr('online', 'online')}</span>`),
    },
    culprit: 'auth',
    fixes: [tr('Re-sign the zone and fix the automatic re-signing', 'Zone neu signieren und das automatische Nachsignieren reparieren'), tr('Remove the DS record at the TLD immediately', 'Den DS-Eintrag beim TLD sofort löschen'), tr('Tell users to switch to a non-validating resolver', 'Nutzern raten, einen nicht validierenden Resolver zu nehmen')],
    why: tr('DNSSEC signatures (RRSIG) have an expiry date. When re-signing stops, validating resolvers reject the answers as bogus and return SERVFAIL. +cd proves the data itself is fine.', 'DNSSEC-Signaturen (RRSIG) haben ein Ablaufdatum. Stoppt das Nachsignieren, verwerfen validierende Resolver die Antworten als „bogus“ und liefern SERVFAIL. +cd zeigt, dass die Daten selbst stimmen.'),
    card: 'g:DNSSEC',
  },
  {
    id: 'hosts', title: tr('Broken only on one laptop', 'Kaputt nur auf einem Laptop'),
    symptom: tr('intranet.example works for everyone in the office — except on Sam’s laptop, which opens an old test server.', 'intranet.example läuft bei allen im Büro – außer auf Sams Laptop, der einen alten Testserver öffnet.'),
    nodes: {
      client: code(`$ cat /etc/hosts\n127.0.0.1  localhost\n<span class="r">10.0.9.99  intranet.example   # test 2023</span>\n$ getent hosts intranet.example\n<span class="r">10.0.9.99</span>`),
      resolver: code(`intranet.example. 300 IN A <span class="g">10.0.1.20</span>`),
      root: code(`<span class="c">(${tr('not even asked — the laptop never sends a query', 'gar nicht gefragt – der Laptop stellt keine Anfrage')})</span>`),
      tld: code(`<span class="c">(${tr('not asked', 'nicht gefragt')})</span>`),
      auth: code(`intranet.example. 300 IN A <span class="g">10.0.1.20</span>`),
      web: code(`10.0.1.20: <span class="g">intranet</span>\n10.0.9.99: <span class="y">${tr('old test server', 'alter Testserver')}</span>`),
    },
    culprit: 'client',
    fixes: [tr('Remove the old line from /etc/hosts on Sam’s laptop', 'Die alte Zeile aus /etc/hosts auf Sams Laptop entfernen'), tr('Change the A record to 10.0.9.99', 'Den A-Eintrag auf 10.0.9.99 ändern'), tr('Flush the resolver cache', 'Resolver-Cache leeren')],
    why: tr('The hosts file is checked before DNS. A forgotten test entry overrides the correct answer — only on that one machine.', 'Die hosts-Datei wird vor DNS geprüft. Ein vergessener Testeintrag überschreibt die richtige Antwort – nur auf diesem einen Rechner.'),
    card: 'q:dns:1',
  },
];

export function mountDnsDetective(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 0.9, bloomRadius: 0.5, bloomThreshold: 0.15, fogDensity: 0.012 });
  scene.add(starfield(1400, 220));
  scene.add(gridFloor(300, 90, -1.2));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.8));
  const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(10, 30, 20); scene.add(dl);
  const mobile = isMobile();
  const V = (k) => new THREE.Vector3(...NODES[k].pos);

  // servers as stacked units with a glow; pickable
  const objs = {};
  const pickables = [];
  const labels = [];
  Object.entries(NODES).forEach(([k, n]) => {
    const g = new THREE.Group(); g.position.copy(V(k));
    const col = new THREE.Color(n.color);
    const mat = new THREE.MeshStandardMaterial({ color: 0x161d36, metalness: 0.6, roughness: 0.35, emissive: col, emissiveIntensity: 0.08 });
    for (let i = 0; i < 3; i++) {
      const u = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 2.2), mat); u.position.y = 0.45 + i * 1;
      u.userData.node = k; pickables.push(u); g.add(u);
      const led = new THREE.Mesh(new THREE.BoxGeometry(2, 0.07, 0.05), new THREE.MeshBasicMaterial({ color: n.color })); led.position.set(0, 0.45 + i, 1.13); g.add(led);
    }
    const glow = glowSprite(col, 8); glow.position.y = 1.5; glow.material.opacity = 0.2; g.add(glow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.06, 6, 48), new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    scene.add(g);
    objs[k] = { g, mat, glow, ring, seen: false };
    const el = document.createElement('div');
    el.className = 'label3d opt'; el.style.color = 'var(--text)'; el.style.borderColor = 'var(--line-strong)';
    el.innerHTML = `${n.icon} ${n.name}`;
    el.onclick = () => inspect(k);
    hud.appendChild(el);
    labels.push({ pos: V(k).add(new THREE.Vector3(0, 4.2, 0)), el });
  });
  const LINKS = [['client', 'resolver'], ['resolver', 'root'], ['resolver', 'tld'], ['resolver', 'auth'], ['client', 'web']];
  LINKS.forEach(([a, b]) => {
    const pa = V(a).setY(1), pb = V(b).setY(1);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), new THREE.LineDashedMaterial({ color: 0x2c3a6a, dashSize: 0.6, gapSize: 0.4 })).computeLineDistances());
  });

  /* ---------- HUD ---------- */
  const top = h(`<div class="hud hud-top">
    <div class="hud-pill"><span>${tr('CASE', 'FALL')}</span><b id="d-case">1/${CASES.length}</b></div>
    <div class="hud-pill"><span>${tr('CLUES', 'SPUREN')}</span><b id="d-clues">0</b></div>
    <div class="hud-pill"><span>${tr('SCORE', 'PUNKTE')}</span><b id="d-score">0</b></div>
  </div>`);
  const side = h(`<div class="hud hud-side"><div class="hud-panel" id="d-panel"></div></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, side, overlay);
  if (mobile) { side.style.top = 'auto'; side.style.bottom = '12px'; side.style.maxHeight = '52%'; side.style.overflowY = 'auto'; }
  const P = $('#d-panel', side);
  const set = (id, v) => { const e = shell.querySelector('#' + id); if (e) e.textContent = v; };

  const cases = shuffle(CASES);
  let ci = 0, cs, score = 0, clues = 0, state = 'intro', selected = null, wrongs = 0, totalWrong = 0;

  function startCase() {
    cs = cases[ci]; clues = 0; wrongs = 0; selected = null; state = 'investigate';
    Object.values(objs).forEach((o) => (o.seen = false));
    overlay.style.display = 'none';
    set('d-case', `${ci + 1}/${cases.length}`); set('d-clues', '0'); set('d-score', String(score));
    renderPanel();
  }
  function renderPanel(inspected) {
    P.innerHTML = `<h4>🕵 ${esc(cs.title)}</h4><p style="color:var(--text);font:.9rem/1.5 var(--font-body);margin:0 0 10px">${esc(cs.symptom)}</p>
      ${inspected ? `<div style="font:600 .8rem var(--font-body);color:var(--text);margin-bottom:6px">${NODES[inspected].icon} ${NODES[inspected].name}</div>${cs.nodes[inspected]}` : `<p style="font:.82rem var(--font-body);color:var(--muted)">${mobile ? tr('Tap a server’s label to inspect it.', 'Tippe auf das Etikett eines Servers, um ihn zu untersuchen.') : tr('Click a server (or its label) to inspect it.', 'Klick einen Server (oder sein Etikett) an, um ihn zu untersuchen.')}</p>`}
      <div class="btn-row" style="margin-top:12px"><button class="btn small orange" id="d-accuse" ${selected ? '' : 'disabled'}>🎯 ${selected ? tr(`Accuse: ${NODES[selected].name}`, `Beschuldigen: ${NODES[selected].name}`) : tr('Inspect a server first', 'Erst einen Server untersuchen')}</button></div>
      <div id="d-feedback" style="margin-top:8px;font:.82rem var(--font-body)"></div>`;
    const acc = $('#d-accuse', P);
    if (acc) acc.onclick = accuse;
  }
  function inspect(k) {
    if (state !== 'investigate') return;
    sfx.play('click');
    if (!objs[k].seen) { objs[k].seen = true; clues++; set('d-clues', String(clues)); }
    selected = k;
    burst(scene, V(k).add(new THREE.Vector3(0, 3, 0)), NODES[k].color, 8);
    renderPanel(k);
  }
  function accuse() {
    if (state !== 'investigate' || !selected) return;
    if (selected !== cs.culprit) {
      wrongs++; totalWrong++; sfx.play('bad'); flag(cs.card);
      score = Math.max(0, score - 40);
      set('d-score', String(score));
      $('#d-feedback', P).innerHTML = `<span style="color:var(--danger)">✗ ${tr('This server behaves correctly. Compare what each one says — where does the wrong data first appear?', 'Dieser Server verhält sich korrekt. Vergleiche, was jeder sagt – wo taucht die falsche Information zuerst auf?')}</span>`;
      return;
    }
    sfx.play('ok');
    state = 'fix';
    const opts = shuffle(cs.fixes.map((f, i) => ({ f, ok: i === 0 })));
    P.innerHTML = `<h4>✓ ${tr('Culprit found', 'Verursacher gefunden')}: ${NODES[cs.culprit].icon} ${NODES[cs.culprit].name}</h4><p style="color:var(--text);font:600 .92rem var(--font-body)">${tr('How do you fix it?', 'Wie behebst du es?')}</p>
      <div style="display:grid;gap:8px">${opts.map((o, i) => `<button class="hop-btn" style="justify-content:flex-start;text-align:left" data-i="${i}">${esc(o.f)}</button>`).join('')}</div><div id="d-feedback" style="margin-top:8px;font:.82rem var(--font-body)"></div>`;
    P.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => {
      const o = opts[+b.dataset.i];
      if (!o.ok) { wrongs++; totalWrong++; sfx.play('bad'); flag(cs.card); b.disabled = true; b.style.borderColor = 'var(--danger)'; $('#d-feedback', P).innerHTML = `<span style="color:var(--yellow)">${tr('That wouldn’t solve the root cause. Look at the evidence again.', 'Das würde die eigentliche Ursache nicht beheben. Schau dir die Spuren noch mal an.')}</span>`; return; }
      solved();
    }));
  }
  function solved() {
    state = 'solved';
    const pts = Math.max(50, 200 - clues * 15 - wrongs * 40);
    score += pts;
    sfx.play('win');
    burst(scene, V(cs.culprit).add(new THREE.Vector3(0, 3, 0)), 0x5cf2c2, 24);
    store.award(`dnsdet-${cs.id}`, 10, tr('Case solved', 'Fall gelöst'));
    const last = ci >= cases.length - 1;
    if (last) { store.setBest('dnsdet', score); store.award('dnsdet-win', 40, tr('Master DNS detective', 'Meister-DNS-Detektiv')); if (!totalWrong) store.award('dnsdet-perfect', 30, tr('Flawless detective', 'Fehlerloser Detektiv')); }
    overlay.innerHTML = `<div class="panel"><span class="tag mint">${tr('case closed', 'Fall abgeschlossen')} +${pts}</span><h2 style="margin-top:14px">${esc(cs.title)}</h2><p>${esc(cs.why)}</p>
      ${last ? `<div class="big-score">${score}</div><p>${tr(`All ${cases.length} cases solved.`, `Alle ${cases.length} Fälle gelöst.`)}${totalWrong ? ' ' + tr('Your wrong guesses are now flashcards.', 'Deine falschen Vermutungen sind jetzt Karteikarten.') : ''}</p>` : ''}
      <div class="btn-row">${last ? `<button class="btn" id="d-again">${tr('Play again', 'Noch mal')}</button><a class="btn ghost" href="#/learn/dns">${tr('DNS lesson', 'Lektion DNS')}</a>` : `<button class="btn" id="d-next">${tr('Next case →', 'Nächster Fall →')}</button>`}</div></div>`;
    overlay.style.display = 'grid';
    if (last) $('#d-again', overlay).onclick = () => { ci = 0; score = 0; totalWrong = 0; startCase(); };
    else $('#d-next', overlay).onclick = () => { ci++; startCase(); };
  }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">${tr('3D · investigation', '3D · Ermittlung')}</span><h2 style="margin-top:14px">${tr('DNS Detective', 'DNS-Detektiv')}</h2>
    <p>${tr('“It’s always DNS.” Seven real-world outages — find out which part of the chain is lying, and how to fix it.', '„Es ist immer DNS.“ Sieben echte Störungen – finde heraus, welcher Teil der Kette lügt und wie man es behebt.')}</p>
    <div class="how"><div>🔍 ${tr('Inspect servers: caches, zone files, registry data, dig output.', 'Untersuche Server: Caches, Zonendateien, Registry-Daten, dig-Ausgaben.')}</div><div>🎯 ${tr('Accuse the server where the wrong information comes from.', 'Beschuldige den Server, von dem die falsche Information stammt.')}</div><div>🛠 ${tr('Pick the fix that removes the root cause.', 'Wähle die Lösung, die die eigentliche Ursache behebt.')}</div><div>⭐ ${tr('Fewer clues and no wrong guesses = more points.', 'Weniger Spuren und keine Fehlversuche = mehr Punkte.')}</div></div>
    <div class="btn-row"><button class="btn" id="d-start">${tr('Open the first case ▶', 'Ersten Fall öffnen ▶')}</button><a class="btn ghost" href="#/learn/dns">${tr('Learn first', 'Erst lernen')}</a></div>
    ${store.best('dnsdet') ? `<p style="margin:16px 0 0;font-size:.85rem">${tr('Your best', 'Dein Rekord')}: <b style="color:var(--mint)">${store.best('dnsdet')}</b></p>` : ''}</div>`;
  $('#d-start', overlay).onclick = () => { sfx.play('click'); startCase(); };

  // click on server meshes (taps that aren't orbit drags)
  const cam = orbit(canvas, { theta: 0.15, phi: 1.05, dist: mobile ? 1.5 : 1, phiMin: 0.4, phiMax: 1.35, distMin: 0.6, distMax: 1.8 });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerup', (e) => {
    if (cam.moved > 8) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) inspect(hit.object.userData.node);
  });
  onCleanup(() => labels.forEach((l) => l.el.remove()));

  const look = new THREE.Vector3(1, 2, 0);
  loop((dt, t) => {
    if (state === 'intro') cam.theta += dt * 0.08;
    Object.entries(objs).forEach(([k, o]) => {
      const sel = k === selected && state !== 'intro';
      o.ring.material.opacity = sel ? 0.9 : o.seen ? 0.35 : 0;
      o.ring.rotation.z += dt * (sel ? 1.5 : 0.3);
      o.glow.material.opacity = sel ? 0.45 + Math.sin(t * 4) * 0.1 : 0.2;
      o.mat.emissiveIntensity = sel ? 0.3 : 0.08;
    });
    const d = 40 * cam.dist;
    const off = new THREE.Vector3(Math.sin(cam.phi) * Math.sin(cam.theta), Math.cos(cam.phi), Math.sin(cam.phi) * Math.cos(cam.theta)).multiplyScalar(d);
    camera.position.lerp(look.clone().add(off), 0.08);
    camera.lookAt(look);
    if (!mobile) camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, canvas.clientWidth * 0.12, 0, canvas.clientWidth, canvas.clientHeight); else camera.clearViewOffset();
    render();
    labels.forEach((l) => { const s = toScreen(l.pos, camera, canvas); l.el.style.opacity = s.behind || state === 'intro' ? '0' : '1'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; });
  }, canvas);
}
