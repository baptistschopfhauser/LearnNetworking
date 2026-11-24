import { $, $$, loop, setupCanvas, widgetShell, COLORS, store, sleep, onCleanup } from '../core.js';

/* =========================================================
   TCP sequence diagram simulator with loss & retransmission
   ========================================================= */
function simulateTCP(nSeg, W, loss) {
  const D = 4, RTO = 2 * D + 3;
  const ev = [];
  const lost = () => Math.random() < loss;
  ev.push({ dir: 'cs', t0: 0, t1: D, label: 'SYN seq=x', kind: 'ctl' });
  ev.push({ dir: 'sc', t0: D, t1: 2 * D, label: 'SYN-ACK seq=y ack=x+1', kind: 'ctl' });
  ev.push({ dir: 'cs', t0: 2 * D, t1: 3 * D, label: 'ACK ack=y+1', kind: 'ctl' });
  let base = 0, next = 0, expected = 0;
  const received = new Set(), sentAt = [], arrivals = [];
  let sends = 0, retrans = 0, time = 2 * D + 1;
  for (; base < nSeg && time < 400; time++) {
    for (const a of arrivals.filter((x) => x.time === time)) {
      if (a.type === 'data') {
        received.add(a.n);
        while (received.has(expected)) expected++;
        const l = lost();
        ev.push({ dir: 'sc', t0: time, t1: time + D, label: `ACK ${expected}`, kind: 'ack', lost: l });
        if (!l) arrivals.push({ time: time + D, type: 'ack', n: expected });
      } else if (a.n > base) base = a.n;
    }
    if (base >= nSeg) break;
    // timeout → retransmit oldest unacked (priority), else send new data if window allows
    let sent = false;
    for (let i = base; i < next; i++) {
      if (time - sentAt[i] >= RTO) {
        const l = lost();
        ev.push({ dir: 'cs', t0: time, t1: time + D, label: `DATA #${i} (retransmit)`, kind: 'retx', lost: l, timeout: true });
        if (!l) arrivals.push({ time: time + D, type: 'data', n: i });
        sentAt[i] = time; retrans++; sends++; sent = true;
        break;
      }
    }
    if (!sent && next < nSeg && next < base + W) {
      const l = lost();
      ev.push({ dir: 'cs', t0: time, t1: time + D, label: `DATA #${next}`, kind: 'data', lost: l });
      if (!l) arrivals.push({ time: time + D, type: 'data', n: next });
      sentAt[next] = time; next++; sends++;
    }
  }
  const tf = time + 1;
  ev.push({ dir: 'cs', t0: tf, t1: tf + D, label: 'FIN', kind: 'ctl' });
  ev.push({ dir: 'sc', t0: tf + D, t1: tf + 2 * D, label: 'ACK + FIN', kind: 'ctl' });
  ev.push({ dir: 'cs', t0: tf + 2 * D, t1: tf + 3 * D, label: 'ACK', kind: 'ctl' });
  return { ev, sends, retrans, end: tf + 3 * D };
}

