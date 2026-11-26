import { h, $, $$, loop, setupCanvas, pointerPos, widgetShell, COLORS, store, sleep, ipToInt, intToIp, subnetInfo, maskFromPrefix, ipClass, rand, pick, inSubnet, esc } from '../core.js';
import { tr } from '../i18n.js';
// ipClass() returns English labels; German display names:
const CLASS_DE = { 'Private (RFC 1918)': 'Privat (RFC 1918)', Loopback: 'Loopback', 'Link-local (APIPA)': 'Link-Local (APIPA)', 'Carrier-grade NAT': 'Carrier-Grade-NAT', Multicast: 'Multicast', Reserved: 'Reserviert', '"This" network': '„Dieses“ Netz', Public: 'Öffentlich' };

/* =========================================================
   Subnet calculator with live bit view
   ========================================================= */
/** Compact label for a subnet in the range bar: keep only the octets that vary at this prefix. */
function shortLabel(net, p) {
  const parts = intToIp(net).split('.');
  const keep = p >= 24 ? 1 : p >= 16 ? 2 : p >= 8 ? 3 : 4;
  return (keep < 4 ? '…' : '') + parts.slice(4 - keep).join('.') + '/' + p;
}

export function subnet(mount) {
  const w = widgetShell('subnet.calc', { foot: '<span id="sn-foot"></span>' });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.innerHTML = `
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:end;margin-bottom:18px">
      <div class="field" style="flex:2;min-width:180px"><label>${tr('IP address', 'IP-Adresse')}</label><input class="input" id="sn-ip" value="192.168.10.77"></div>
      <div class="field" style="flex:3;min-width:220px"><label>${tr('Prefix length', 'Präfixlänge')}: <span id="sn-plab" style="color:var(--mint)">/26</span></label><input type="range" id="sn-p" min="0" max="32" value="26"></div>
    </div>
    <div class="bits" id="sn-bits"></div>
    <div class="subnet-bar" id="sn-bar"></div>
    <div class="kv" id="sn-kv"></div>`;
  const ipIn = $('#sn-ip', body), pIn = $('#sn-p', body);
  const bitsEl = $('#sn-bits', body);
  bitsEl.innerHTML = [0, 1, 2, 3].map((o) => `<div class="octet"><div class="row">${[0, 1, 2, 3, 4, 5, 6, 7].map((b) => `<span class="bit" data-i="${o * 8 + b}" style="display:grid;place-items:center;cursor:default">0</span>`).join('')}</div><div class="dec" style="font-size:1.1rem">0</div></div>`).join('');

  function render() {
    const ip = ipToInt(ipIn.value);
    ipIn.classList.toggle('bad', ip === null);
    const p = +pIn.value;
    $('#sn-plab', body).textContent = '/' + p;
    if (ip === null) return;
    const s = subnetInfo(ip, p);
    $$('.bit', bitsEl).forEach((b) => {
      const i = +b.dataset.i;
      const on = (ip >>> (31 - i)) & 1;
      b.textContent = on; b.classList.toggle('on', !!on); b.classList.toggle('net', i < p);
      if (!on) b.style.borderColor = i < p ? 'rgba(139,123,255,.6)' : ''; else b.style.borderColor = '';
    });
    $$('.dec', bitsEl).forEach((d, o) => (d.textContent = (ip >>> (24 - o * 8)) & 255));
    // range bar: position of the subnet within its parent /p-4 block (or /0..)
    const parentP = Math.max(0, p - 3);
    const parent = subnetInfo(ip, parentP);
    const count = 2 ** (p - parentP);
    const idx = (s.network - parent.network) / s.total;
    const cols = [COLORS.violet, '#6a5ee0', '#5649c4', '#463aa8'];
    $('#sn-bar', body).innerHTML = Array.from({ length: count }, (_, i) =>
      `<div style="flex:1;background:${i === idx ? COLORS.mint : cols[i % 4] + '55'};color:${i === idx ? '#04110c' : COLORS.dim}">${count <= 8 ? shortLabel(parent.network + i * s.total, p) : i === idx ? 'you' : ''}</div>`).join('');
    const kv = [
      [tr('Network', 'Netz'), intToIp(s.network) + '/' + p],
      [tr('Subnet mask', 'Subnetzmaske'), intToIp(s.mask)],
      ['Wildcard', intToIp(~s.mask >>> 0)],
      ['Broadcast', p >= 31 ? tr('— (none)', '— (keiner)') : intToIp(s.broadcast)],
      [tr('First host', 'Erster Host'), intToIp(s.first)],
      [tr('Last host', 'Letzter Host'), intToIp(s.last)],
      [tr('Addresses', 'Adressen'), s.total.toLocaleString('en-US')],
      [tr('Usable hosts', 'Nutzbare Hosts'), s.hosts.toLocaleString('en-US')],
    ];
    $('#sn-kv', body).innerHTML = kv.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
    $('#sn-foot', w).innerHTML = `<span class="tag ${ipClass(ip).startsWith('Public') ? 'orange' : 'mint'}">${tr(ipClass(ip), CLASS_DE[ipClass(ip)])}</span> <span>${tr(`bar shows this /${p} among its ${count} siblings inside ${intToIp(parent.network)}/${parentP}`, `Balken: dieses /${p} unter seinen ${count} Geschwistern in ${intToIp(parent.network)}/${parentP}`)}</span>`;
  }
  ipIn.addEventListener('input', render);
  pIn.addEventListener('input', () => { render(); if (+pIn.value === 30) store.award('subnet-30', 5, tr('Found the point-to-point /30', 'Das Punkt-zu-Punkt-/30 gefunden')); });
  render();
}

