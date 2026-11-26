import { $, widgetShell, store, sleep, esc, rand, onCleanup } from '../core.js';
import { tr } from '../i18n.js';
// Command output stays English, like a real Linux terminal; missions, help and explanations are translated.

/* ---------------------------------------------------------
   A simulated Linux laptop: 192.168.1.42/24 behind a home router.
   --------------------------------------------------------- */
const ME = { ip: '192.168.1.42', mask: 24, gw: '192.168.1.1', mac: '3c:22:fb:9a:10:4e', dns: '1.1.1.1', ip6: '2001:db8:42::42' };

const HOSTS = {
  'example.com': { ip: '93.184.215.14', ip6: '2606:2800:21f:cb07::1', hops: 9, rtt: 18, mx: '0 .', ns: ['a.iana-servers.net', 'b.iana-servers.net'], txt: '"v=spf1 -all"', ports: [80, 443], server: 'ECS (nyd/D11E)' },
  'www.example.com': { cname: 'example.com' },
  'wikipedia.org': { ip: '185.15.58.224', ip6: '2a02:ec80:600:ed1a::1', hops: 11, rtt: 24, mx: '10 mx1001.wikimedia.org.', ns: ['ns0.wikimedia.org', 'ns1.wikimedia.org'], txt: '"v=spf1 include:wikimedia.org ~all"', ports: [80, 443], server: 'ATS/9.2' },
  'google.com': { ip: '142.250.179.110', ip6: '2a00:1450:4007:80c::200e', hops: 8, rtt: 9, mx: '10 smtp.google.com.', ns: ['ns1.google.com', 'ns2.google.com'], txt: '"v=spf1 include:_spf.google.com ~all"', ports: [80, 443], server: 'gws' },
  'one.one.one.one': { ip: '1.1.1.1', ip6: '2606:4700:4700::1111', hops: 6, rtt: 6, ports: [53, 443], server: 'cloudflare' },
  'dns.google': { ip: '8.8.8.8', ip6: '2001:4860:4860::8888', hops: 7, rtt: 8, ports: [53, 443], server: 'HTTP server (unknown)' },
  'nas.home': { ip: '192.168.1.20', hops: 1, rtt: 1, ports: [22, 445, 5000], local: true, mac: 'b8:27:eb:12:34:56' },
  'printer.home': { ip: '192.168.1.30', hops: 1, rtt: 2, ports: [631, 9100], local: true, mac: '00:1b:a9:77:01:02' },
  'router.home': { ip: '192.168.1.1', hops: 1, rtt: 1, ports: [53, 80, 443], local: true, mac: 'f4:f2:6d:aa:bb:01', server: 'lighttpd' },
  'blackhole.example': { ip: '203.0.113.99', hops: 12, rtt: 40, ports: [], blackhole: true },
};
const BY_IP = Object.fromEntries(Object.entries(HOSTS).filter(([, v]) => v.ip).map(([k, v]) => [v.ip, k]));
const PATH = ['192.168.1.1  (router.home)', '100.64.0.1', 'bras1.par.isp.net (80.10.0.1)', 'core1.par.isp.net (80.10.255.2)', 'ae-4.ix.paris.net (37.49.236.10)', 'be2.cr1.fra.transit.net (154.54.36.1)', 'be7.cr2.ams.transit.net (154.54.58.2)', 'edge1.ams.cdn.net (62.115.0.9)', 'edge2.lon.cdn.net (62.115.3.3)', 'ae-1.lon.backbone.net (4.69.0.1)', 'core3.nyc.backbone.net (4.69.1.4)'];
const LISTEN = [['tcp', '127.0.0.1:631', 'cupsd'], ['tcp', '0.0.0.0:22', 'sshd'], ['tcp', '127.0.0.1:5432', 'postgres'], ['udp', '127.0.0.53:53', 'systemd-resolve'], ['udp', '0.0.0.0:68', 'dhclient'], ['tcp', '0.0.0.0:8080', 'python3 -m http.server']];

