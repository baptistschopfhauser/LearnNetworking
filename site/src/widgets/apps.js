import { $, $$, loop, setupCanvas, widgetShell, COLORS, store, sleep, esc, onCleanup } from '../core.js';
import { tr } from '../i18n.js';

/* small canvas "message bus" helper shared by DNS and NAT diagrams */
function makeStage(canvas, size) {
  const dots = [];
  const travel = (a, b, color, label, dur = 0.8) => new Promise((resolve) => dots.push({ a, b, t: 0, dur, color, label, resolve }));
  const drawDots = (ctx, dt) => {
    for (let k = dots.length - 1; k >= 0; k--) {
      const d = dots[k];
      d.t += dt / d.dur;
      const t = Math.min(1, d.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const a = typeof d.a === 'function' ? d.a() : d.a, b = typeof d.b === 'function' ? d.b() : d.b;
      const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
      ctx.font = '700 10px JetBrains Mono';
      const tw = Math.max(40, ctx.measureText(d.label).width + 14);
      ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.roundRect(x - tw / 2, y - 10, tw, 20, 6); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#04110c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.label, x, y + 1);
      if (d.t >= 1) { dots.splice(k, 1); d.resolve(); }
    }
  };
  return { travel, drawDots, dots };
}
function box(ctx, x, y, w, hgt, title, sub, stroke, fill = '#121a30', glow = false) {
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
  if (glow) { ctx.shadowColor = stroke; ctx.shadowBlur = 18; }
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - hgt / 2, w, hgt, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text; ctx.font = '700 13px Bricolage Grotesque, sans-serif'; ctx.fillText(title, x, y - (sub ? 8 : 0));
  if (sub) { ctx.fillStyle = COLORS.muted; ctx.font = '10px JetBrains Mono'; ctx.fillText(sub, x, y + 9); }
}

/* =========================================================
   DNS resolution walkthrough
   ========================================================= */
const ZONES = {
  'en.wikipedia.org': { tld: 'org', tldNs: 'a0.org.afilias-nst.info', auth: 'ns0.wikimedia.org', ip: '185.15.58.224', ttl: 600 },
  'www.example.com': { tld: 'com', tldNs: 'a.gtld-servers.net', auth: 'a.iana-servers.net', ip: '93.184.215.14', ttl: 3600, cname: 'example.com' },
  'packetcraft.dev': { tld: 'dev', tldNs: 'ns-tld1.charlestonroadregistry.com', auth: 'ns1.packetcraft.dev', ip: '203.0.113.42', ttl: 60 },
};
export function dns(mount) {
  const w = widgetShell('dns.resolve', {
    controls: `<select class="input" id="dns-name" style="width:auto;padding:6px 10px">${Object.keys(ZONES).map((k) => `<option>${k}</option>`).join('')}</select>
      <button class="btn small" id="dns-go">▶ ${tr('Resolve', 'Auflösen')}</button><button class="btn small ghost" id="dns-flush">${tr('Flush cache', 'Cache leeren')}</button>`,
    foot: `<span id="dns-foot">${tr('Choose a name and resolve it. Then resolve it again.', 'Wähle einen Namen und löse ihn auf. Dann noch einmal.')}</span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  body.innerHTML = `<canvas></canvas><div style="padding:14px;border-top:1px solid var(--line)"><div class="log" id="dns-log"><span class="t">; resolver log</span></div></div>`;
  const canvas = $('canvas', body);
  const { ctx, size } = setupCanvas(canvas, 0.45, 300);
  const stage = makeStage(canvas, size);
  const cache = new Map();
  let active = null, busy = false;
  const pos = {
    client: () => ({ x: size.w * 0.12, y: size.h * 0.5 }),
    resolver: () => ({ x: size.w * 0.38, y: size.h * 0.5 }),
    root: () => ({ x: size.w * 0.78, y: size.h * 0.17 }),
    tld: () => ({ x: size.w * 0.78, y: size.h * 0.5 }),
    auth: () => ({ x: size.w * 0.78, y: size.h * 0.83 }),
  };
  const logEl = $('#dns-log', body);
  const log = (html) => { logEl.insertAdjacentHTML('beforeend', `<div>${html}</div>`); logEl.scrollTop = 1e6; };

  async function resolve() {
    if (busy) return; busy = true;
    const name = $('#dns-name', w).value, z = ZONES[name];
    const t0 = performance.now();
    let steps = 0;
    const go = async (a, b, c, l, who) => { active = who; steps++; await stage.travel(pos[a], pos[b], c, l); };
    log(`<span class="v">$ dig ${name}</span>`);
    await go('client', 'resolver', COLORS.mint, `A? ${name}`, 'resolver');
    const hit = cache.get(name);
    if (hit && hit.exp > Date.now()) {
      const left = Math.round((hit.exp - Date.now()) / 1000);
      log(`<span class="g">${tr('cache HIT', 'Cache-TREFFER')}</span> — ${name} → ${z.ip} <span class="t">(${tr('TTL left', 'TTL übrig')} ${left}s)</span>`);
      await go('resolver', 'client', COLORS.mint, z.ip, 'client');
      $('#dns-foot', w).innerHTML = `<b style="color:${COLORS.mint}">${tr('Answered from cache', 'Aus dem Cache beantwortet')}</b> ${tr('in 2 messages — no trip to root/TLD/authoritative servers.', 'mit 2 Nachrichten – kein Weg zu Root-/TLD-/autoritativen Servern.')}`;
      store.award('dns-cache', 10, tr('Cache hit — instant answer', 'Cache-Treffer – sofortige Antwort'));
    } else {
      log(`<span class="o">${tr('cache MISS', 'Cache-FEHLTREFFER')}</span> — ${tr('start at the root', 'Start bei der Root')}`);
      await go('resolver', 'root', COLORS.yellow, `A? ${name}`, 'root');
      log(`<span class="t">Root</span> → ${tr(`"I don't know, but .${z.tld} is served by`, `„Weiß ich nicht, aber .${z.tld} betreut`)} <span class="y">${z.tldNs}</span>${tr('"', '“')} <span class="t">(${tr('referral', 'Verweis')}, NS)</span>`);
      await go('root', 'resolver', COLORS.violet, `NS .${z.tld}`, 'resolver');
      await go('resolver', 'tld', COLORS.yellow, `A? ${name}`, 'tld');
      log(`<span class="t">.${z.tld} TLD</span> → ${tr(`"${name.split('.').slice(-2).join('.')} is handled by`, `„${name.split('.').slice(-2).join('.')} betreut`)} <span class="y">${z.auth}</span>${tr('"', '“')} <span class="t">(${tr('referral', 'Verweis')})</span>`);
      await go('tld', 'resolver', COLORS.violet, `NS ${z.auth.split('.')[0]}…`, 'resolver');
      await go('resolver', 'auth', COLORS.yellow, `A? ${name}`, 'auth');
      if (z.cname) log(`<span class="t">${tr('authoritative', 'autoritativ')}</span> → ${name} ${tr('is a', 'ist ein')} <span class="v">CNAME</span> ${tr('for', 'für')} ${z.cname}, ${tr('which has', 'mit')} <span class="g">A ${z.ip}</span>`);
      else log(`<span class="t">${tr('authoritative', 'autoritativ')}</span> → <span class="g">${name}. ${z.ttl} IN A ${z.ip}</span> <span class="t">(${tr('aa flag set', 'aa-Flag gesetzt')})</span>`);
      await go('auth', 'resolver', COLORS.mint, `A ${z.ip}`, 'resolver');
      cache.set(name, { exp: Date.now() + z.ttl * 1000 });
      log(`<span class="t">${tr(`resolver caches it for ${z.ttl}s`, `Resolver speichert es ${z.ttl} s`)}</span>`);
      await go('resolver', 'client', COLORS.mint, z.ip, 'client');
      $('#dns-foot', w).innerHTML = `${tr('Resolved in', 'Aufgelöst mit')} <b style="color:${COLORS.orange}">${steps} ${tr('messages', 'Nachrichten')}</b> (${Math.round(performance.now() - t0)} ms ${tr('of animation', 'Animation')}). ${tr('Now press Resolve again ↻', 'Jetzt noch einmal Auflösen drücken ↻')}`;
      store.award('dns-full', 10, tr('Walked the DNS tree', 'Den DNS-Baum abgelaufen'));
    }
    log(`<span class="g">;; ANSWER: ${name} → ${z.ip}</span>`);
    active = null; busy = false;
  }
  $('#dns-go', w).onclick = resolve;
  $('#dns-flush', w).onclick = () => { cache.clear(); log('<span class="r">cache flushed</span>'); };

  loop((dt) => {
    ctx.clearRect(0, 0, size.w, size.h);
    const lines = [['client', 'resolver'], ['resolver', 'root'], ['resolver', 'tld'], ['resolver', 'auth']];
    ctx.strokeStyle = 'rgba(160,175,220,0.18)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5;
    lines.forEach(([a, b]) => { const p = pos[a](), q = pos[b](); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
    ctx.setLineDash([]);
    const bw = Math.min(150, size.w * 0.22);
    box(ctx, pos.client().x, pos.client().y, bw * 0.8, 52, tr('💻 You', '💻 Du'), 'Stub-Resolver', active === 'client' ? COLORS.mint : 'rgba(160,175,220,.35)', '#121a30', active === 'client');
    box(ctx, pos.resolver().x, pos.resolver().y, bw, 58, tr('Recursive resolver', 'Rekursiver Resolver'), `Cache: ${cache.size} ${tr(cache.size === 1 ? 'name' : 'names', cache.size === 1 ? 'Name' : 'Namen')}`, active === 'resolver' ? COLORS.mint : COLORS.violet, '#121a30', active === 'resolver');
    box(ctx, pos.root().x, pos.root().y, bw, 48, 'Root  .', tr('13 named letters', '13 benannte Buchstaben'), active === 'root' ? COLORS.yellow : 'rgba(160,175,220,.35)', '#121a30', active === 'root');
    box(ctx, pos.tld().x, pos.tld().y, bw, 48, tr('TLD server', 'TLD-Server'), '.com .org .dev …', active === 'tld' ? COLORS.yellow : 'rgba(160,175,220,.35)', '#121a30', active === 'tld');
    box(ctx, pos.auth().x, pos.auth().y, bw, 48, tr('Authoritative', 'Autoritativ'), tr('holds the records', 'hat die Einträge'), active === 'auth' ? COLORS.yellow : 'rgba(160,175,220,.35)', '#121a30', active === 'auth');
    stage.drawDots(ctx, dt);
  }, canvas);
}

/* =========================================================
   HTTP request builder
   ========================================================= */
export function http(mount) {
  const w = widgetShell('http.client', { foot: '<span id="http-foot"></span>' });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  const paths = ['/', '/api/users', '/admin', '/old-page', '/missing', '/api/crash', '/api/limited'];
  body.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end">
      <div class="field"><label>${tr('Method', 'Methode')}</label><select class="input" id="h-m">${['GET', 'POST', 'DELETE', 'HEAD'].map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div class="field" style="flex:1;min-width:150px"><label>${tr('Path', 'Pfad')}</label><select class="input" id="h-p">${paths.map((p) => `<option>${p}</option>`).join('')}</select></div>
      <div class="field"><label>${tr('Authorization', 'Autorisierung')}</label><select class="input" id="h-a"><option value="">${tr('none', 'keine')}</option><option value="user">Bearer user-token</option><option value="admin">Bearer admin-token</option></select></div>
      <button class="btn" id="h-send">${tr('Send', 'Senden')} ↵</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
      <div><div class="field"><label>${tr('Request (what goes on the wire)', 'Anfrage (was über die Leitung geht)')}</label></div><pre class="code" id="h-req" style="margin:6px 0 0;min-height:180px"></pre></div>
      <div><div class="field"><label>${tr('Response', 'Antwort')}</label></div><pre class="code" id="h-res" style="margin:6px 0 0;min-height:180px"><span class="c">// ${tr('press Send', 'Senden drücken')}</span></pre></div>
    </div>`;
  const seen = new Set();
  const get = () => ({ m: $('#h-m', body).value, p: $('#h-p', body).value, a: $('#h-a', body).value });
  const reqText = ({ m, p, a }) => {
    const hasBody = m === 'POST';
    return `<span class="k">${m}</span> <span class="s">${p}</span> HTTP/1.1
Host: shop.example
User-Agent: PacketCraft/1.0
Accept: ${p.startsWith('/api') ? 'application/json' : 'text/html'}${a ? `\nAuthorization: Bearer ${a}-token` : ''}${hasBody ? '\nContent-Type: application/json\nContent-Length: 18' : ''}
${hasBody ? '\n{"name":"Ada"}' : ''}`;
  };
  const updateReq = () => ($('#h-req', body).innerHTML = reqText(get()));
  $$('select', body).forEach((s) => s.addEventListener('change', updateReq));
  updateReq();
  let limited = 0;
  function respond({ m, p, a }) {
    const R = (code, text, headers, bodyStr = '') => ({ code, text, headers, body: bodyStr });
    if (p === '/') {
      if (m === 'GET' || m === 'HEAD') return R(200, 'OK', { 'Content-Type': 'text/html', 'Cache-Control': 'max-age=60' }, m === 'HEAD' ? '' : '<!doctype html>\n<h1>Welcome to the shop</h1>');
      return R(405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    }
    if (p === '/api/users') {
      if (m === 'GET') return R(200, 'OK', { 'Content-Type': 'application/json' }, '[{"id":1,"name":"Grace"},{"id":2,"name":"Linus"}]');
      if (m === 'POST') return a ? R(201, 'Created', { Location: '/api/users/3', 'Content-Type': 'application/json' }, '{"id":3,"name":"Ada"}') : R(401, 'Unauthorized', { 'WWW-Authenticate': 'Bearer' }, '{"error":"log in first"}');
      if (m === 'DELETE') return a === 'admin' ? R(204, 'No Content', {}) : R(403, 'Forbidden', { 'Content-Type': 'application/json' }, '{"error":"admins only"}');
      return R(200, 'OK', { 'Content-Type': 'application/json' });
    }
    if (p === '/admin') {
      if (!a) return R(401, 'Unauthorized', { 'WWW-Authenticate': 'Bearer realm="admin"' }, 'who are you?');
      if (a === 'user') return R(403, 'Forbidden', {}, 'I know who you are — and you are not an admin.');
      return R(200, 'OK', { 'Content-Type': 'text/html' }, '<h1>Admin dashboard</h1>');
    }
    if (p === '/old-page') return R(301, 'Moved Permanently', { Location: '/' });
    if (p === '/api/crash') return R(500, 'Internal Server Error', { 'Content-Type': 'text/plain' }, 'NullPointerException at Cart.checkout()');
    if (p === '/api/limited') { limited++; return limited > 2 ? R(429, 'Too Many Requests', { 'Retry-After': '30' }, 'slow down!') : R(200, 'OK', { 'X-RateLimit-Remaining': String(2 - limited) }, '{"ok":true}'); }
    return R(404, 'Not Found', { 'Content-Type': 'text/html' }, '<h1>404</h1> nothing here');
  }
  $('#h-send', body).onclick = async () => {
    const res = $('#h-res', body);
    res.innerHTML = `<span class="c">… ${tr('waiting for server', 'warte auf Server')}</span>`;
    await sleep(350);
    const r = respond(get());
    const col = r.code < 300 ? 's' : r.code < 400 ? 'k' : 'n';
    res.innerHTML = `HTTP/1.1 <span class="${col}">${r.code} ${r.text}</span>\nDate: ${new Date().toUTCString()}\nServer: nginx${Object.entries(r.headers).map(([k, v]) => `\n${k}: ${esc(v)}`).join('')}\n${r.body ? '\n' + esc(r.body) : ''}`;
    seen.add(r.code);
    $('#http-foot', w).innerHTML = `${tr('status codes discovered', 'entdeckte Statuscodes')}: ${[...seen].sort().map((c) => `<span class="tag ${c < 300 ? 'mint' : c < 400 ? 'violet' : 'orange'}">${c}</span>`).join(' ')} <span style="color:var(--muted)">— ${tr('find all 9', 'finde alle 9')}</span>`;
    if (seen.size >= 5) store.award('http-5', 10, tr('HTTP explorer', 'HTTP-Entdecker'));
    if (seen.size >= 9) store.award('http-9', 20, tr('Collected every status code', 'Alle Statuscodes gesammelt'));
  };
  $('#http-foot', w).innerHTML = `<span>${tr('Try different methods, paths and credentials to discover status codes.', 'Probier Methoden, Pfade und Zugangsdaten aus, um Statuscodes zu entdecken.')}</span>`;
}

/* =========================================================
   TLS 1.3 handshake + Diffie-Hellman toy
   ========================================================= */
const TLS_STEPS = [
  { from: 'c', msg: 'ClientHello', detail: tr('Supported TLS versions, cipher suites (e.g. TLS_AES_128_GCM_SHA256), a random nonce, the server name (SNI) and — new in 1.3 — a key share: the client’s ephemeral Diffie‑Hellman public value.', 'Unterstützte TLS-Versionen, Cipher Suites (z. B. TLS_AES_128_GCM_SHA256), eine Zufallszahl, der Servername (SNI) und – neu in 1.3 – ein Schlüsselanteil: der ephemere öffentliche Diffie-Hellman-Wert des Clients.'), eve: tr('Readable: SNI "bank.example", cipher list, key share (a public number — useless alone).', 'Lesbar: SNI „bank.example“, Cipher-Liste, Schlüsselanteil (eine öffentliche Zahl – allein nutzlos).'), enc: false },
  { from: 's', msg: 'ServerHello + KeyShare', detail: tr('Server picks the cipher suite and sends its own DH public value. Both sides now compute the same shared secret and derive handshake keys. From here on, everything is encrypted.', 'Der Server wählt die Cipher Suite und sendet seinen eigenen öffentlichen DH-Wert. Beide Seiten berechnen nun dasselbe Geheimnis und leiten Handshake-Schlüssel ab. Ab hier ist alles verschlüsselt.'), eve: tr('Readable: chosen cipher, server key share. Still can’t compute the secret.', 'Lesbar: gewählte Cipher, Schlüsselanteil des Servers. Das Geheimnis lässt sich trotzdem nicht berechnen.'), enc: false },
  { from: 's', msg: '{Certificate, CertVerify, Finished}', detail: tr('Encrypted: the certificate chain proving the server owns bank.example, a signature over the whole handshake with the certificate’s private key (proving possession), and a MAC over the transcript.', 'Verschlüsselt: die Zertifikatskette, die belegt, dass bank.example dem Server gehört, eine Signatur über den ganzen Handshake mit dem privaten Schlüssel des Zertifikats (Besitznachweis) und ein MAC über das Protokoll.'), eve: tr('🔒 Encrypted gibberish. (In TLS 1.2 the certificate was visible.)', '🔒 Verschlüsselter Zeichensalat. (In TLS 1.2 war das Zertifikat noch sichtbar.)'), enc: true },
  { from: 'c', msg: '{Finished}', detail: tr('Client verifies the chain up to a trusted root CA, checks the name and signature, then sends its own Finished MAC. Handshake done in 1 round trip.', 'Der Client prüft die Kette bis zu einer vertrauenswürdigen Root-CA, kontrolliert Name und Signatur und sendet dann sein eigenes Finished-MAC. Handshake fertig in 1 Rundreise.'), eve: tr('🔒 Encrypted.', '🔒 Verschlüsselt.'), enc: true },
  { from: 'c', msg: '{GET /account}', detail: tr('Application data flows, protected by AEAD encryption (confidentiality + integrity) with keys only the two endpoints know.', 'Anwendungsdaten fließen, geschützt durch AEAD-Verschlüsselung (Vertraulichkeit + Integrität) mit Schlüsseln, die nur die beiden Endpunkte kennen.'), eve: tr('🔒 Only sizes and timing leak.', '🔒 Nur Größen und Zeitpunkte verraten etwas.'), enc: true },
];
export function tls(mount) {
  const w = widgetShell('tls.1.3', {
    controls: `<div class="seg" id="tls-tab"><button class="on" data-t="hs">Handshake</button><button data-t="dh">${tr('Diffie‑Hellman toy', 'Diffie-Hellman-Spielzeug')}</button></div>`,
    foot: '<span id="tls-foot"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  let step = -1;
  function renderHS() {
    body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px">
      <div><svg viewBox="0 0 320 ${60 + TLS_STEPS.length * 46}" style="width:100%">
        <text x="50" y="20" text-anchor="middle" fill="${COLORS.text}" font-family="Bricolage Grotesque" font-weight="800">Browser</text>
        <text x="270" y="20" text-anchor="middle" fill="${COLORS.text}" font-family="Bricolage Grotesque" font-weight="800">bank.example</text>
        <line x1="50" y1="30" x2="50" y2="${50 + TLS_STEPS.length * 46}" stroke="${COLORS.line}" stroke-width="2"/>
        <line x1="270" y1="30" x2="270" y2="${50 + TLS_STEPS.length * 46}" stroke="${COLORS.line}" stroke-width="2"/>
        ${TLS_STEPS.map((s, i) => {
          const y = 50 + i * 46, [a, b] = s.from === 'c' ? [50, 270] : [270, 50];
          const c = i > step ? 'rgba(160,175,220,.15)' : s.enc ? COLORS.mint : COLORS.orange;
          return `<g opacity="${i > step ? 0.5 : 1}"><line x1="${a}" y1="${y}" x2="${b}" y2="${y + 18}" stroke="${c}" stroke-width="${i === step ? 3 : 2}"/>
            <circle cx="${b}" cy="${y + 18}" r="4" fill="${c}"/>
            <text x="160" y="${y + 4}" text-anchor="middle" fill="${i > step ? COLORS.muted : c}" font-family="JetBrains Mono" font-size="11" font-weight="600">${s.enc && i <= step ? '🔒 ' : ''}${s.msg}</text></g>`;
        }).join('')}
      </svg></div>
      <div>${step < 0 ? `<p>${tr('The TLS 1.3 handshake takes <strong>one round trip</strong>. Press <em>Next</em> to step through it and see what an eavesdropper on the café Wi‑Fi can read at each point.', 'Der TLS-1.3-Handshake braucht <strong>eine Rundreise</strong>. Drück <em>Weiter</em>, um ihn durchzugehen und zu sehen, was ein Lauscher im Café-WLAN an jeder Stelle lesen kann.')}</p>` : `
        <span class="tag ${TLS_STEPS[step].enc ? 'mint' : 'orange'}">${tr('step', 'Schritt')} ${step + 1}/${TLS_STEPS.length}</span>
        <h3 style="margin:12px 0 8px">${TLS_STEPS[step].msg}</h3><p>${TLS_STEPS[step].detail}</p>
        <div class="callout ${TLS_STEPS[step].enc ? '' : 'warn'}" style="margin:12px 0"><span class="ci">👁</span><div><p><b>${tr('Eavesdropper sees', 'Lauscher sieht')}:</b> ${TLS_STEPS[step].eve}</p></div></div>`}
        <div class="btn-row"><button class="btn small" id="tls-next">${step >= TLS_STEPS.length - 1 ? tr('↺ Restart', '↺ Von vorn') : tr('Next →', 'Weiter →')}</button></div></div></div>`;
    $('#tls-next', body).onclick = () => { step = step >= TLS_STEPS.length - 1 ? -1 : step + 1; if (step === TLS_STEPS.length - 1) store.award('tls-hs', 10, tr('Secure channel established', 'Sicherer Kanal steht')); renderHS(); };
    $('#tls-foot', w).textContent = tr('orange = plaintext on the wire · mint = encrypted', 'orange = Klartext auf der Leitung · mint = verschlüsselt');
  }
  const modpow = (b, e, m) => { let r = 1n, x = BigInt(b) % BigInt(m), k = BigInt(e); const M = BigInt(m); while (k > 0n) { if (k & 1n) r = (r * x) % M; x = (x * x) % M; k >>= 1n; } return Number(r); };
  function renderDH() {
    const p = 23, g = 5;
    body.innerHTML = `<p>${tr(`Public: prime <code>p = ${p}</code>, generator <code>g = ${g}</code>. Pick secrets — the eavesdropper sees only the public values. (Real TLS uses 256‑bit elliptic curves, not 23!)`, `Öffentlich: Primzahl <code>p = ${p}</code>, Generator <code>g = ${g}</code>. Wählt Geheimnisse – der Lauscher sieht nur die öffentlichen Werte. (Echtes TLS nutzt 256-Bit-Elliptische-Kurven, nicht 23!)`)}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
        <div class="card" style="padding:16px"><h3 style="color:var(--mint)">Alice</h3><div class="field"><label>${tr('secret', 'Geheimnis')} a = <b id="dh-av"></b></label><input type="range" id="dh-a" min="2" max="21" value="6"></div><p class="mono" style="margin-top:10px">A = g^a mod p = <b id="dh-A" style="color:var(--text)"></b></p><p class="mono">s = B^a mod p = <b id="dh-sa" style="color:var(--mint)"></b></p></div>
        <div class="card" style="padding:16px;border-color:rgba(255,84,112,.35)"><h3 style="color:var(--danger)">${tr('Eve (listening)', 'Eve (lauscht)')}</h3><p class="mono">${tr('sees', 'sieht')} p=${p}, g=${g}</p><p class="mono">A = <b id="dh-eA"></b>, B = <b id="dh-eB"></b></p><p style="font-size:.85rem">${tr(`To get s she must solve the <em>discrete logarithm</em>: find a such that ${g}^a mod ${p} = A. Easy for 23, infeasible for 2²⁵⁶.`, `Um s zu bekommen, muss sie den <em>diskreten Logarithmus</em> lösen: ein a finden mit ${g}^a mod ${p} = A. Leicht bei 23, unmöglich bei 2²⁵⁶.`)}</p></div>
        <div class="card" style="padding:16px"><h3 style="color:var(--violet)">Bob</h3><div class="field"><label>${tr('secret', 'Geheimnis')} b = <b id="dh-bv"></b></label><input type="range" id="dh-b" min="2" max="21" value="15"></div><p class="mono" style="margin-top:10px">B = g^b mod p = <b id="dh-B" style="color:var(--text)"></b></p><p class="mono">s = A^b mod p = <b id="dh-sb" style="color:var(--mint)"></b></p></div>
      </div>`;
    const upd = () => {
      const a = +$('#dh-a', body).value, b = +$('#dh-b', body).value;
      const A = modpow(g, a, p), B = modpow(g, b, p);
      $('#dh-av', body).textContent = a; $('#dh-bv', body).textContent = b;
      $('#dh-A', body).textContent = A; $('#dh-B', body).textContent = B; $('#dh-eA', body).textContent = A; $('#dh-eB', body).textContent = B;
      $('#dh-sa', body).textContent = modpow(B, a, p); $('#dh-sb', body).textContent = modpow(A, b, p);
      $('#tls-foot', w).innerHTML = `${tr('shared secret on both sides', 'gemeinsames Geheimnis auf beiden Seiten')}: <b style="color:${COLORS.mint}">${modpow(B, a, p)}</b> — ${tr('never sent over the network', 'nie über das Netz gesendet')}`;
    };
    $$('input', body).forEach((i) => i.addEventListener('input', () => { upd(); store.award('dh-toy', 10, tr('You agreed on a secret in public', 'Öffentlich ein Geheimnis vereinbart')); }));
    upd();
  }
  $$('#tls-tab button', w).forEach((b) => b.addEventListener('click', () => { $$('#tls-tab button', w).forEach((x) => x.classList.toggle('on', x === b)); b.dataset.t === 'hs' ? renderHS() : renderDH(); }));
  renderHS();
}

/* =========================================================
   NAT / PAT table simulator
   ========================================================= */
export function nat(mount) {
  const inside = [
    { n: '💻 Laptop', ip: '192.168.1.10' },
    { n: tr('📱 Phone', '📱 Handy'), ip: '192.168.1.11' },
    { n: '🎮 Console', ip: '192.168.1.12' },
  ];
  const PUB = '203.0.113.7';
  const flows = [
    { h: 0, dst: '93.184.215.14', dport: 443, label: 'Laptop → example.com:443' },
    { h: 1, dst: '93.184.215.14', dport: 443, label: tr('Phone → example.com:443', 'Handy → example.com:443') },
    { h: 2, dst: '198.51.100.5', dport: 3074, label: tr('Console → game:3074', 'Console → Spiel:3074') },
  ];
  const w = widgetShell('nat.router', {
    controls: flows.map((f, i) => `<button class="btn small ghost" data-f="${i}">${f.label}</button>`).join('') + `<button class="btn small orange" id="nat-in">☠ ${tr('Inbound scan :22', 'Scan von außen :22')}</button>`,
    foot: `<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="nat-pf"> ${tr('port-forward', 'Portweiterleitung')} <code>:22 → 192.168.1.10:22</code></label><span id="nat-msg"></span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  body.innerHTML = `<canvas></canvas><div style="padding:14px;border-top:1px solid var(--line)" class="tbl-wrap"><table class="mini-table"><thead><tr><th>${tr('Inside (private)', 'Innen (privat)')}</th><th>${tr('Outside (public)', 'Außen (öffentlich)')}</th><th>${tr('Destination', 'Ziel')}</th></tr></thead><tbody id="nat-t"><tr><td colspan="3" style="color:var(--muted)">${tr('NAT table empty', 'NAT-Tabelle leer')}</td></tr></tbody></table></div>`;
  const canvas = $('canvas', body);
  const { ctx, size } = setupCanvas(canvas, 0.42, 280);
  const stage = makeStage(canvas, size);
  const table = [];
  let nextPort = 40001, busy = false, flash = null;
  const P = {
    h: (i) => () => ({ x: size.w * 0.1, y: size.h * (0.2 + i * 0.3) }),
    r: () => ({ x: size.w * 0.45, y: size.h * 0.5 }),
    net: () => ({ x: size.w * 0.88, y: size.h * 0.5 }),
  };
  const msg = (t) => ($('#nat-msg', w).innerHTML = t);
  const renderT = () => {
    $('#nat-t', body).innerHTML = table.length ? table.map((r, i) => `<tr class="${i === flash ? 'flash' : ''}"><td>${r.in}</td><td>${PUB}:${r.port}</td><td>${r.dst}</td></tr>`).join('') : `<tr><td colspan="3" style="color:var(--muted)">${tr('NAT table empty', 'NAT-Tabelle leer')}</td></tr>`;
  };
  async function out(fi) {
    if (busy) return; busy = true;
    const f = flows[fi], hst = inside[f.h];
    const sport = 50000 + Math.floor(Math.random() * 9000);
    const key = `${hst.ip}:${sport}`;
    await stage.travel(P.h(f.h), P.r, COLORS.mint, `${key} → ${f.dst}:${f.dport}`, 1);
    const port = nextPort++;
    table.push({ in: key, port, dst: `${f.dst}:${f.dport}` }); flash = table.length - 1; renderT();
    msg(`${tr('rewrote source', 'Quelle umgeschrieben')} <b>${key}</b> → <b style="color:${COLORS.mint}">${PUB}:${port}</b>`);
    await stage.travel(P.r, P.net, COLORS.yellow, `${PUB}:${port} → ${f.dst}:${f.dport}`, 1);
    await sleep(200);
    await stage.travel(P.net, P.r, COLORS.yellow, `${f.dst}:${f.dport} → ${PUB}:${port}`, 1);
    msg(`${tr(`reply to :${port} matches the table → translate back to`, `Antwort an :${port} passt zur Tabelle → zurückübersetzen zu`)} <b>${key}</b>`);
    await stage.travel(P.r, P.h(f.h), COLORS.mint, `→ ${key}`, 0.9);
    if (table.length >= 3) store.award('nat-3', 10, tr('Three devices, one public IP', 'Drei Geräte, eine öffentliche IP'));
    busy = false;
  }
  async function inbound() {
    if (busy) return; busy = true;
    await stage.travel(P.net, P.r, COLORS.danger, `198.18.0.66 → ${PUB}:22`, 1);
    if ($('#nat-pf', w).checked) {
      msg(`<span style="color:${COLORS.orange}">${tr('port-forward rule matched — your SSH server is now exposed to the Internet!', 'Portweiterleitung greift – dein SSH-Server ist jetzt aus dem Internet erreichbar!')}</span>`);
      await stage.travel(P.r, P.h(0), COLORS.danger, '→ 192.168.1.10:22', 0.9);
    } else {
      msg(`<span style="color:${COLORS.mint}">${tr('no mapping for :22 → dropped.', 'keine Zuordnung für :22 → verworfen.')}</span> ${tr(`Unsolicited inbound traffic can't find a host.`, 'Unaufgeforderter eingehender Verkehr findet keinen Host.')}`);
      store.award('nat-drop', 5, tr('NAT dropped an unsolicited packet', 'NAT hat ein unaufgefordertes Paket verworfen'));
    }
    busy = false;
  }
  $$('[data-f]', w).forEach((b) => (b.onclick = () => out(+b.dataset.f)));
  $('#nat-in', w).onclick = inbound;
  loop((dt) => {
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.strokeStyle = 'rgba(160,175,220,0.2)'; ctx.lineWidth = 2;
    inside.forEach((_, i) => { const a = P.h(i)(), b = P.r(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    const r = P.r(), n = P.net();
    ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    // zones
    ctx.fillStyle = 'rgba(92,242,194,0.04)'; ctx.fillRect(0, 0, r.x, size.h);
    ctx.fillStyle = COLORS.muted; ctx.font = '600 10px JetBrains Mono'; ctx.textAlign = 'left'; ctx.fillText(tr('PRIVATE', 'PRIVAT') + ' 192.168.1.0/24', 10, 14);
    ctx.textAlign = 'right'; ctx.fillText(tr('PUBLIC INTERNET', 'ÖFFENTLICHES INTERNET'), size.w - 10, 14);
    inside.forEach((x, i) => { const p = P.h(i)(); box(ctx, p.x + 30, p.y, 110, 44, x.n, x.ip, 'rgba(160,175,220,.35)'); });
    box(ctx, r.x, r.y, 130, 56, tr('📡 Home router', '📡 Heimrouter'), `WAN ${PUB}`, COLORS.violet);
    box(ctx, n.x - 20, n.y, 120, 56, '🌍 Internet', tr('servers & scanners', 'Server & Scanner'), 'rgba(160,175,220,.35)');
    stage.drawDots(ctx, dt);
  }, canvas);
  renderT();
}

/* =========================================================
   Firewall rule puzzle
   ========================================================= */
const TRAFFIC = [
  { d: tr('Visitor → web server HTTPS', 'Besucher → Webserver HTTPS'), src: 'ext', proto: 'tcp', port: 443, want: 'allow' },
  { d: tr('Visitor → web server HTTP', 'Besucher → Webserver HTTP'), src: 'ext', proto: 'tcp', port: 80, want: 'allow' },
  { d: tr('Attacker → SSH brute force', 'Angreifer → SSH-Brute-Force'), src: 'ext', proto: 'tcp', port: 22, want: 'deny' },
  { d: tr('Admin (office LAN) → SSH', 'Admin (Büro-LAN) → SSH'), src: 'int', proto: 'tcp', port: 22, want: 'allow' },
  { d: tr('Attacker → Remote Desktop', 'Angreifer → Remotedesktop'), src: 'ext', proto: 'tcp', port: 3389, want: 'deny' },
  { d: tr('Office LAN → DNS server', 'Büro-LAN → DNS-Server'), src: 'int', proto: 'udp', port: 53, want: 'allow' },
  { d: tr('Attacker → database', 'Angreifer → Datenbank'), src: 'ext', proto: 'tcp', port: 5432, want: 'deny' },
  { d: tr('Botnet → UDP flood :53', 'Botnetz → UDP-Flut :53'), src: 'ext', proto: 'udp', port: 53, want: 'deny' },
];
export function firewall(mount) {
  const w = widgetShell('firewall.rules', { controls: `<button class="btn small" id="fw-run">▶ ${tr('Test traffic', 'Verkehr testen')}</button>`, foot: `<span id="fw-foot">${tr('Build a rule list. Rules are checked top → bottom; first match wins.', 'Bau eine Regelliste. Regeln werden von oben nach unten geprüft; die erste passende gewinnt.')}</span>` });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  let rules = [{ act: 'allow', src: 'any', proto: 'any', port: 'any' }];
  let policy = 'allow';
  body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:18px">
    <div><h4 class="mono" style="font-size:.7rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">${tr('Rules', 'Regeln')}</h4><div id="fw-rules"></div>
      <div class="btn-row" style="margin-top:10px"><button class="btn small ghost" id="fw-add">+ ${tr('Add rule', 'Regel hinzufügen')}</button>
      <label class="mono" style="font-size:.8rem;color:var(--muted);display:flex;gap:8px;align-items:center">${tr('default', 'Standard')} <select class="input" id="fw-pol" style="width:auto;padding:5px 8px"><option value="allow">allow</option><option value="deny">deny</option></select></label></div></div>
    <div><h4 class="mono" style="font-size:.7rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">${tr('Test traffic', 'Testverkehr')}</h4><table class="mini-table"><thead><tr><th>${tr('Packet', 'Paket')}</th><th>${tr('Want', 'Soll')}</th><th>${tr('Got', 'Ist')}</th></tr></thead><tbody id="fw-t"></tbody></table></div></div>`;
  const opt = (v, list) => list.map((x) => `<option ${x == v ? 'selected' : ''}>${x}</option>`).join('');
  function renderRules() {
    $('#fw-rules', body).innerHTML = rules.map((r, i) => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap" data-i="${i}">
      <span class="mono" style="color:var(--muted);width:18px">${i + 1}</span>
      <select class="input" data-k="act" style="width:auto;padding:5px 6px;color:${r.act === 'allow' ? COLORS.mint : COLORS.danger}">${opt(r.act, ['allow', 'deny'])}</select>
      <select class="input" data-k="src" style="width:auto;padding:5px 6px">${opt(r.src, ['any', 'int', 'ext'])}</select>
      <select class="input" data-k="proto" style="width:auto;padding:5px 6px">${opt(r.proto, ['any', 'tcp', 'udp'])}</select>
      <select class="input" data-k="port" style="width:auto;padding:5px 6px">${opt(r.port, ['any', 22, 53, 80, 443, 3389, 5432])}</select>
      <button class="icon-btn" data-up style="width:28px;height:28px" title="${tr('move up', 'nach oben')}">↑</button><button class="icon-btn" data-del style="width:28px;height:28px" title="${tr('delete', 'löschen')}">✕</button></div>`).join('') || `<p style="color:var(--muted)">${tr('no rules — only the default policy applies', 'keine Regeln – nur die Standardrichtlinie gilt')}</p>`;
  }
  function renderT(results) {
    $('#fw-t', body).innerHTML = TRAFFIC.map((t, i) => {
      const r = results?.[i];
      return `<tr><td>${t.d}<br><span style="color:var(--muted)">${t.src} ${t.proto}/${t.port}</span></td><td style="color:${t.want === 'allow' ? COLORS.mint : COLORS.danger}">${t.want}</td>
      <td>${r ? `<span style="color:${r.v === t.want ? COLORS.mint : COLORS.danger}">${r.v === t.want ? '✓' : '✗'} ${r.v}</span><br><span style="color:var(--muted)">${r.by}</span>` : '—'}</td></tr>`;
    }).join('');
  }
  body.addEventListener('change', (e) => {
    if (e.target.id === 'fw-pol') { policy = e.target.value; return; }
    const row = e.target.closest('[data-i]'); if (!row) return;
    const r = rules[+row.dataset.i]; const k = e.target.dataset.k;
    r[k] = k === 'port' && e.target.value !== 'any' ? +e.target.value : e.target.value;
    renderRules();
  });
  body.addEventListener('click', (e) => {
    const row = e.target.closest('[data-i]'); if (!row) return;
    const i = +row.dataset.i;
    if (e.target.closest('[data-del]')) rules.splice(i, 1);
    else if (e.target.closest('[data-up]') && i > 0) [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
    else return;
    renderRules();
  });
  $('#fw-add', body).onclick = () => { if (rules.length < 8) { rules.push({ act: 'deny', src: 'ext', proto: 'tcp', port: 22 }); renderRules(); } };
  $('#fw-run', w).onclick = () => {
    const res = TRAFFIC.map((t) => {
      const i = rules.findIndex((r) => (r.src === 'any' || r.src === t.src) && (r.proto === 'any' || r.proto === t.proto) && (r.port === 'any' || r.port == t.port));
      return i >= 0 ? { v: rules[i].act, by: `${tr('rule', 'Regel')} ${i + 1}` } : { v: policy, by: tr('default policy', 'Standardrichtlinie') };
    });
    renderT(res);
    const ok = res.filter((r, i) => r.v === TRAFFIC[i].want).length;
    $('#fw-foot', w).innerHTML = ok === TRAFFIC.length
      ? `<b style="color:${COLORS.mint}">${tr(`All ${ok}/${TRAFFIC.length} correct — the network is safe!`, `Alle ${ok}/${TRAFFIC.length} richtig – das Netz ist sicher!`)}</b> ${rules.length <= 4 ? tr('And with a lean rule set too.', 'Und das mit schlanken Regeln.') : tr('Can you do it with 4 rules or fewer?', 'Schaffst du es mit 4 Regeln oder weniger?')}`
      : `<b style="color:${COLORS.orange}">${ok}/${TRAFFIC.length}</b> ${tr(`handled correctly. Hint: allow what's needed, then default deny.`, 'richtig behandelt. Tipp: Erlaube, was nötig ist, dann Standard: verweigern.')}`;
    if (ok === TRAFFIC.length) store.award('fw-win', 20, tr('Firewall configured', 'Firewall konfiguriert'));
    if (ok === TRAFFIC.length && rules.length <= 4) store.award('fw-lean', 15, tr('Minimal rule set', 'Minimaler Regelsatz'));
  };
  renderRules(); renderT();
}