/* =========================================================
   Subnetting practice — random problems
   ========================================================= */
export function subnetPractice(mount) {
  const w = widgetShell('subnet.practice', { controls: `<span class="tag mint" id="sp-streak">${tr('streak', 'Serie')} 0</span>`, foot: `<span id="sp-foot">${tr('Tip: find the block size (256 − mask octet) first.', 'Tipp: Erst die Blockgröße finden (256 − Masken-Oktett).')}</span>` });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  let streak = 0, cur;
  function next() {
    const p = rand(18, 30);
    const ip = (rand(1, 223) * 2 ** 24 + rand(0, 255) * 2 ** 16 + rand(0, 255) * 256 + rand(1, 254)) >>> 0;
    cur = { ip, p, s: subnetInfo(ip, p) };
    body.innerHTML = `<p style="color:var(--text);font-size:1.15rem;margin-bottom:16px">Host <code style="font-size:1.05rem">${intToIp(ip)}/${p}</code> — ${tr('fill in', 'ausfüllen')}:</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div class="field"><label>${tr('Network address', 'Netzadresse')}</label><input class="input" data-k="net" placeholder="a.b.c.d"></div>
        <div class="field"><label>${tr('Broadcast address', 'Broadcastadresse')}</label><input class="input" data-k="bc" placeholder="a.b.c.d"></div>
        <div class="field"><label>${tr('Usable hosts', 'Nutzbare Hosts')}</label><input class="input" data-k="hosts" placeholder="${tr('number', 'Zahl')}"></div>
      </div>
      <div class="btn-row" style="margin-top:16px"><button class="btn small" id="sp-check">${tr('Check', 'Prüfen')}</button><button class="btn small ghost" id="sp-reveal">${tr('Reveal', 'Auflösen')}</button><button class="btn small ghost" id="sp-next">${tr('New problem', 'Neue Aufgabe')}</button></div>
      <div id="sp-res" style="margin-top:12px"></div>`;
    $('#sp-check', body).onclick = check;
    $('#sp-reveal', body).onclick = () => reveal(true);
    $('#sp-next', body).onclick = next;
    $$('input', body).forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && check()));
  }
  function reveal(giveUp) {
    const { s, p } = cur;
    $('#sp-res', body).innerHTML = `<div class="kv"><div><small>${tr('Network', 'Netz')}</small><b>${intToIp(s.network)}</b></div><div><small>Broadcast</small><b>${intToIp(s.broadcast)}</b></div><div><small>Hosts</small><b>${s.hosts}</b></div><div><small>${tr('Mask', 'Maske')}</small><b>${intToIp(s.mask)}</b></div></div>`;
    if (giveUp) { streak = 0; $('#sp-streak', w).textContent = `${tr('streak', 'Serie')} 0`; }
  }
  function check() {
    const { s } = cur;
    const get = (k) => $(`[data-k="${k}"]`, body);
    const okNet = ipToInt(get('net').value) === s.network;
    const okBc = ipToInt(get('bc').value) === s.broadcast;
    const okH = +get('hosts').value.replace(/[ ,]/g, '') === s.hosts;
    get('net').classList.toggle('bad', !okNet); get('bc').classList.toggle('bad', !okBc); get('hosts').classList.toggle('bad', !okH);
    [['net', okNet], ['bc', okBc], ['hosts', okH]].forEach(([k, ok]) => { if (ok) get(k).style.borderColor = COLORS.mint; });
    if (okNet && okBc && okH) {
      streak++;
      $('#sp-streak', w).textContent = `${tr('streak', 'Serie')} ${streak}`;
      store.award(`subnet-win-${streak}`, 10, tr(`Correct! Streak ${streak}`, `Richtig! Serie ${streak}`));
      reveal(false);
      $('#sp-res', body).insertAdjacentHTML('afterbegin', `<p style="color:var(--mint);font-weight:600">✓ ${tr('All correct — next one in a moment…', 'Alles richtig – gleich kommt die nächste …')}</p>`);
      setTimeout(next, 1600);
    } else {
      body.classList.add('shake'); setTimeout(() => body.classList.remove('shake'), 400);
    }
  }
  next();
}