const MISSIONS = [
  { id: 'gw', text: tr('Find your default gateway', 'Finde dein Default-Gateway'), hint: 'ip route', test: (c) => /^(ip r(oute)?|route( -n)?|netstat -rn?)\b/.test(c) },
  { id: 'myip', text: tr('Find your own IP address', 'Finde deine eigene IP-Adresse'), hint: 'ip addr', test: (c) => /^(ip a(ddr)?|ifconfig|ipconfig|hostname -I)\b/.test(c) },
  { id: 'ping', text: tr('Check you can reach example.com', 'Prüfe, ob du example.com erreichst'), hint: 'ping example.com', test: (c) => /^ping\b.*example\.com/.test(c) },
  { id: 'mx', text: tr('Find the mail server (MX) of google.com', 'Finde den Mailserver (MX) von google.com'), hint: 'dig google.com MX', test: (c) => /^(dig|nslookup|host)\b.*google\.com.*mx|^(dig|nslookup|host)\b.*mx.*google\.com|nslookup -type=mx google\.com/i.test(c) },
  { id: 'trace', text: tr('Trace the route to wikipedia.org', 'Verfolge den Weg zu wikipedia.org'), hint: 'traceroute wikipedia.org', test: (c) => /^(traceroute|tracert|mtr)\b.*wikipedia\.org/.test(c) },
  { id: 'arp', text: tr('Show the MAC addresses your laptop knows', 'Zeig die MAC-Adressen, die dein Laptop kennt'), hint: 'arp -a', test: (c) => /^(arp|ip n(eigh)?)\b/.test(c) },
  { id: 'ports', text: tr('Which local port is the web server listening on?', 'Auf welchem lokalen Port lauscht der Webserver?'), hint: 'ss -tuln', test: (c) => /^(ss|netstat)\b.*l/.test(c) },
  { id: 'nas', text: tr('Is SSH (port 22) open on nas.home?', 'Ist SSH (Port 22) auf nas.home offen?'), hint: 'nc -zv nas.home 22', test: (c) => /^(nc|ncat|telnet)\b.*nas\.home.*22/.test(c) },
  { id: 'curl', text: tr('Get the HTTP headers of wikipedia.org', 'Hol die HTTP-Header von wikipedia.org'), hint: 'curl -I https://wikipedia.org', test: (c) => /^curl\b.*-I.*wikipedia\.org|^curl\b.*wikipedia\.org.*-I/.test(c) },
  { id: 'broken', text: tr('Diagnose: why does blackhole.example not load?', 'Diagnose: Warum lädt blackhole.example nicht?'), hint: tr('ping / traceroute / nc it', 'mit ping / traceroute / nc prüfen'), test: (c) => /blackhole\.example/.test(c) && /^(traceroute|mtr|nc|curl)/.test(c) },
];

const COMMANDS = ['help', 'clear', 'history', 'ip addr', 'ip route', 'ip neigh', 'ifconfig', 'arp -a', 'ping', 'traceroute', 'mtr', 'dig', 'nslookup', 'host', 'curl -I', 'nc -zv', 'ss -tuln', 'netstat -tuln', 'whoami', 'hostname', 'cat /etc/resolv.conf', 'cat /etc/hosts', 'missions'];

function resolve(name) {
  name = name.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return { name: BY_IP[name] || name, ip: name, h: HOSTS[BY_IP[name]] || (name === ME.gw ? HOSTS['router.home'] : null) };
  let h = HOSTS[name];
  const chain = [];
  while (h && h.cname) { chain.push([name, h.cname]); name = h.cname; h = HOSTS[name]; }
  return h ? { name, ip: h.ip, h, chain } : null;
}