export function tcp(mount) {
  const w = widgetShell('tcp.trace', {
    controls: `<label class="mono" style="font-size:.75rem;color:var(--muted);display:flex;gap:8px;align-items:center">loss <input type="range" id="tcp-loss" min="0" max="40" value="15" style="width:90px"><b id="tcp-lossv" style="color:var(--orange)">15%</b></label>
      <div class="seg" id="tcp-w"><button data-w="1">stop&wait</button><button data-w="3" class="on">window 3</button><button data-w="5">window 5</button></div>
      <button class="btn small" id="tcp-run">▶ Run</button>`,
    foot: '<span id="tcp-foot">Press Run to open a connection and send 6 segments.</span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  body.innerHTML = `<div class="seq" style="max-height:520px;overflow-y:auto" id="tcp-scroll"><svg id="tcp-svg" viewBox="0 0 600 120"></svg></div>`;
  const svg = $('#tcp-svg', body), scroll = $('#tcp-scroll', body);
  let W = 3, running = 0;
  $('#tcp-loss', w).addEventListener('input', (e) => ($('#tcp-lossv', w).textContent = e.target.value + '%'));
  $$('#tcp-w button', w).forEach((b) => b.addEventListener('click', () => { $$('#tcp-w button', w).forEach((x) => x.classList.toggle('on', x === b)); W = +b.dataset.w; }));

  const S = 14, X1 = 120, X2 = 480, TOP = 50;
  const colorOf = (e) => (e.kind === 'ctl' ? COLORS.violet : e.kind === 'ack' ? COLORS.sky : e.kind === 'retx' ? COLORS.orange : COLORS.mint);

  async function run() {
    const id = ++running;
    const loss = +$('#tcp-loss', w).value / 100;
    const sim = simulateTCP(6, W, loss);
    const H = TOP + sim.end * S + 40;
    svg.setAttribute('viewBox', `0 0 600 ${H}`);
    svg.innerHTML = `<defs>${['mint', 'sky', 'violet', 'orange'].map((c) => `<marker id="ar-${c}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COLORS[c]}"/></marker>`).join('')}</defs>
      <text x="${X1}" y="24" text-anchor="middle" fill="${COLORS.text}" font-family="Bricolage Grotesque" font-weight="800" font-size="16">Client</text>
      <text x="${X2}" y="24" text-anchor="middle" fill="${COLORS.text}" font-family="Bricolage Grotesque" font-weight="800" font-size="16">Server</text>
      <line x1="${X1}" y1="34" x2="${X1}" y2="${H - 10}" stroke="${COLORS.line}" stroke-width="2"/>
      <line x1="${X2}" y1="34" x2="${X2}" y2="${H - 10}" stroke="${COLORS.line}" stroke-width="2"/>
      <g id="tcp-evs"></g>`;
    const g = $('#tcp-evs', svg);
    const evs = [...sim.ev].sort((a, b) => a.t0 - b.t0);
    $('#tcp-foot', w).textContent = 'running…';
    for (const e of evs) {
      if (id !== running) return;
      const c = colorOf(e);
      const cname = e.kind === 'ctl' ? 'violet' : e.kind === 'ack' ? 'sky' : e.kind === 'retx' ? 'orange' : 'mint';
      const [xa, xb] = e.dir === 'cs' ? [X1, X2] : [X2, X1];
      const ya = TOP + e.t0 * S, yb = TOP + e.t1 * S;
      const xe = e.lost ? xa + (xb - xa) * 0.55 : xb, ye = e.lost ? ya + (yb - ya) * 0.55 : yb;
      const len = Math.hypot(xe - xa, ye - ya);
      const mid = { x: (xa + xb) / 2, y: (ya + yb) / 2 };
      const ang = (Math.atan2(yb - ya, xb - xa) * 180) / Math.PI;
      const flip = e.dir === 'sc' ? ang + 180 : ang;
      g.insertAdjacentHTML('beforeend', `<g>
        ${e.timeout ? `<text x="${X1 - 12}" y="${ya + 4}" text-anchor="end" fill="${COLORS.orange}" font-family="JetBrains Mono" font-size="10">⏱ timeout</text>` : ''}
        <line x1="${xa}" y1="${ya}" x2="${xe}" y2="${ye}" stroke="${c}" stroke-width="2" ${e.lost ? '' : `marker-end="url(#ar-${cname})"`} stroke-dasharray="${len}" stroke-dashoffset="${len}">
          <animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="0.45s" fill="freeze"/></line>
        ${e.lost ? `<text x="${xe}" y="${ye + 5}" text-anchor="middle" fill="${COLORS.danger}" font-size="16" font-weight="800">✕<animate attributeName="opacity" from="0" to="1" begin="0.4s" dur="0.2s" fill="freeze"/></text>` : ''}
        <text transform="translate(${mid.x},${mid.y - 6}) rotate(${flip})" text-anchor="middle" fill="${e.lost ? COLORS.danger : c}" font-family="JetBrains Mono" font-size="11" font-weight="600">${e.label}${e.lost ? ' — lost' : ''}</text>
      </g>`);
      scroll.scrollTop = Math.max(0, ya - 200);
      await sleep(e.kind === 'ctl' ? 420 : 260);
    }
    const eff = Math.round((6 / sim.sends) * 100);
    $('#tcp-foot', w).innerHTML = `done in <b style="color:${COLORS.text}">${sim.end}</b> ticks · ${sim.sends} data sends · <b style="color:${sim.retrans ? COLORS.orange : COLORS.mint}">${sim.retrans} retransmissions</b> · efficiency ${eff}% · <span style="color:var(--muted)">ACK n = "I have everything before #n"</span>`;
    store.award('tcp-run', 10, 'Watched TCP deliver reliably');
    if (sim.retrans >= 3) store.award('tcp-lossy', 10, 'TCP survived a lossy link');
  }
  $('#tcp-run', w).onclick = run;
  onCleanup(() => { running++; });
}

/* =========================================================
   Congestion window chart (slow start / AIMD)
   ========================================================= */
export function cwnd(mount) {
  const w = widgetShell('tcp.cwnd', {
    controls: `<button class="btn small orange" id="cw-loss">💥 Packet loss</button><button class="btn small ghost" id="cw-to">⏱ Timeout</button><button class="btn small ghost" id="cw-reset">↺</button>`,
    foot: '<span id="cw-foot"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  const canvas = document.createElement('canvas');
  body.appendChild(canvas);
  const { ctx, size } = setupCanvas(canvas, 0.38, 240);
  let hist, cw, ss, acc, pending, phase;
  const reset = () => { hist = [{ cw: 1, ss: 32, ev: null }]; cw = 1; ss = 32; acc = 0; pending = null; phase = 'slow start'; };
  reset();
  $('#cw-loss', w).onclick = () => (pending = 'loss');
  $('#cw-to', w).onclick = () => (pending = 'timeout');
  $('#cw-reset', w).onclick = reset;
  const MAXR = 60, CAP = 64;

  loop((dt) => {
    acc += dt;
    if (acc > 0.35) {
      acc = 0;
      let ev = null;
      if (cw >= CAP) pending = pending || 'loss'; // the "network" drops when we exceed capacity
      if (pending === 'loss') { ss = Math.max(2, Math.floor(cw / 2)); cw = ss; phase = 'fast recovery → congestion avoidance'; ev = 'loss'; store.award('cwnd-loss', 5, 'Multiplicative decrease!'); }
      else if (pending === 'timeout') { ss = Math.max(2, Math.floor(cw / 2)); cw = 1; phase = 'timeout → slow start'; ev = 'timeout'; }
      else if (cw < ss) { cw = Math.min(ss, cw * 2); phase = 'slow start (×2 per RTT)'; }
      else { cw += 1; phase = 'congestion avoidance (+1 per RTT)'; }
      pending = null;
      hist.push({ cw, ss, ev });
      if (hist.length > MAXR) hist.shift();
      $('#cw-foot', w).innerHTML = `cwnd <b style="color:${COLORS.mint}">${cw}</b> segments · ssthresh <b style="color:${COLORS.violet}">${ss}</b> · <span style="color:${COLORS.yellow}">${phase}</span> · link capacity ≈ ${CAP}`;
    }
    const W = size.w, H = size.h, pl = 40, pr = 16, pt = 16, pb = 26;
    ctx.clearRect(0, 0, W, H);
    const xs = (i) => pl + (i / (MAXR - 1)) * (W - pl - pr);
    const ys = (v) => H - pb - (v / (CAP + 6)) * (H - pt - pb);
    ctx.strokeStyle = 'rgba(160,175,220,0.08)'; ctx.fillStyle = COLORS.muted; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'right';
    [0, 16, 32, 48, 64].forEach((v) => { ctx.beginPath(); ctx.moveTo(pl, ys(v)); ctx.lineTo(W - pr, ys(v)); ctx.stroke(); ctx.fillText(v, pl - 6, ys(v) + 3); });
    ctx.textAlign = 'center'; ctx.fillText('time (RTTs) →', W / 2, H - 6);
    ctx.strokeStyle = 'rgba(255,84,112,0.5)'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pl, ys(CAP)); ctx.lineTo(W - pr, ys(CAP)); ctx.stroke();
    // ssthresh
    ctx.strokeStyle = COLORS.violet; ctx.beginPath(); hist.forEach((p, i) => (i ? ctx.lineTo(xs(i), ys(p.ss)) : ctx.moveTo(xs(i), ys(p.ss)))); ctx.stroke(); ctx.setLineDash([]);
    // area
    const grd = ctx.createLinearGradient(0, pt, 0, H - pb); grd.addColorStop(0, 'rgba(92,242,194,0.35)'); grd.addColorStop(1, 'rgba(92,242,194,0)');
    ctx.beginPath(); ctx.moveTo(xs(0), ys(0)); hist.forEach((p, i) => ctx.lineTo(xs(i), ys(p.cw))); ctx.lineTo(xs(hist.length - 1), ys(0)); ctx.fillStyle = grd; ctx.fill();
    ctx.beginPath(); hist.forEach((p, i) => (i ? ctx.lineTo(xs(i), ys(p.cw)) : ctx.moveTo(xs(i), ys(p.cw)))); ctx.strokeStyle = COLORS.mint; ctx.lineWidth = 2.5; ctx.stroke(); ctx.lineWidth = 1;
    hist.forEach((p, i) => { if (p.ev) { ctx.fillStyle = p.ev === 'loss' ? COLORS.orange : COLORS.danger; ctx.beginPath(); ctx.arc(xs(i), ys(p.cw), 5, 0, Math.PI * 2); ctx.fill(); } });
  }, canvas);
}