/* =========================================================
   Switch MAC learning + ARP
   ========================================================= */
export function switchSim(mount) {
  const hosts = [
    { n: 'A', mac: 'aa:01', ip: '192.168.1.10', port: 1 },
    { n: 'B', mac: 'bb:02', ip: '192.168.1.20', port: 2 },
    { n: 'C', mac: 'cc:03', ip: '192.168.1.30', port: 3 },
    { n: 'D', mac: 'dd:04', ip: '192.168.1.40', port: 4 },
  ];
  const w = widgetShell('switch.sim', {
    controls: `<label class="mono" style="font-size:.75rem;color:var(--muted)">${tr('from', 'von')}</label><div class="seg" id="sw-from">${hosts.map((x, i) => `<button class="${i === 0 ? 'on' : ''}" data-i="${i}">${x.n}</button>`).join('')}</div>
      <label class="mono" style="font-size:.75rem;color:var(--muted)">${tr('to', 'an')}</label><div class="seg" id="sw-to">${hosts.map((x, i) => `<button class="${i === 2 ? 'on' : ''}" data-i="${i}">${x.n}</button>`).join('')}</div>`,
    foot: `<button class="btn small" id="sw-send">${tr('Send frame', 'Rahmen senden')}</button><button class="btn small violet" id="sw-arp">${tr('ARP then send', 'Erst ARP, dann senden')}</button><button class="btn small ghost" id="sw-clear">${tr('Clear tables', 'Tabellen leeren')}</button><span id="sw-msg"></span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  body.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(200px,1fr)">
    <div style="position:relative"><canvas></canvas></div>
    <div style="border-left:1px solid var(--line);padding:16px;display:flex;flex-direction:column;gap:14px">
      <div><h4 class="mono" style="font-size:.7rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">${tr('Switch MAC table', 'MAC-Tabelle des Switches')}</h4>
      <table class="mini-table"><thead><tr><th>MAC</th><th>Port</th></tr></thead><tbody id="sw-mac"><tr><td colspan="2" style="color:var(--muted)">${tr('empty', 'leer')}</td></tr></tbody></table></div>
      <div><h4 class="mono" style="font-size:.7rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">${tr('ARP cache on', 'ARP-Cache von')} <span id="sw-arpn">A</span></h4>
      <table class="mini-table"><thead><tr><th>IP</th><th>MAC</th></tr></thead><tbody id="sw-arpt"></tbody></table></div>
    </div></div>`;
  if (window.innerWidth < 700) body.firstElementChild.style.gridTemplateColumns = '1fr';
  const canvas = $('canvas', body);
  const { ctx, size } = setupCanvas(canvas, 0.62, 300);
  const macTable = new Map();
  const arp = hosts.map(() => new Map());
  let from = 0, to = 2, busy = false;
  const dots = []; // {from:{x,y}, to:{x,y}, t, dur, color, label, resolve}
  const flashHost = new Map();

  const posSwitch = () => ({ x: size.w / 2, y: size.h / 2 });
  const posHost = (i) => {
    const pos = [[0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]][i];
    return { x: pos[0] * size.w, y: pos[1] * size.h };
  };
  const travel = (a, b, color, label, dur = 0.7) => new Promise((resolve) => dots.push({ a, b, t: 0, dur, color, label, resolve }));

  function renderTables(flashMac) {
    $('#sw-mac', body).innerHTML = macTable.size
      ? [...macTable].map(([m, p]) => `<tr class="${m === flashMac ? 'flash' : ''}"><td>${m}</td><td>${p}</td></tr>`).join('')
      : `<tr><td colspan="2" style="color:var(--muted)">${tr('empty', 'leer')}</td></tr>`;
    $('#sw-arpn', body).textContent = hosts[from].n;
    const a = arp[from];
    $('#sw-arpt', body).innerHTML = a.size ? [...a].map(([ip, m]) => `<tr><td>${ip}</td><td>${m}</td></tr>`).join('') : `<tr><td colspan="2" style="color:var(--muted)">${tr('empty', 'leer')}</td></tr>`;
  }
  const msg = (t) => ($('#sw-msg', w).innerHTML = t);

  async function frame(si, di, broadcast = false, label = 'frame', color = COLORS.mint) {
    const sw = posSwitch();
    await travel(posHost(si), sw, color, label);
    const src = hosts[si];
    const learned = !macTable.has(src.mac);
    macTable.set(src.mac, src.port);
    renderTables(learned ? src.mac : null);
    const dmac = broadcast ? 'ff:ff' : hosts[di].mac;
    if (!broadcast && macTable.has(dmac)) {
      msg(`<span style="color:${COLORS.mint}">${tr('known', 'bekannt')}</span> → ${tr('forward only to port', 'nur an Port')} ${macTable.get(dmac)}`);
      await travel(sw, posHost(di), color, label);
      flashHost.set(di, { t: 1, ok: true });
    } else {
      msg(broadcast ? `<span style="color:${COLORS.yellow}">Broadcast</span> → ${tr('flood all other ports', 'an alle anderen Ports fluten')}` : `<span style="color:${COLORS.orange}">${tr('unknown', 'unbekannt')} ${dmac}</span> → ${tr('flood all other ports', 'an alle anderen Ports fluten')}`);
      await Promise.all(hosts.map((x, i) => i === si ? null : travel(sw, posHost(i), color, label).then(() => flashHost.set(i, { t: 1, ok: broadcast || i === di }))));
    }
  }

  async function send(withArp) {
    if (busy || from === to) { if (from === to) msg(tr('pick two different hosts', 'wähle zwei verschiedene Hosts')); return; }
    busy = true;
    const s = hosts[from], d = hosts[to];
    if (withArp && !arp[from].has(d.ip)) {
      msg(tr(`${s.n}: "Who has ${d.ip}? Tell ${s.ip}"`, `${s.n}: „Wer hat ${d.ip}? Sag es ${s.ip}“`));
      await frame(from, to, true, 'ARP?', COLORS.yellow);
      msg(tr(`${d.n}: "${d.ip} is at ${d.mac}"`, `${d.n}: „${d.ip} ist bei ${d.mac}“`));
      arp[to].set(s.ip, s.mac);
      await frame(to, from, false, 'ARP!', COLORS.violet);
      arp[from].set(d.ip, d.mac); renderTables();
      await sleep(300);
    } else if (withArp) msg(tr('already cached — no ARP needed', 'schon im Cache – kein ARP nötig'));
    await frame(from, to, false, 'data', COLORS.mint);
    if (macTable.size === 4) store.award('switch-full', 10, tr('Switch learned every MAC', 'Switch kennt jede MAC'));
    busy = false;
  }

  const segPick = (id, set) => $$(`#${id} button`, w).forEach((b) => b.addEventListener('click', () => {
    $$(`#${id} button`, w).forEach((x) => x.classList.toggle('on', x === b)); set(+b.dataset.i); renderTables();
  }));
  segPick('sw-from', (i) => (from = i));
  segPick('sw-to', (i) => (to = i));
  $('#sw-send', w).onclick = () => send(false);
  $('#sw-arp', w).onclick = () => send(true);
  $('#sw-clear', w).onclick = () => { if (busy) return; macTable.clear(); arp.forEach((a) => a.clear()); renderTables(); msg(tr('tables cleared', 'Tabellen geleert')); };
  renderTables();

  loop((dt) => {
    const W = size.w, H = size.h;
    ctx.clearRect(0, 0, W, H);
    const sw = posSwitch();
    hosts.forEach((x, i) => {
      const p = posHost(i);
      ctx.strokeStyle = 'rgba(160,175,220,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(sw.x, sw.y); ctx.stroke();
      // port label
      const mx = sw.x + (p.x - sw.x) * 0.22, my = sw.y + (p.y - sw.y) * 0.22;
      ctx.fillStyle = COLORS.muted; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('p' + x.port, mx, my - 8);
    });
    // switch
    ctx.fillStyle = '#16203a'; ctx.strokeStyle = COLORS.violet; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(sw.x - 50, sw.y - 22, 100, 44, 10); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = macTable.size > i ? COLORS.mint : '#2a3352'; ctx.fillRect(sw.x - 34 + i * 20, sw.y + 8, 10, 5); }
    ctx.fillStyle = COLORS.text; ctx.font = '600 12px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SWITCH', sw.x, sw.y - 4);
    hosts.forEach((x, i) => {
      const p = posHost(i);
      const f = flashHost.get(i);
      if (f) { f.t -= dt * 1.5; if (f.t <= 0) flashHost.delete(i); }
      ctx.fillStyle = i === from ? 'rgba(92,242,194,0.15)' : i === to ? 'rgba(255,122,69,0.12)' : '#121a30';
      ctx.strokeStyle = f ? (f.ok ? COLORS.mint : COLORS.danger) : i === from ? COLORS.mint : i === to ? COLORS.orange : 'rgba(160,175,220,0.35)';
      ctx.lineWidth = f ? 4 : 2;
      ctx.beginPath(); ctx.roundRect(p.x - 46, p.y - 28, 92, 56, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.font = '800 16px Bricolage Grotesque, sans-serif'; ctx.fillText('PC ' + x.n, p.x, p.y - 9);
      ctx.fillStyle = COLORS.muted; ctx.font = '10px JetBrains Mono'; ctx.fillText(x.mac, p.x, p.y + 9);
      if (f && !f.ok) { ctx.fillStyle = COLORS.danger; ctx.fillText(tr('drop (not me)', 'verwerfen (nicht für mich)'), p.x, p.y + 40); }
    });
    for (let k = dots.length - 1; k >= 0; k--) {
      const d = dots[k];
      d.t += dt / d.dur;
      const t = Math.min(1, d.t);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = d.a.x + (d.b.x - d.a.x) * e, y = d.a.y + (d.b.y - d.a.y) * e;
      ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.roundRect(x - 22, y - 10, 44, 20, 6); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#04110c'; ctx.font = '700 10px JetBrains Mono'; ctx.fillText(d.label, x, y + 1);
      if (d.t >= 1) { dots.splice(k, 1); d.resolve(); }
    }
  }, canvas);
}

/* =========================================================
   Longest prefix match trainer
   ========================================================= */
export function lpm(mount) {
  const routes = [
    { p: '0.0.0.0/0', via: '203.0.113.1', ifc: 'wan0', note: tr('default route', 'Default-Route') },
    { p: '10.0.0.0/8', via: '10.255.0.1', ifc: 'eth1' },
    { p: '10.20.0.0/16', via: '10.20.0.1', ifc: 'eth2' },
    { p: '10.20.30.0/24', via: tr('direct', 'direkt'), ifc: 'eth3' },
    { p: '10.20.30.128/25', via: '10.20.30.129', ifc: 'eth4' },
    { p: '172.16.0.0/12', via: '172.16.0.1', ifc: 'eth5' },
    { p: '192.168.0.0/16', via: '192.168.0.1', ifc: 'eth6' },
  ].map((r) => { const [a, b] = r.p.split('/'); return { ...r, net: ipToInt(a), len: +b }; });

  const w = widgetShell('router.lookup', {
    controls: `<button class="btn small violet" id="lpm-game">🎯 ${tr('Quiz me', 'Teste mich')}</button>`,
    foot: `<span id="lpm-foot">${tr('Type a destination — matching routes glow; the longest match wins.', 'Gib ein Ziel ein – passende Routen leuchten; der längste Treffer gewinnt.')}</span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.innerHTML = `<div class="field" style="margin-bottom:14px"><label>${tr('Destination IP', 'Ziel-IP')}</label><input class="input" id="lpm-ip" value="10.20.30.200"></div>
    <div class="tbl-wrap"><table class="mini-table" id="lpm-t"><thead><tr><th>${tr('Prefix', 'Präfix')}</th><th>Next Hop</th><th>Interface</th><th>${tr('Match?', 'Passt?')}</th></tr></thead><tbody></tbody></table></div>`;
  const tb = $('tbody', body), ipIn = $('#lpm-ip', body);
  let game = null; // {ip, answer, score, n}

  function render() {
    const ip = ipToInt(ipIn.value);
    ipIn.classList.toggle('bad', ip === null);
    let best = -1;
    if (ip !== null) routes.forEach((r, i) => { if (inSubnet(ip, r.net, r.len) && (best < 0 || r.len > routes[best].len)) best = i; });
    tb.innerHTML = routes.map((r, i) => {
      const m = ip !== null && inSubnet(ip, r.net, r.len);
      const show = !game;
      return `<tr data-i="${i}" class="${show && i === best ? 'hit' : ''}" style="cursor:${game ? 'pointer' : 'default'}">
        <td><b style="color:${show && m ? COLORS.text : COLORS.dim}">${r.p}</b> ${r.note ? `<span style="color:var(--muted)">(${r.note})</span>` : ''}</td><td>${r.via}</td><td>${r.ifc}</td>
        <td>${game ? '?' : m ? (i === best ? `<span style="color:${COLORS.violet}">◆ ${tr('best', 'beste')} /${r.len}</span>` : `<span style="color:${COLORS.dim}">✓ /${r.len}</span>`) : '<span style="color:var(--muted)">—</span>'}</td></tr>`;
    }).join('');
    if (!game && best >= 0) $('#lpm-foot', w).innerHTML = `→ ${tr('forward via', 'weiterleiten über')} <b style="color:${COLORS.mint}">${routes[best].ifc}</b> (${routes[best].via}) — ${tr('matched', 'Treffer')} ${routes[best].p}`;
    return best;
  }
  ipIn.addEventListener('input', () => { if (game) return; render(); });

  function round() {
    const pool = ['10.20.30.' + rand(1, 127), '10.20.30.' + rand(129, 254), '10.20.' + rand(31, 250) + '.' + rand(1, 254), '10.' + rand(21, 200) + '.1.1', '172.' + rand(16, 31) + '.' + rand(0, 255) + '.9', '192.168.' + rand(0, 255) + '.7', pick(['8.8.8.8', '1.1.1.1', '93.184.215.14', '172.32.0.5', '11.0.0.1'])];
    const ipS = pick(pool);
    ipIn.value = ipS; ipIn.disabled = true;
    game.ip = ipToInt(ipS);
    game.answer = (() => { let b = -1; routes.forEach((r, i) => { if (inSubnet(game.ip, r.net, r.len) && (b < 0 || r.len > routes[b].len)) b = i; }); return b; })();
    render();
    $('#lpm-foot', w).innerHTML = `${tr('Round', 'Runde')} ${game.n + 1}/5 — ${tr('click the route the router will use', 'klick die Route, die der Router nimmt')} · ${tr('score', 'Punkte')} <b style="color:${COLORS.mint}">${game.score}</b>`;
  }
  tb.addEventListener('click', (e) => {
    if (!game) return;
    const tr = e.target.closest('tr'); if (!tr) return;
    const i = +tr.dataset.i;
    const ok = i === game.answer;
    if (ok) game.score++;
    tr.style.background = ok ? 'rgba(92,242,194,.18)' : 'rgba(255,84,112,.18)';
    if (!ok) $$('tr', tb)[game.answer].style.background = 'rgba(92,242,194,.18)';
    game.n++;
    setTimeout(() => {
      if (game.n >= 5) {
        const s = game.score; game = null; ipIn.disabled = false;
        render();
        $('#lpm-foot', w).innerHTML = `${tr('Finished', 'Fertig')}: <b style="color:${COLORS.mint}">${s}/5</b> ${tr('correct', 'richtig')}.`;
        if (s >= 4) store.award('lpm-quiz', 20, tr('Routing table master', 'Routingtabellen-Meister'));
        $('#lpm-game', w).textContent = `🎯 ${tr('Quiz me', 'Teste mich')}`;
      } else round();
    }, 700);
  });
  $('#lpm-game', w).onclick = () => {
    if (game) return;
    game = { score: 0, n: 0 };
    $('#lpm-game', w).textContent = `🎯 ${tr('Playing…', 'Läuft …')}`;
    round();
  };
  render();
}

/* =========================================================
   Dijkstra / link-state playground
   ========================================================= */
export function dijkstra(mount) {
  const w = widgetShell('ospf.spf', { foot: '<span id="dj-foot"></span>' });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  body.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1.7fr) minmax(190px,1fr)" class="dj-grid"><div><canvas></canvas></div>
    <div style="border-left:1px solid var(--line);padding:14px"><h4 class="mono" style="font-size:.7rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">${tr('Routing table of', 'Routingtabelle von')} <span id="dj-src">R1</span></h4>
    <table class="mini-table"><thead><tr><th>${tr('Dest', 'Ziel')}</th><th>${tr('Cost', 'Kosten')}</th><th>Next Hop</th></tr></thead><tbody id="dj-t"></tbody></table></div></div>`;
  if (window.innerWidth < 700) $('.dj-grid', body).style.gridTemplateColumns = '1fr';
  const canvas = $('canvas', body);
  const { ctx, size } = setupCanvas(canvas, 0.62, 300);
  const nodes = [[0.1, 0.5], [0.3, 0.18], [0.3, 0.82], [0.55, 0.5], [0.75, 0.18], [0.75, 0.82], [0.92, 0.5]].map(([x, y], i) => ({ x, y, n: 'R' + (i + 1) }));
  const edges = [[0, 1, 2], [0, 2, 5], [1, 2, 1], [1, 3, 4], [2, 3, 2], [1, 4, 7], [3, 4, 1], [3, 5, 3], [2, 5, 8], [4, 6, 2], [5, 6, 4], [4, 5, 1]].map(([a, b, c]) => ({ a, b, c, cut: false }));
  const COSTS = [1, 2, 3, 5, 8, 10];
  let src = 0, dst = 6, res, hoverE = -1, hoverN = -1;

  function run() {
    const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false);
    dist[src] = 0;
    for (let k = 0; k < nodes.length; k++) {
      let u = -1;
      nodes.forEach((_, i) => { if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i; });
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true;
      edges.forEach((e) => {
        if (e.cut) return;
        const v = e.a === u ? e.b : e.b === u ? e.a : -1;
        if (v >= 0 && dist[u] + e.c < dist[v]) { dist[v] = dist[u] + e.c; prev[v] = u; }
      });
    }
    const nextHop = (v) => { if (prev[v] < 0) return null; let x = v; while (prev[x] !== src) x = prev[x]; return x; };
    res = { dist, prev };
    $('#dj-src', body).textContent = nodes[src].n;
    $('#dj-t', body).innerHTML = nodes.map((n, i) => i === src ? '' : `<tr class="${i === dst ? 'hit' : ''}"><td>${n.n}</td><td>${dist[i] === Infinity ? '∞' : dist[i]}</td><td>${dist[i] === Infinity ? '<span style="color:var(--danger)">unreachable</span>' : nodes[nextHop(i)].n}</td></tr>`).join('');
    const path = []; for (let x = dst; x >= 0; x = prev[x]) path.unshift(nodes[x].n);
    $('#dj-foot', w).innerHTML = res.dist[dst] === Infinity
      ? `<span style="color:${COLORS.danger}">${nodes[dst].n} ${tr('unreachable!', 'nicht erreichbar!')}</span> · ${tr('click links to change cost, shift-click / long-press to cut', 'Links anklicken ändert Kosten, Shift-Klick / lange drücken kappt')}`
      : `${tr('shortest', 'kürzester Weg')} ${nodes[src].n}→${nodes[dst].n}: <b style="color:${COLORS.mint}">${path.join(' → ')}</b> (${tr('cost', 'Kosten')} ${res.dist[dst]}) · <span style="color:${COLORS.muted}">${tr('click a link to change its cost · shift-click to cut · click a router: source, right-click: destination', 'Link anklicken: Kosten ändern · Shift-Klick: kappen · Router anklicken: Quelle, Rechtsklick: Ziel')}</span>`;
  }
  const P = (n) => ({ x: n.x * size.w, y: n.y * size.h });
  const segD = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  function hit(p) {
    hoverN = nodes.findIndex((n) => Math.hypot(P(n).x - p.x, P(n).y - p.y) < 20);
    hoverE = -1;
    if (hoverN < 0) { let best = 10; edges.forEach((e, i) => { const d = segD(p, P(nodes[e.a]), P(nodes[e.b])); if (d < best) { best = d; hoverE = i; } }); }
  }
  canvas.addEventListener('pointermove', (e) => { hit(pointerPos(canvas, e)); canvas.style.cursor = hoverN >= 0 || hoverE >= 0 ? 'pointer' : 'default'; });
  let pressT = 0;
  canvas.addEventListener('pointerdown', () => (pressT = performance.now()));
  canvas.addEventListener('click', (e) => {
    hit(pointerPos(canvas, e));
    const long = performance.now() - pressT > 450;
    if (hoverN >= 0) { if (hoverN === dst) dst = src; src = hoverN; }
    else if (hoverE >= 0) {
      const ed = edges[hoverE];
      if (e.shiftKey || long) ed.cut = !ed.cut;
      else { ed.cut = false; ed.c = COSTS[(COSTS.indexOf(ed.c) + 1) % COSTS.length] ?? 1; }
      store.award('dijkstra-edit', 10, tr('You changed the topology', 'Du hast die Topologie geändert'));
    }
    run();
  });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); hit(pointerPos(canvas, e)); if (hoverN >= 0 && hoverN !== src) { dst = hoverN; run(); } });
  run();

  loop((dt, t) => {
    ctx.clearRect(0, 0, size.w, size.h);
    const onPath = new Set(); for (let x = dst; res.prev[x] >= 0; x = res.prev[x]) onPath.add(x + ':' + res.prev[x]);
    const inTree = new Set(); nodes.forEach((_, v) => { if (res.prev[v] >= 0) inTree.add(v + ':' + res.prev[v]); });
    edges.forEach((e, i) => {
      const a = P(nodes[e.a]), b = P(nodes[e.b]);
      const key1 = e.a + ':' + e.b, key2 = e.b + ':' + e.a;
      const path = onPath.has(key1) || onPath.has(key2);
      const tree = inTree.has(key1) || inTree.has(key2);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.setLineDash(e.cut ? [4, 6] : []);
      ctx.strokeStyle = e.cut ? 'rgba(255,84,112,.5)' : path ? COLORS.mint : tree ? 'rgba(139,123,255,.7)' : i === hoverE ? COLORS.orange : 'rgba(160,175,220,.22)';
      ctx.lineWidth = path ? 4 : i === hoverE ? 3 : 2;
      if (path) { ctx.shadowColor = COLORS.mint; ctx.shadowBlur = 12; }
      ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.fillStyle = '#0b1020'; ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.cut ? COLORS.danger : 'rgba(160,175,220,.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = e.cut ? COLORS.danger : COLORS.yellow; ctx.font = '700 11px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.cut ? '✕' : e.c, mx, my + 0.5);
      if (path) { // moving packet
        const from = res.prev[e.a] === e.b ? b : a, to = from === a ? b : a;
        const k = (t * 0.9) % 1;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, 3, 0, Math.PI * 2); ctx.fill();
      }
    });
    nodes.forEach((n, i) => {
      const p = P(n);
      ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = i === src ? COLORS.mint : i === dst ? COLORS.orange : '#141c34'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = i === hoverN ? '#fff' : res.dist[i] === Infinity ? COLORS.danger : 'rgba(139,123,255,.8)'; ctx.stroke();
      ctx.fillStyle = i === src || i === dst ? '#04110c' : COLORS.text; ctx.font = '700 11px JetBrains Mono';
      ctx.fillText(n.n, p.x, p.y);
      if (i !== src) { ctx.fillStyle = COLORS.muted; ctx.font = '10px JetBrains Mono'; ctx.fillText(res.dist[i] === Infinity ? '∞' : 'd=' + res.dist[i], p.x, p.y + 30); }
    });
  }, canvas);
}
