import { $, $$, loop, setupCanvas, pointerPos, widgetShell, COLORS, store, sleep, esc, rand, pick } from '../core.js';
import { tr } from '../i18n.js';
import { expand6, compress6, eui64 } from '../net6.js';
import { flag } from '../srs.js';

/* =========================================================
   IPv6: live converter, compression drill, EUI-64 builder
   ========================================================= */
export function ipv6(mount) {
  const w = widgetShell('ipv6.lab', {
    controls: `<div class="seg" id="v6-tab"><button class="on" data-t="conv">${tr('Converter', 'Umrechner')}</button><button data-t="drill">${tr('Drill', 'Training')}</button><button data-t="eui">EUI-64</button></div>`,
    foot: '<span id="v6-foot"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w), foot = $('#v6-foot', w);
  const groupsHTML = (g, hl) => `<div class="v6-groups">${g.map((x, i) => `<span class="${x === '0000' ? 'zero' : ''} ${hl && hl.includes(i) ? 'hl' : ''}">${x}</span>`).join('')}</div>`;

  function conv() {
    body.innerHTML = `<div class="field"><label>${tr('Type any IPv6 address', 'Gib eine beliebige IPv6-Adresse ein')}</label><input class="input" id="v6-in" value="2001:0db8:0000:0000:0000:ff00:0042:8329" spellcheck="false"></div><div id="v6-out" style="margin-top:16px"></div>`;
    const inp = $('#v6-in', body);
    const render = () => {
      const g = expand6(inp.value);
      inp.classList.toggle('bad', !g);
      if (!g) { $('#v6-out', body).innerHTML = `<p style="color:var(--danger)">${tr('Not a valid IPv6 address: 8 groups of up to 4 hex digits, at most one “::”.', 'Keine gültige IPv6-Adresse: 8 Gruppen mit bis zu 4 Hex-Ziffern, höchstens ein „::“.')}</p>`; return; }
      const c = compress6(g);
      const kind = g[0].startsWith('fe8') ? tr('link-local (fe80::/10)', 'Link-Local (fe80::/10)') : g.join('') === '0'.repeat(31) + '1' ? tr('loopback (::1)', 'Loopback (::1)') : /^f[cd]/.test(g[0]) ? tr('unique local (fc00::/7)', 'Unique Local (fc00::/7)') : g[0] === 'ff' + g[0].slice(2) && g[0].startsWith('ff') ? tr('multicast (ff00::/8)', 'Multicast (ff00::/8)') : /^[23]/.test(g[0]) ? tr('global unicast (2000::/3)', 'Global Unicast (2000::/3)') : tr('other / reserved', 'sonstige / reserviert');
      $('#v6-out', body).innerHTML = `${groupsHTML(g)}
        <div class="kv" style="margin-top:14px"><div><small>${tr('Expanded', 'Ausgeschrieben')}</small><b>${g.join(':')}</b></div><div><small>${tr('Compressed (RFC 5952)', 'Gekürzt (RFC 5952)')}</small><b style="color:var(--mint)">${c}</b></div>
        <div><small>${tr('Network /64', 'Netz /64')}</small><b>${compress6([...g.slice(0, 4), '0', '0', '0', '0'])}/64</b></div><div><small>${tr('Interface ID', 'Interface-ID')}</small><b>${g.slice(4).join(':')}</b></div><div><small>${tr('Type', 'Typ')}</small><b>${kind}</b></div></div>`;
      foot.innerHTML = tr('Rules: drop leading zeros in each group; replace the <b>longest</b> run of all-zero groups with <code>::</code> (only once).', 'Regeln: führende Nullen pro Gruppe weglassen; die <b>längste</b> Folge von Nullgruppen durch <code>::</code> ersetzen (nur einmal).');
    };
    inp.addEventListener('input', render);
    render();
  }

  let streak = 0;
  function drill() {
    const g = Array.from({ length: 8 }, () => (Math.random() < 0.45 ? '0000' : Math.random() < 0.5 ? rand(0, 0xff).toString(16).padStart(4, '0') : rand(0, 0xffff).toString(16).padStart(4, '0')));
    if (!g.some((x) => x === '0000')) g[rand(2, 6)] = '0000';
    g[0] = pick(['2001', '2a02', 'fd00', 'fe80']);
    const answer = compress6(g);
    body.innerHTML = `<p style="color:var(--text)">${tr('Write this address in its shortest correct form:', 'Schreibe diese Adresse in ihrer kürzesten korrekten Form:')}</p>${groupsHTML(g)}
      <div class="btn-row" style="margin-top:14px"><input class="input" id="v6-ans" placeholder="2001:db8::1" spellcheck="false" style="flex:1;min-width:200px"><button class="btn small" id="v6-check">${tr('Check', 'Prüfen')}</button><button class="btn small ghost" id="v6-skip">${tr('New address', 'Neue Adresse')}</button></div><div id="v6-res" style="margin-top:12px"></div>`;
    const inp = $('#v6-ans', body);
    const check = () => {
      const v = inp.value.trim().toLowerCase();
      const same = expand6(v)?.join() === g.join();
      if (v === answer) {
        streak++;
        $('#v6-res', body).innerHTML = `<p style="color:var(--mint)">✓ ${tr('Perfect!', 'Perfekt!')} <code>${answer}</code></p>`;
        store.award(`v6-${streak}`, 5, tr(`IPv6 streak ${streak}`, `IPv6-Serie ${streak}`));
        setTimeout(drill, 1200);
      } else {
        streak = 0; flag('q:ipv6:0');
        $('#v6-res', body).innerHTML = same
          ? `<p style="color:var(--yellow)">${tr('Same address, but not the canonical shortest form.', 'Gleiche Adresse, aber nicht die kanonische Kurzform.')} ${tr('Expected', 'Erwartet')}: <code>${answer}</code> — ${tr('remember: drop all leading zeros and use :: for the longest zero run.', 'Denk dran: alle führenden Nullen weg und :: für die längste Nullfolge.')}</p>`
          : `<p style="color:var(--danger)">✗ ${tr('That is a different address.', 'Das ist eine andere Adresse.')} ${tr('Expected', 'Erwartet')}: <code>${answer}</code></p>`;
      }
      foot.innerHTML = `${tr('streak', 'Serie')}: <b style="color:var(--mint)">${streak}</b>`;
    };
    $('#v6-check', body).onclick = check;
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && check());
    $('#v6-skip', body).onclick = drill;
    foot.innerHTML = `${tr('streak', 'Serie')}: <b style="color:var(--mint)">${streak}</b>`;
  }

  function eui() {
    body.innerHTML = `<div class="field"><label>${tr('MAC address of the network card', 'MAC-Adresse der Netzwerkkarte')}</label><input class="input" id="v6-mac" value="00:1a:2b:3c:4d:5e" spellcheck="false"></div><div id="v6-steps" style="margin-top:16px"></div>`;
    const inp = $('#v6-mac', body);
    const render = () => {
      const id = eui64(inp.value);
      inp.classList.toggle('bad', !id);
      if (!id) { $('#v6-steps', body).innerHTML = `<p style="color:var(--danger)">${tr('Enter 6 bytes like 00:1a:2b:3c:4d:5e', 'Gib 6 Bytes ein, z. B. 00:1a:2b:3c:4d:5e')}</p>`; return; }
      const b = inp.value.toLowerCase().split(/[:-]/);
      const first = parseInt(b[0], 16);
      $('#v6-steps', body).innerHTML = `<ol class="v6-steps">
        <li>${tr('Split the MAC in half', 'MAC in der Mitte teilen')}: <code>${b.slice(0, 3).join(':')}</code> | <code>${b.slice(3).join(':')}</code></li>
        <li>${tr('Insert', 'Einfügen')} <code class="ins">ff:fe</code> ${tr('in the middle', 'in der Mitte')}: <code>${b.slice(0, 3).join(':')}:<span class="ins">ff:fe</span>:${b.slice(3).join(':')}</code></li>
        <li>${tr('Flip the 7th bit (universal/local) of the first byte', 'Das 7. Bit (universal/lokal) des ersten Bytes umdrehen')}: <code>${b[0]}</code> = <code>${first.toString(2).padStart(8, '0')}</code> → <code>${(first ^ 2).toString(2).padStart(8, '0')}</code> = <code class="ins">${(first ^ 2).toString(16).padStart(2, '0')}</code></li>
        <li>${tr('Interface ID', 'Interface-ID')}: <b style="color:var(--mint)">${id.join(':')}</b></li>
        <li>${tr('Add the /64 prefix from the router advertisement (SLAAC)', 'Mit dem /64-Präfix aus dem Router Advertisement verbinden (SLAAC)')}: <b style="color:var(--mint)">${compress6(['2001', '0db8', '00ab', '0001', ...id])}</b></li></ol>`;
      foot.innerHTML = tr('Privacy note: this embeds your MAC in the address, so modern OSes prefer random “privacy extension” IDs (RFC 8981).', 'Datenschutz: So steckt deine MAC in der Adresse – moderne Systeme nehmen deshalb lieber zufällige „Privacy Extension“-IDs (RFC 8981).');
      store.award('v6-eui', 5, tr('Built an EUI-64 address', 'EUI-64-Adresse gebaut'));
    };
    inp.addEventListener('input', render);
    render();
  }
  const tabs = { conv, drill, eui };
  $$('#v6-tab button', w).forEach((b) => b.addEventListener('click', () => { $$('#v6-tab button', w).forEach((x) => x.classList.toggle('on', x === b)); tabs[b.dataset.t](); }));
  conv();
}

/* =========================================================
   VLANs & Spanning Tree: broadcast storm in a switch loop
   ========================================================= */
export function vlan(mount) {
  const w = widgetShell('stp.loop', {
    controls: `<label class="mono" style="font-size:.75rem;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="vl-stp"> Spanning Tree</label>
      <label class="mono" style="font-size:.75rem;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="vl-vlan"> VLANs</label>`,
    foot: `<button class="btn small" id="vl-send">📣 ${tr('Broadcast from PC A', 'Broadcast von PC A')}</button><button class="btn small ghost" id="vl-stop">■ ${tr('Unplug everything', 'Alles ausstecken')}</button><span id="vl-msg"></span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  const canvas = document.createElement('canvas');
  body.appendChild(canvas);
  const { ctx, size } = setupCanvas(canvas, 0.55, 300);
  // switches in a triangle (a physical loop), two PCs each
  const SW = [{ n: 'SW1', x: 0.5, y: 0.22 }, { n: 'SW2', x: 0.22, y: 0.7 }, { n: 'SW3', x: 0.78, y: 0.7 }];
  const PCS = [
    { n: 'A', sw: 0, x: 0.33, y: 0.1, vlan: 10 }, { n: 'B', sw: 0, x: 0.67, y: 0.1, vlan: 20 },
    { n: 'C', sw: 1, x: 0.07, y: 0.55, vlan: 10 }, { n: 'D', sw: 1, x: 0.1, y: 0.92, vlan: 20 },
    { n: 'E', sw: 2, x: 0.93, y: 0.55, vlan: 20 }, { n: 'F', sw: 2, x: 0.9, y: 0.92, vlan: 10 },
  ];
  const LINKS = [[0, 1], [0, 2], [1, 2]]; // SW2–SW3 gets blocked by STP (SW1 is root bridge)
  const BLOCKED = 2;
  let frames = [], incoming = [], hits = new Map(), total = 0, storm = false;
  const P = (o) => ({ x: o.x * size.w, y: o.y * size.h });
  const stp = () => $('#vl-stp', w).checked, vl = () => $('#vl-vlan', w).checked;
  const msg = (t) => ($('#vl-msg', w).innerHTML = t);
  const vcol = (v) => (v === 10 ? COLORS.mint : COLORS.orange);

  // new copies go to `incoming` and join `frames` after the current animation step
  function emit(from, to, kind, ingress, vlanId) { incoming.push({ from, to, kind, ingress, vlan: vlanId, t: 0 }); total++; }
  // a frame arriving at switch s from link index `via` (or from a PC)
  function atSwitch(s, viaLink, vlanId) {
    PCS.forEach((pc, i) => { if (pc.sw === s && !(viaLink === -1 && i === 0) && (!vl() || pc.vlan === vlanId)) emit(SW[s], pc, 'pc', i, vlanId); });
    LINKS.forEach(([a, b], li) => {
      if (li === viaLink || (stp() && li === BLOCKED)) return;
      if (a === s || b === s) emit(SW[s], SW[a === s ? b : a], 'sw', { link: li, sw: a === s ? b : a }, vlanId);
    });
  }
  $('#vl-send', w).onclick = () => {
    if (storm) return;
    total = 0; hits.clear();
    emit(PCS[0], SW[0], 'up', null, PCS[0].vlan);
    msg(tr('A broadcast (ff:ff:ff:ff:ff:ff) is flooded out of every port except the one it came in on…', 'Ein Broadcast (ff:ff:ff:ff:ff:ff) wird aus jedem Port außer dem Eingangsport geflutet …'));
  };
  $('#vl-stop', w).onclick = () => { frames = []; incoming = []; storm = false; total = 0; hits.clear(); msg(tr('Network calm again.', 'Netz wieder ruhig.')); };
  $('#vl-stp', w).onchange = () => { frames = []; incoming = []; storm = false; msg(stp() ? tr('STP elected SW1 as root bridge and <b>blocked</b> the SW2–SW3 port: the topology is now a loop-free tree.', 'STP hat SW1 zur Root-Bridge gewählt und den Port SW2–SW3 <b>blockiert</b>: Die Topologie ist jetzt ein schleifenfreier Baum.') : tr('STP off: the triangle is a loop again.', 'STP aus: Das Dreieck ist wieder eine Schleife.')); };
  $('#vl-vlan', w).onchange = () => { frames = []; incoming = []; storm = false; msg(vl() ? tr('VLAN 10 (mint) and VLAN 20 (orange) share the switches but are separate broadcast domains. Links between switches are 802.1Q trunks.', 'VLAN 10 (mint) und VLAN 20 (orange) teilen sich die Switches, sind aber getrennte Broadcast-Domänen. Die Links zwischen Switches sind 802.1Q-Trunks.') : ''); };

  loop((dt, t) => {
    ctx.clearRect(0, 0, size.w, size.h);
    // links
    LINKS.forEach(([a, b], li) => {
      const pa = P(SW[a]), pb = P(SW[b]);
      const blocked = stp() && li === BLOCKED;
      ctx.setLineDash(blocked ? [6, 6] : []); ctx.strokeStyle = blocked ? 'rgba(255,84,112,.6)' : storm ? 'rgba(255,84,112,.8)' : 'rgba(139,123,255,.55)'; ctx.lineWidth = vl() ? 4 : 2.5;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
      if (blocked) { ctx.fillStyle = COLORS.danger; ctx.font = '700 11px JetBrains Mono'; ctx.textAlign = 'center'; ctx.fillText(tr('BLOCKED', 'BLOCKIERT'), (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 10); }
      else if (vl()) { ctx.fillStyle = COLORS.muted; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center'; ctx.fillText('trunk 10,20', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + 16); }
    });
    PCS.forEach((pc) => { const a = P(pc), b = P(SW[pc.sw]); ctx.strokeStyle = vl() ? vcol(pc.vlan) + '88' : 'rgba(160,175,220,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    // frames
    const next = [];
    for (const f of frames) {
      f.t += dt * 1.4;
      const a = P(f.from), b = P(f.to), k = Math.min(1, f.t);
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      const c = vl() ? vcol(f.vlan) : COLORS.yellow;
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (f.t < 1) { next.push(f); continue; }
      if (f.kind === 'up') atSwitch(0, -1, f.vlan);
      else if (f.kind === 'sw') atSwitch(f.ingress.sw, f.ingress.link, f.vlan);
      else hits.set(PCS[f.ingress].n, (hits.get(PCS[f.ingress].n) || 0) + 1);
    }
    frames = next.concat(incoming);
    incoming = [];
    if (total > 60 && frames.length && !storm) { // copies never die out: the frame is looping
      storm = true;
      flag('g:Spanning Tree (STP)');
      store.award('vlan-storm', 10, tr('Caused a broadcast storm', 'Broadcast-Sturm ausgelöst'));
    }
    if (storm && frames.length > 400) frames = frames.slice(-400); // keep the demo responsive
    if (storm) msg(`<b style="color:var(--danger)">🌪 ${tr('BROADCAST STORM', 'BROADCAST-STURM')}</b> — ${tr('the frame circles the loop forever (Ethernet has no TTL) and every lap floods all PCs again. With more loops the copies multiply until links are full. Turn on Spanning Tree, then unplug.', 'Der Rahmen kreist endlos in der Schleife (Ethernet hat keine TTL), und jede Runde flutet alle PCs erneut. Bei mehr Schleifen vervielfachen sich die Kopien, bis die Leitungen voll sind. Schalte Spanning Tree ein und stecke dann alles aus.')} · ${tr('copies so far', 'Kopien bisher')}: ${total}`);
    else if (!frames.length && total > 1) {
      const got = [...hits.keys()].sort().join(', ');
      msg(`${tr('Done', 'Fertig')}: ${total} ${tr('frame copies, delivered to', 'Rahmenkopien, zugestellt an')} <b>${got || '—'}</b>${[...hits.values()].some((n) => n > 1) ? ` <span style="color:var(--orange)">(${tr('duplicates!', 'Duplikate!')})</span>` : ''}`);
      if (stp() && vl()) store.award('vlan-clean', 10, tr('Clean broadcast in a VLAN', 'Sauberer Broadcast im VLAN'));
      total = 0;
    }
    // switches + PCs
    SW.forEach((s, i) => { const p = P(s); ctx.fillStyle = '#16203a'; ctx.strokeStyle = stp() && i === 0 ? COLORS.yellow : COLORS.violet; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(p.x - 34, p.y - 16, 68, 32, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = COLORS.text; ctx.font = '700 12px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.n, p.x, p.y); if (stp() && i === 0) { ctx.fillStyle = COLORS.yellow; ctx.font = '10px JetBrains Mono'; ctx.fillText('root', p.x, p.y + 26); } });
    PCS.forEach((pc) => { const p = P(pc); const hit = hits.get(pc.n); ctx.fillStyle = '#121a30'; ctx.strokeStyle = vl() ? vcol(pc.vlan) : hit ? COLORS.mint : 'rgba(160,175,220,.4)'; ctx.lineWidth = hit ? 3 : 2; ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = COLORS.text; ctx.font = '700 11px JetBrains Mono'; ctx.fillText(pc.n, p.x, p.y + 1); if (vl()) { ctx.fillStyle = vcol(pc.vlan); ctx.font = '9px JetBrains Mono'; ctx.fillText('VLAN ' + pc.vlan, p.x, p.y + 26); } });
    ctx.fillStyle = storm ? COLORS.danger : COLORS.muted; ctx.font = '600 11px JetBrains Mono'; ctx.textAlign = 'left';
    ctx.fillText(`${tr('frames in flight', 'Rahmen unterwegs')}: ${frames.length}`, 10, size.h - 10);
    void t;
  }, canvas);
  void pointerPos; void sleep;
}

/* =========================================================
   VPN: who can see what?
   ========================================================= */
export function vpn(mount) {
  const w = widgetShell('vpn.view', {
    controls: `<label class="mono" style="font-size:.75rem;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="vp-on"> VPN</label>
      <label class="mono" style="font-size:.75rem;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="vp-https" checked> HTTPS</label>`,
    foot: `<span id="vp-foot"></span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  const HOPS = [
    { id: 'me', icon: '💻', name: tr('You', 'Du'), ip: '192.168.1.10' },
    { id: 'cafe', icon: '☕', name: tr('Café Wi‑Fi', 'Café-WLAN'), spy: true },
    { id: 'isp', icon: '🏢', name: tr('Internet provider', 'Internetanbieter'), spy: true },
    { id: 'vpn', icon: '🔐', name: tr('VPN server', 'VPN-Server'), ip: '203.0.113.9', spy: true, vpnOnly: true },
    { id: 'site', icon: '🌐', name: 'shop.example', ip: '93.184.215.14', spy: true },
  ];
  function view(h, on, https) {
    // what an observer at hop h learns: [source IP, destination, content]
    const before = !on || h.id === 'cafe' || h.id === 'isp';
    if (h.id === 'site') return [on ? '203.0.113.9 (VPN)' : `${tr('your public IP', 'deine öffentliche IP')} 198.51.100.7`, 'shop.example', https ? tr('decrypted (it is the destination)', 'entschlüsselt (es ist das Ziel)') : 'GET /checkout …'];
    if (h.id === 'vpn') return [`${tr('your public IP', 'deine öffentliche IP')} 198.51.100.7`, 'shop.example (DNS/SNI)', https ? tr('🔒 encrypted (TLS)', '🔒 verschlüsselt (TLS)') : 'GET /checkout …'];
    if (on && before) return [`${tr('your', 'deine')} IP`, tr('only “the VPN server”', 'nur „der VPN-Server“'), tr('🔒 encrypted tunnel', '🔒 verschlüsselter Tunnel')];
    return [`${tr('your', 'deine')} IP`, 'shop.example (DNS/SNI)', https ? tr('🔒 encrypted (TLS)', '🔒 verschlüsselt (TLS)') : `<span style="color:var(--danger)">GET /checkout?card=4111… ${tr('(plain text!)', '(Klartext!)')}</span>`];
  }
  function render() {
    const on = $('#vp-on', w).checked, https = $('#vp-https', w).checked;
    const hops = HOPS.filter((h) => on || !h.vpnOnly);
    body.innerHTML = `<div class="vpn-path">${hops.map((h, i) => `<div class="vpn-hop ${h.spy ? 'spy' : ''}"><div class="vpn-ico">${h.icon}</div><b>${h.name}</b>${h.ip ? `<small>${h.ip}</small>` : ''}</div>${i < hops.length - 1 ? `<div class="vpn-wire ${on && i < 2 ? 'tunnel' : ''}"><span></span></div>` : ''}`).join('')}</div>
      <div class="packet-vis" style="height:auto;flex-wrap:wrap;margin:18px 0">${on
        ? `<div style="background:#4cc9ff">IP → 203.0.113.9</div><div style="background:#5cf2c2">UDP 51820</div><div style="background:#8b7bff;flex:1;color:#fff">🔒 WireGuard [ IP → 93.184.215.14 | TCP 443 | ${https ? 'TLS' : 'HTTP'} ]</div>`
        : `<div style="background:#4cc9ff">IP → 93.184.215.14</div><div style="background:#5cf2c2">TCP 443</div><div style="background:${https ? '#ff5c9a' : '#ff5470'};flex:1">${https ? '🔒 TLS [ GET /checkout ]' : 'GET /checkout (HTTP)'}</div>`}</div>
      <div class="tbl-wrap"><table class="mini-table"><thead><tr><th>${tr('Observer', 'Beobachter')}</th><th>${tr('Sees source', 'Sieht Quelle')}</th><th>${tr('Sees destination', 'Sieht Ziel')}</th><th>${tr('Sees content', 'Sieht Inhalt')}</th></tr></thead><tbody>
      ${hops.filter((h) => h.spy).map((h) => `<tr><td>${h.icon} ${h.name}</td>${view(h, on, https).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    $('#vp-foot', w).innerHTML = on
      ? tr('With the VPN, the café and your provider only see encrypted UDP to the VPN server. But the VPN provider now sees what they used to — you moved your trust, you didn’t remove it.', 'Mit VPN sehen Café und Provider nur verschlüsseltes UDP zum VPN-Server. Dafür sieht jetzt der VPN-Anbieter, was die vorher gesehen haben – du verschiebst Vertrauen, du schaffst es nicht ab.')
      : https ? tr('Even without a VPN, HTTPS hides the content — but everyone on the path learns which site you visit (DNS, SNI, IP).', 'Auch ohne VPN versteckt HTTPS den Inhalt – aber jeder auf dem Weg erfährt, welche Seite du besuchst (DNS, SNI, IP).')
        : `<span style="color:var(--danger)">${tr('Plain HTTP on public Wi‑Fi: everyone on the path can read and change everything.', 'Unverschlüsseltes HTTP im öffentlichen WLAN: Jeder auf dem Weg kann alles lesen und verändern.')}</span>`;
    if (on) store.award('vpn-on', 5, tr('Built a tunnel', 'Tunnel gebaut'));
  }
  $('#vp-on', w).onchange = render; $('#vp-https', w).onchange = render;
  render();
}

/* =========================================================
   E-mail delivery: MX lookup, SMTP dialogue, SPF/DKIM/DMARC
   ========================================================= */
const MAIL_CASES = {
  legit: { label: tr('Legit mail', 'Echte Mail'), from: 'ada@lovelace.org', ip: '198.51.100.25', spf: true, dkim: true, dmarcAlign: true, verdict: 'inbox' },
  spoof: { label: tr('Spoofed sender', 'Gefälschter Absender'), from: 'ceo@bank.example', ip: '185.220.101.4', spf: false, dkim: false, dmarcAlign: false, verdict: 'reject' },
  fwd: { label: tr('Forwarded mail', 'Weitergeleitete Mail'), from: 'ada@lovelace.org', ip: '203.0.113.77', spf: false, dkim: true, dmarcAlign: true, verdict: 'inbox' },
};
export function email(mount) {
  const w = widgetShell('smtp.trace', {
    controls: `<div class="seg" id="em-case">${Object.entries(MAIL_CASES).map(([k, c], i) => `<button data-c="${k}" class="${i === 0 ? 'on' : ''}">${c.label}</button>`).join('')}</div><button class="btn small" id="em-go">✉ ${tr('Send', 'Senden')}</button>`,
    foot: '<span id="em-foot"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.innerHTML = `<div class="em-grid"><div class="log" id="em-log" style="max-height:340px;min-height:240px"></div><div id="em-checks"></div></div>`;
  let cur = 'legit', run = 0;
  const log = (html) => { const l = $('#em-log', body); l.insertAdjacentHTML('beforeend', `<div>${html}</div>`); l.scrollTop = 1e6; };
  const domain = (c) => c.from.split('@')[1];
  function checks(c, n) {
    const row = (name, ok, detail, shown) => `<div class="em-check ${shown ? (ok ? 'ok' : 'bad') : ''}"><b>${name}</b><span>${shown ? (ok ? '✓ pass' : '✗ fail') : '…'}</span><small>${shown ? detail : ''}</small></div>`;
    const dmarc = (c.spf || c.dkim) && c.dmarcAlign;
    $('#em-checks', body).innerHTML = `<h4 class="mono" style="font-size:.7rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px">${tr('Receiving server checks', 'Prüfungen beim Empfänger')}</h4>
      ${row('SPF', c.spf, c.spf ? tr(`${c.ip} is listed in ${domain(c)}’s SPF record`, `${c.ip} steht im SPF-Eintrag von ${domain(c)}`) : tr(`${c.ip} is NOT allowed to send for ${domain(c)}`, `${c.ip} darf NICHT für ${domain(c)} senden`), n >= 1)}
      ${row('DKIM', c.dkim, c.dkim ? tr('signature verified with the public key in DNS', 'Signatur mit dem öffentlichen Schlüssel aus dem DNS bestätigt') : tr('no valid signature for this domain', 'keine gültige Signatur für diese Domain'), n >= 2)}
      ${row('DMARC', dmarc, dmarc ? tr('at least one of SPF/DKIM passed and matches the From: domain', 'mindestens SPF oder DKIM bestanden und passt zur From:-Domain') : tr(`policy p=reject → refuse the message`, `Richtlinie p=reject → Nachricht ablehnen`), n >= 3)}
      ${n >= 4 ? `<div class="callout ${c.verdict === 'inbox' ? '' : 'warn'}" style="margin:12px 0 0"><span class="ci">${c.verdict === 'inbox' ? '📥' : '🚫'}</span><div><p>${c.verdict === 'inbox' ? tr('Delivered to the inbox.', 'Im Posteingang zugestellt.') : tr('Rejected: 550 5.7.1 DMARC policy violation.', 'Abgelehnt: 550 5.7.1 DMARC-Richtlinie verletzt.')}</p></div></div>` : ''}`;
  }
  async function send() {
    const id = ++run;
    const c = MAIL_CASES[cur], d = domain(c);
    $('#em-log', body).innerHTML = '';
    checks(c, 0);
    const step = async (html, ms = 420) => { if (id !== run) throw 0; log(html); await sleep(ms); };
    try {
      if (cur === 'spoof') await step(`<span class="r">${tr('A botnet machine pretends to be', 'Ein Botnetz-Rechner gibt sich aus als')} ${c.from}</span>`);
      else if (cur === 'fwd') await step(`<span class="y">${tr('Mail from ada@lovelace.org was forwarded by a university mail server', 'Die Mail von ada@lovelace.org wurde von einem Uni-Mailserver weitergeleitet')} (${c.ip})</span>`);
      else await step(`<span class="t">${tr('Ada’s mail app submits the message to smtp.lovelace.org:587 (authenticated)', 'Adas Mailprogramm liefert die Nachricht an smtp.lovelace.org:587 ein (mit Login)')}</span>`);
      await step(`<span class="v">$ dig MX mail.example</span>`);
      await step(`<span class="g">mail.example. 3600 IN MX 10 mx1.mail.example.</span>`);
      await step(`<span class="t">${tr('connect', 'Verbindung')} ${c.ip} → mx1.mail.example:25</span>`);
      await step('<span class="g">S: 220 mx1.mail.example ESMTP</span>');
      await step(`C: EHLO ${cur === 'spoof' ? 'bank-secure.example' : 'smtp.' + d}`);
      await step('<span class="g">S: 250-mx1.mail.example 250-STARTTLS</span>');
      await step('C: STARTTLS <span class="t">🔒</span>');
      await step(`C: MAIL FROM:&lt;${c.from}&gt;`);
      await step('C: RCPT TO:&lt;grace@mail.example&gt;');
      await step('C: DATA <span class="t">(headers, DKIM-Signature, body)</span>');
      await step(`<span class="v">$ dig TXT ${d}</span> <span class="t">→ "v=spf1 ip4:198.51.100.0/24 -all"</span>`, 500); checks(c, 1);
      await step(`<span class="v">$ dig TXT sel1._domainkey.${d}</span> <span class="t">→ "v=DKIM1; k=ed25519; p=…"</span>`, 500); checks(c, 2);
      await step(`<span class="v">$ dig TXT _dmarc.${d}</span> <span class="t">→ "v=DMARC1; p=reject"</span>`, 500); checks(c, 3);
      await step(c.verdict === 'inbox' ? '<span class="g">S: 250 OK: queued as 4F2A9</span>' : '<span class="r">S: 550 5.7.1 Message rejected by DMARC policy</span>', 300); checks(c, 4);
      $('#em-foot', w).innerHTML = cur === 'fwd'
        ? tr('Forwarding breaks SPF (new sending IP) — but the DKIM signature survives, so DMARC still passes.', 'Weiterleiten bricht SPF (neue Absender-IP) – aber die DKIM-Signatur bleibt gültig, also besteht DMARC trotzdem.')
        : cur === 'spoof' ? tr('SMTP itself never verifies the sender. SPF, DKIM and DMARC (all published in DNS) are what stop this.', 'SMTP selbst prüft den Absender nie. SPF, DKIM und DMARC (alle im DNS veröffentlicht) halten das auf.')
          : tr('Mail travels server to server over SMTP; DNS tells everyone where to deliver (MX) and how to verify (TXT).', 'Mail reist per SMTP von Server zu Server; das DNS sagt, wohin zugestellt wird (MX) und wie man prüft (TXT).');
      store.award(`mail-${cur}`, 5, tr('Traced a mail', 'Mail verfolgt'));
    } catch { /* superseded by a new run */ }
  }
  $$('#em-case button', w).forEach((b) => b.addEventListener('click', () => { $$('#em-case button', w).forEach((x) => x.classList.toggle('on', x === b)); cur = b.dataset.c; send(); }));
  $('#em-go', w).onclick = send;
  checks(MAIL_CASES.legit, 0);
  $('#em-foot', w).innerHTML = tr('Pick a scenario and press Send.', 'Wähle ein Szenario und drück Senden.');
}