export function terminal(mount) {
  const w = widgetShell('ada@laptop: ~', { foot: `<span id="term-foot">${tr('Type <b>help</b> to see every command · <b>missions</b> to see your goals', 'Tippe <b>help</b> für alle Befehle · <b>missions</b> für deine Ziele')}</span>` });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  body.innerHTML = `<div class="term-grid">
    <div class="term" id="term"><div id="term-out"></div><div class="term-line"><span class="term-ps">ada@laptop:~$</span><input id="term-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="terminal input"></div></div>
    <aside class="term-missions"><h4>${tr('Missions', 'Missionen')} <span id="term-count" class="tag mint">0/${MISSIONS.length}</span></h4><ol id="term-ms"></ol></aside>
  </div>`;
  const out = $('#term-out', body), input = $('#term-in', body), term = $('#term', body);
  const done = new Set(MISSIONS.filter((m) => store.get().awarded['term-' + m.id]).map((m) => m.id));
  const hist = [];
  let hi = 0, busy = false, alive = true;
  onCleanup(() => (alive = false));

  const renderMissions = () => {
    $('#term-ms', body).innerHTML = MISSIONS.map((m) => `<li class="${done.has(m.id) ? 'ok' : ''}"><span>${esc(m.text)}</span><button class="term-hint" data-h="${esc(m.hint)}" title="${tr('Show hint', 'Tipp zeigen')}">?</button></li>`).join('');
    $('#term-count', body).textContent = `${done.size}/${MISSIONS.length}`;
  };
  renderMissions();
  body.addEventListener('click', (e) => {
    const b = e.target.closest('.term-hint');
    if (b) { input.value = b.dataset.h.includes('/') && !b.dataset.h.startsWith('curl') ? '' : b.dataset.h; if (!input.value) print(`<span class="t">${tr('hint', 'Tipp')}: ${esc(b.dataset.h)}</span>`); input.focus(); return; }
    if (e.target.closest('#term')) input.focus({ preventScroll: true });
  });

  const print = (html = '') => { const d = document.createElement('div'); d.innerHTML = html; out.appendChild(d); term.scrollTop = term.scrollHeight; };
  const slow = async (lines, ms = 220) => { for (const l of lines) { if (!alive) return; print(l); await sleep(ms); } };

  print(`<span class="g">PacketCraft OS 1.0</span> <span class="t">— ${tr('simulated terminal. Nothing here touches your real network.', 'simuliertes Terminal. Nichts hier berührt dein echtes Netz.')}</span>`);
  print(`<span class="t">${tr('Try', 'Probier')}: </span><span class="y">ip addr</span><span class="t">, </span><span class="y">ping example.com</span><span class="t">, </span><span class="y">dig google.com MX</span><span class="t">, </span><span class="y">traceroute wikipedia.org</span>`);
  print('');

  async function run(raw) {
    const cmd = raw.trim();
    print(`<span class="term-ps">ada@laptop:~$</span> ${esc(cmd)}`);
    if (!cmd) return;
    hist.push(cmd); hi = hist.length;
    const args = cmd.split(/\s+/);
    const c = args[0].toLowerCase();
    const lc = cmd.toLowerCase();
    try { await exec(c, args, lc); } catch (e) { print(`<span class="r">error: ${esc(e.message)}</span>`); }
    for (const m of MISSIONS) if (!done.has(m.id) && m.test(lc)) {
      done.add(m.id); renderMissions();
      store.award("term-" + m.id, 10, `Mission: ${m.text}`);
      if (done.size === MISSIONS.length) store.award('term-all', 40, tr('Terminal master — all missions', 'Terminal-Meister – alle Missionen'));
    }
    print('');
  }

  async function exec(c, args, lc) {
    const target = args.slice(1).filter((a) => !a.startsWith('-') && !/^\d+$/.test(a) && !/^(mx|a|aaaa|ns|txt|cname|any)$/i.test(a))[0];
    switch (c) {
      case 'help':
        print(`<span class="v">${tr('Network', 'Netzwerk')}</span>   ip addr · ip route · ip neigh · arp -a · ifconfig`);
        print(`<span class="v">${tr('Reach', 'Erreichbar')}</span>     ping &lt;host&gt; [-c n] · traceroute &lt;host&gt; · mtr &lt;host&gt;`);
        print('<span class="v">DNS</span>       dig &lt;name&gt; [A|AAAA|MX|NS|TXT] · nslookup &lt;name&gt; · host &lt;name&gt; · dig +trace &lt;name&gt;');
        print(`<span class="v">${tr('Services', 'Dienste')}</span>  nc -zv &lt;host&gt; &lt;port&gt; · curl -I &lt;url&gt; · ss -tuln`);
        print(`<span class="v">${tr('Files', 'Dateien')}</span>     cat /etc/resolv.conf · cat /etc/hosts`);
        print('<span class="v">Shell</span>     clear · history · missions · whoami · hostname');
        print(`<span class="t">${tr('Known hosts', 'Bekannte Hosts')}: example.com, www.example.com, wikipedia.org, google.com, one.one.one.one, dns.google, nas.home, printer.home, router.home, blackhole.example</span>`);
        return;
      case 'clear': out.innerHTML = ''; return;
      case 'history': hist.forEach((h, i) => print(`${String(i + 1).padStart(4)}  ${esc(h)}`)); return;
      case 'missions': MISSIONS.forEach((m) => print(`${done.has(m.id) ? '<span class="g">✓</span>' : '<span class="t">○</span>'} ${esc(m.text)}`)); return;
      case 'whoami': print('ada'); return;
      case 'hostname': print(args[1] === '-I' ? ME.ip : 'laptop'); return;
      case 'sudo': print('<span class="r">ada is not in the sudoers file. This incident will be reported.</span> 😉'); return;
      case 'cat':
        if (args[1] === '/etc/resolv.conf') { print('<span class="t"># Generated by NetworkManager (DHCP)</span>'); print(`nameserver ${ME.dns}`); print('search home'); return; }
        if (args[1] === '/etc/hosts') { print('127.0.0.1   localhost'); print('::1         localhost'); print('127.0.1.1   laptop'); return; }
        print(`cat: ${esc(args[1] || '')}: No such file or directory`); return;
      case 'ip':
        if (/^a/.test(args[1] || '')) return ipAddr();
        if (/^r/.test(args[1] || '')) return ipRoute();
        if (/^n/.test(args[1] || '')) return arp(true);
        print('Usage: ip [ addr | route | neigh ]'); return;
      case 'ifconfig': case 'ipconfig': return ipAddr();
      case 'route': case 'netstat':
        if (c === 'netstat' && /l/.test(args[1] || '')) return listening();
        return ipRoute(true);
      case 'arp': return arp(false);
      case 'ss': return listening();
      case 'ping': return ping(target, +(args[args.indexOf('-c') + 1]) || 4, lc.includes('-6'));
      case 'traceroute': case 'tracert': case 'mtr': return trace(target);
      case 'dig': return dig(args, lc);
      case 'nslookup': case 'host': return nslookup(c, args, lc);
      case 'curl': return curl(target, lc);
      case 'nc': case 'ncat': case 'telnet': return nc(args);
      case 'exit': print(tr('There is no escape. Try <span class="y">help</span>.', 'Es gibt kein Entkommen. Probier <span class="y">help</span>.')); return;
      default: print(`<span class="r">${esc(c)}: command not found</span> <span class="t">— ${tr('type help', 'tippe help')}</span>`);
    }
  }

  function ipAddr() {
    print('1: <span class="y">lo</span>: &lt;LOOPBACK,UP&gt; mtu 65536');
    print('    inet <span class="g">127.0.0.1/8</span> scope host lo');
    print('2: <span class="y">wlan0</span>: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 state UP');
    print(`    link/ether <span class="v">${ME.mac}</span> brd ff:ff:ff:ff:ff:ff`);
    print(`    inet <span class="g">${ME.ip}/${ME.mask}</span> brd 192.168.1.255 scope global dynamic wlan0 <span class="t">(${tr('DHCP lease 86400s', 'DHCP-Lease 86400 s')})</span>`);
    print(`    inet6 <span class="g">${ME.ip6}/64</span> scope global dynamic`);
    print('    inet6 fe80::3e22:fbff:fe9a:104e/64 scope link');
  }
  function ipRoute(classic) {
    if (classic) {
      print('Destination     Gateway         Genmask         Flags Iface');
      print(`0.0.0.0         <span class="g">${ME.gw}</span>     0.0.0.0         UG    wlan0`);
      print('192.168.1.0     0.0.0.0         255.255.255.0   U     wlan0');
      return;
    }
    print(`<span class="g">default via ${ME.gw}</span> dev wlan0 proto dhcp metric 600`);
    print('192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.42');
    print(`<span class="t"># ${tr('"default via" = your default gateway: everything not on 192.168.1.0/24 goes there', '„default via“ = dein Default-Gateway: alles außerhalb von 192.168.1.0/24 geht dorthin')}</span>`);
  }
  function arp(neigh) {
    const rows = [['router.home', HOSTS['router.home']], ['nas.home', HOSTS['nas.home']], ['printer.home', HOSTS['printer.home']]];
    rows.forEach(([n, h]) => print(neigh ? `${h.ip} dev wlan0 lladdr <span class="v">${h.mac}</span> REACHABLE` : `${n} (${h.ip}) at <span class="v">${h.mac}</span> [ether] on wlan0`));
  }
  function listening() {
    print('Netid State  Local Address:Port       Process');
    LISTEN.forEach(([p, a, proc]) => print(`${p.padEnd(5)} ${p === 'udp' ? 'UNCONN' : 'LISTEN'} ${a.padEnd(24)} <span class="${proc.includes('http') ? 'g' : 't'}">${proc}</span>`));
    print(`<span class="t"># ${tr('0.0.0.0 = reachable from the network · 127.0.0.1 = this machine only', '0.0.0.0 = aus dem Netz erreichbar · 127.0.0.1 = nur dieser Rechner')}</span>`);
  }
  async function ping(target, count, v6) {
    if (!target) return print('ping: usage error: Destination address required');
    const r = resolve(target);
    if (!r) return print(`ping: ${esc(target)}: <span class="r">Name or service not known</span> <span class="t">(${tr('DNS lookup failed', 'DNS-Abfrage fehlgeschlagen')})</span>`);
    const h = r.h || { rtt: 30, hops: 10 };
    const ip = v6 ? h.ip6 : r.ip;
    if (!ip) return print(`ping: ${esc(target)}: Address family for hostname not supported`);
    print(`PING ${esc(r.name)} (${ip}) 56(84) bytes of data.`);
    const n = Math.min(count, 8);
    let ok = 0; const times = [];
    for (let i = 1; i <= n; i++) {
      await sleep(h.blackhole ? 900 : 420);
      if (!alive) return;
      if (h.blackhole) { print(`<span class="r">Request timeout for icmp_seq ${i}</span>`); continue; }
      const t = +(h.rtt + Math.random() * h.rtt * 0.25).toFixed(1);
      times.push(t); ok++;
      print(`64 bytes from ${esc(r.name)} (${ip}): icmp_seq=${i} ttl=<span class="y">${(h.local ? 64 : 64) - h.hops + 1}</span> time=<span class="g">${t} ms</span>`);
    }
    print(`--- ${esc(r.name)} ping statistics ---`);
    const loss = Math.round(((n - ok) / n) * 100);
    print(`${n} packets transmitted, ${ok} received, <span class="${loss ? 'r' : 'g'}">${loss}% packet loss</span>`);
    if (times.length) print(`rtt min/avg/max = ${Math.min(...times)}/${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)}/${Math.max(...times)} ms`);
    if (h.blackhole) print(`<span class="t"># ${tr('No replies, but DNS worked. Next: traceroute to see where packets die.', 'Keine Antworten, aber DNS ging. Als Nächstes: traceroute, um zu sehen, wo Pakete sterben.')}</span>`);
  }
  async function trace(target) {
    if (!target) return print('Usage: traceroute host');
    const r = resolve(target);
    if (!r) return print(`${esc(target)}: <span class="r">Name or service not known</span>`);
    const h = r.h || { hops: 10, rtt: 30 };
    print(`traceroute to ${esc(r.name)} (${r.ip}), 30 hops max, 60 byte packets`);
    if (h.local) { await sleep(300); print(` 1  ${esc(r.name)} (${r.ip})  ${h.rtt}.2 ms  ${h.rtt}.1 ms  ${h.rtt}.3 ms`); return; }
    const hops = h.blackhole ? 7 : h.hops - 1;
    for (let i = 0; i < hops; i++) {
      await sleep(260); if (!alive) return;
      const base = Math.round(1 + (h.rtt * (i + 1)) / h.hops);
      if (i === 2 && Math.random() < 0.6) { print(` ${String(i + 1).padStart(2)}  * * *  <span class="t">(${tr('router ignores probes — that’s normal', 'Router ignoriert Proben – das ist normal')})</span>`); continue; }
      const t = () => (base + Math.random() * 2).toFixed(1);
      print(` ${String(i + 1).padStart(2)}  ${PATH[i] || `hop${i}.net`}  ${t()} ms  ${t()} ms  ${t()} ms`);
    }
    if (h.blackhole) {
      for (let i = hops; i < hops + 4; i++) { await sleep(500); print(` ${String(i + 1).padStart(2)}  <span class="r">* * *</span>`); }
      print(`<span class="r"># ${tr('Packets die after hop 7: the destination network is unreachable (or drops everything).', 'Pakete sterben nach Hop 7: Das Zielnetz ist nicht erreichbar (oder verwirft alles).')}</span>`);
      print(`<span class="t"># ${tr('Diagnosis: DNS ✓, local network ✓, ISP path ✓ → the problem is on their side. Nothing to fix locally.', 'Diagnose: DNS ✓, lokales Netz ✓, Weg über den Provider ✓ → das Problem liegt auf deren Seite. Lokal nichts zu reparieren.')}</span>`);
      return;
    }
    await sleep(260);
    print(` ${String(hops + 1).padStart(2)}  <span class="g">${esc(r.name)} (${r.ip})</span>  ${h.rtt}.4 ms  ${h.rtt}.9 ms  ${h.rtt + 1}.1 ms`);
  }
  async function dig(args, lc) {
    const name = args.slice(1).find((a) => !a.startsWith('+') && !a.startsWith('@') && !/^(a|aaaa|mx|ns|txt|cname|any)$/i.test(a));
    let type = (args.slice(1).find((a) => /^(a|aaaa|mx|ns|txt|cname|any)$/i.test(a)) || 'A').toUpperCase();
    if (!name) return print(`<span class="t">${tr('usage: dig name [type] — e.g. dig example.com MX', 'Aufruf: dig Name [Typ] – z. B. dig example.com MX')}</span>`);
    const server = (args.find((a) => a.startsWith('@')) || '@' + ME.dns).slice(1);
    if (lc.includes('+trace')) return digTrace(name);
    await sleep(250);
    const short = lc.includes('+short');
    const r = resolve(name);
    const ans = [];
    if (r) {
      (r.chain || []).forEach(([a, b]) => ans.push(`${a}.\t3600\tIN\tCNAME\t${b}.`));
      const h = r.h, n = r.name;
      if (type === 'A' && r.ip) ans.push(`${n}.\t300\tIN\tA\t${r.ip}`);
      if (type === 'AAAA' && h.ip6) ans.push(`${n}.\t300\tIN\tAAAA\t${h.ip6}`);
      if (type === 'MX' && h.mx) ans.push(`${n}.\t3600\tIN\tMX\t${h.mx}`);
      if (type === 'NS' && h.ns) h.ns.forEach((x) => ans.push(`${n}.\t86400\tIN\tNS\t${x}.`));
      if (type === 'TXT' && h.txt) ans.push(`${n}.\t3600\tIN\tTXT\t${h.txt}`);
    }
    if (short) { ans.forEach((a) => print(a.split('\t').pop())); return; }
    print(`; &lt;&lt;&gt;&gt; DiG 9.18 &lt;&lt;&gt;&gt; ${esc(name)} ${type}`);
    print(`;; -&gt;&gt;HEADER&lt;&lt;- opcode: QUERY, status: <span class="${r ? 'g' : 'r'}">${r ? 'NOERROR' : 'NXDOMAIN'}</span>, id: ${rand(1000, 65000)}`);
    print(`;; flags: qr rd ra; QUERY: 1, ANSWER: ${ans.length}`);
    print(';; QUESTION SECTION:'); print(`;${esc(name)}.\t\tIN\t${type}`);
    if (ans.length) { print(';; ANSWER SECTION:'); ans.forEach((a) => print(`<span class="g">${esc(a)}</span>`)); }
    else if (r) print(`<span class="t">;; (${tr('no records of this type — try A, AAAA, MX, NS or TXT', 'keine Einträge dieses Typs – probier A, AAAA, MX, NS oder TXT')})</span>`);
    print(`;; Query time: ${rand(2, 40)} msec`);
    print(`;; SERVER: ${esc(server)}#53(${esc(server)}) (UDP)`);
  }
  async function digTrace(name) {
    const r = resolve(name);
    const tld = name.split('.').pop();
    await slow([
      `.\t\t\t518400\tIN\tNS\ta.root-servers.net.  <span class="t">(${tr('from local resolver', 'vom lokalen Resolver')})</span>`,
      `<span class="t">;; Received 239 bytes from 1.1.1.1#53 in 6 ms</span>`,
      `${tld}.\t\t172800\tIN\tNS\ta.gtld-servers.net.  <span class="t">(${tr('referral from root', 'Verweis von der Root')})</span>`,
      `<span class="t">;; Received 1172 bytes from 198.41.0.4#53(a.root-servers.net) in 14 ms</span>`,
      r?.h?.ns ? `${name}.\t172800\tIN\tNS\t${r.h.ns[0]}.  <span class="t">(${tr(`referral from .${tld}`, `Verweis von .${tld}`)})</span>` : `<span class="r">;; NXDOMAIN from .${tld} servers</span>`,
      r ? `<span class="g">${r.name}.\t300\tIN\tA\t${r.ip}</span>  <span class="t">(${tr('authoritative answer', 'autoritative Antwort')})</span>` : '',
    ], 380);
  }
  async function nslookup(c, args, lc) {
    const name = args.slice(1).find((a) => !a.startsWith('-'));
    if (!name) return print('usage: nslookup name');
    const mx = /mx/.test(lc);
    const r = resolve(name);
    await sleep(250);
    if (c === 'host') {
      if (!r) return print(`Host ${esc(name)} not found: 3(NXDOMAIN)`);
      if (mx) return print(r.h.mx ? `${r.name} mail is handled by ${r.h.mx}` : `${r.name} has no MX record`);
      print(`${r.name} has address ${r.ip}`); if (r.h.ip6) print(`${r.name} has IPv6 address ${r.h.ip6}`);
      if (r.h.mx) print(`${r.name} mail is handled by ${r.h.mx}`);
      return;
    }
    print(`Server:\t\t${ME.dns}`); print(`Address:\t${ME.dns}#53`); print('');
    if (!r) return print(`** server can't find ${esc(name)}: <span class="r">NXDOMAIN</span>`);
    print('Non-authoritative answer:');
    if (mx) return print(r.h.mx ? `${r.name}\tmail exchanger = <span class="g">${r.h.mx}</span>` : '*** No MX records');
    print(`Name:\t${r.name}`); print(`Address: <span class="g">${r.ip}</span>`); if (r.h.ip6) print(`Address: ${r.h.ip6}`);
  }
  async function curl(target, lc) {
    if (!target) return print('curl: try \'curl -I https://example.com\'');
    const https = !/^http:\/\//.test(target);
    const r = resolve(target);
    if (!r) return print(`curl: (6) Could not resolve host: ${esc(target.replace(/^https?:\/\//, ''))}`);
    if (r.h.blackhole) { await sleep(1500); return print('curl: (28) <span class="r">Failed to connect to blackhole.example port 443 after 10001 ms: Timeout was reached</span>'); }
    if (!r.h.ports.includes(https ? 443 : 80)) return print(`curl: (7) Failed to connect to ${r.name} port ${https ? 443 : 80}: <span class="r">Connection refused</span>`);
    await sleep(400);
    const head = lc.includes('-i') || lc.includes('-v') || lc.includes('--head');
    if (!head) { print(`<span class="t">&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;title&gt;${esc(r.name)}&lt;/title&gt;… (${tr('body truncated — use curl -I to see only headers', 'Inhalt gekürzt – curl -I zeigt nur die Header')})</span>`); return; }
    if (!https) { print('HTTP/1.1 <span class="v">301 Moved Permanently</span>'); print(`Location: https://${r.name}/`); print(`<span class="t"># ${tr('Plain HTTP redirects to HTTPS', 'Unverschlüsseltes HTTP leitet auf HTTPS um')}</span>`); return; }
    print(`HTTP/2 <span class="g">200</span>`);
    print(`server: ${esc(r.h.server || 'nginx')}`);
    print('content-type: text/html; charset=UTF-8');
    print(`cache-control: max-age=${r.name === 'wikipedia.org' ? 0 : 604800}`);
    print(`age: ${rand(0, 3000)}`);
    print('strict-transport-security: max-age=31536000');
    print(`date: ${new Date().toUTCString()}`);
  }
  async function nc(args) {
    const host = args.slice(1).find((a) => !a.startsWith('-') && !/^\d+$/.test(a));
    const port = +args.slice(1).find((a) => /^\d+$/.test(a));
    if (!host || !port) return print('usage: nc -zv host port');
    const r = resolve(host);
    if (!r) return print(`nc: getaddrinfo for host "${esc(host)}" port ${port}: Name or service not known`);
    await sleep(r.h.blackhole ? 1800 : 300);
    if (r.h.blackhole) return print(`nc: connect to ${r.name} (${r.ip}) port ${port} (tcp) <span class="r">timed out</span>: Operation now in progress <span class="t"># ${tr('a timeout = packets silently dropped (firewall or dead host); “refused” would mean the host answered', 'Timeout = Pakete still verworfen (Firewall oder toter Host); „refused“ hieße, der Host hat geantwortet')}</span>`);
    if (r.h.ports.includes(port)) print(`Connection to ${r.name} (${r.ip}) ${port} port [tcp] <span class="g">succeeded!</span>`);
    else print(`nc: connect to ${r.name} (${r.ip}) port ${port} (tcp) failed: <span class="r">Connection refused</span>`);
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      if (busy) return;
      const v = input.value; input.value = '';
      busy = true; input.disabled = true;
      await run(v);
      busy = false; input.disabled = false; if (alive) input.focus({ preventScroll: true });
    } else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value;
      const words = v.split(' ');
      const pool = words.length > 1 ? Object.keys(HOSTS) : COMMANDS;
      const last = words[words.length - 1];
      const m = pool.filter((x) => x.startsWith(last));
      if (m.length === 1) { words[words.length - 1] = m[0]; input.value = words.join(' ') + (words.length > 1 ? '' : ' '); }
      else if (m.length > 1) print(`<span class="t">${m.join('  ')}</span>`);
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });
}
