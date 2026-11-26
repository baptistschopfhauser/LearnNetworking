import { analogy, note, warn, deep } from './blocks.js';

// Deutsche Lektionen. Gleiche ids wie in modules.en.js; fehlende ids fallen auf Englisch zurück.
export const MODULES_DE = [
  /* ============================================================ */
  {
    id: 'troubleshooting', level: 'pro', icon: '🩺', color: '#5cf2c2', minutes: 15,
    title: 'Fehlersuche wie ein Profi',
    summary: 'ping, traceroute, dig, curl & Co.: jedes Netzwerkproblem in einem echten Terminal diagnostizieren.',
    body: `
<h2 id="method">Eine Methode, kein Raten</h2>
<p>Wenn „das Internet kaputt ist“, starten Profis nicht wahllos Geräte neu. Sie gehen den Stapel <strong>von unten nach oben</strong> durch und stellen pro Schicht eine Frage. Die erste Schicht, die versagt, ist der Ort des Problems.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Frage</th><th>Schicht</th><th>Werkzeug</th></tr>
<tr><td>Bin ich verbunden und habe ich eine IP-Adresse?</td><td>1–3</td><td><code>ip addr</code> / <code>ipconfig</code></td></tr>
<tr><td>Erreiche ich mein Gateway?</td><td>2–3</td><td><code>ping 192.168.1.1</code>, <code>arp -a</code></td></tr>
<tr><td>Erreiche ich das Internet per IP?</td><td>3</td><td><code>ping 1.1.1.1</code>, <code>traceroute</code></td></tr>
<tr><td>Werden Namen aufgelöst?</td><td>7 (DNS)</td><td><code>dig</code>, <code>nslookup</code></td></tr>
<tr><td>Antwortet der Dienst?</td><td>4–7</td><td><code>nc -zv host 443</code>, <code>curl -I</code></td></tr>
</table></div>
${analogy('Eine Ärztin prüft erst den Puls, dann die Atmung, dann das konkrete Symptom. „1.1.1.1 per ping erreichbar, aber google.com nicht“ ist ein Symptom, das direkt auf DNS zeigt.')}

<h2 id="terminal">Dein Terminal</h2>
<p>Das ist ein simulierter Linux-Laptop in einem Heimnetz. Probier die Missionen rechts aus; tippe <code>help</code> für alle Befehle. Mit <kbd>↑</kbd> holst du frühere Befehle zurück, mit <kbd>Tab</kbd> vervollständigst du.</p>
<div data-widget="terminal"></div>

<h2 id="reading">Die Ausgabe lesen</h2>
<ul>
<li><strong>ping</strong>: <code>time=</code> ist die Rundlaufzeit, <code>ttl=</code> die verbleibende TTL. Ein Startwert von 64 (Linux/macOS) oder 128 (Windows) minus die Hops verrät ungefähr, wie weit der Host entfernt ist.</li>
<li><strong>traceroute</strong>: <code>* * *</code> heißt nicht immer kaputt; viele Router beantworten Proben einfach nicht. Sorgen machen musst du dir nur, wenn das Ziel selbst nicht antwortet.</li>
<li><strong>dig</strong>: achte auf <code>status: NOERROR</code> vs. <code>NXDOMAIN</code> (den Namen gibt es nicht) vs. <code>SERVFAIL</code> (der Resolver bekam keine Antwort).</li>
<li><strong>curl -I</strong>: zeigt HTTP-Status und Header, ohne den Seiteninhalt zu laden.</li>
</ul>
<p>Für DNS-Fälle zum Knobeln: <a href="#/play/dnsdet">DNS-Detektiv</a>.</p>

${deep('Paketmitschnitt: tcpdump und Wireshark', `
<p>Reichen die Werkzeuge oben nicht, schau dir die Pakete selbst an. <code>tcpdump</code> schneidet auf der Kommandozeile mit:</p>
<pre class="code"><span class="k">$</span> sudo tcpdump -i eth0 -n 'tcp port 443 and host 93.184.215.14'
<span class="c">12:00:01.000 IP 192.168.1.42.51514 > 93.184.215.14.443: Flags [S], seq 1</span>
<span class="c">12:00:01.018 IP 93.184.215.14.443 > 192.168.1.42.51514: Flags [S.], seq 9, ack 2</span>
<span class="c">12:00:01.018 IP 192.168.1.42.51514 > 93.184.215.14.443: Flags [.], ack 10</span></pre>
<p>Da ist der Drei-Wege-Handshake: <code>[S]</code> SYN, <code>[S.]</code> SYN-ACK, <code>[.]</code> ACK. <strong>Wireshark</strong> öffnet dieselben Mitschnitte in einer Oberfläche und entschlüsselt Hunderte Protokolle Schicht für Schicht – das beste Werkzeug, um Netzwerktechnik zu lernen.</p>`)}
${deep('MTU-Probleme: kleine Seiten laden, große hängen', `
<p>Ein klassisches Rätsel: SSH-Logins gehen, kleine Seiten laden, aber große Downloads hängen. Oft senkt ein Tunnel (VPN, PPPoE) die Pfad-<strong>MTU</strong>, und eine Firewall blockt die ICMP-Meldungen „Fragmentation Needed“, auf die <strong>Path-MTU-Discovery</strong> angewiesen ist. Große Pakete verschwinden lautlos – ein „schwarzes Loch“. Testen mit <code>ping -M do -s 1472 host</code> (1472 + 28 Byte Header = 1500). Lösung: ICMP erlauben oder die TCP-MSS auf dem Router begrenzen.</p>`)}
`,
    quiz: [
      { q: 'Du erreichst 1.1.1.1 per ping, aber nicht example.com. Was ist am wahrscheinlichsten kaputt?', a: ['Das Kabel', 'DNS', 'TCP', 'Das Default-Gateway'], c: 1, why: 'Eine IP zu erreichen beweist, dass Routing funktioniert; scheitert es beim Namen, deutet das auf die Namensauflösung.' },
      { q: 'Ein Linux-Host antwortet mit ttl=57. Wie viele Hops ist er ungefähr entfernt?', a: ['57', '7', '64', '121'], c: 1, why: 'Linux startet bei 64; 64 − 57 = 7 Router haben sie verringert.' },
      { q: 'Was bedeutet dig-Status NXDOMAIN?', a: ['Server abgestürzt', 'Den Domainnamen gibt es nicht', 'Zeitüberschreitung', 'Die Antwort ist gecacht'], c: 1, why: 'NXDOMAIN = Non-eXistent DOMAIN, ein autoritatives „diesen Namen gibt es nicht“.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'scale', level: 'pro', icon: '⚖️', color: '#ffd166', minutes: 12,
    title: 'Lastverteilung, CDNs & Skalierung',
    summary: 'Wie die größten Seiten Milliarden bedienen: Loadbalancer, Health Checks, Caching und Edge-Netze.',
    body: `
<h2 id="one-server">Ein Server reicht nie</h2>
<p>Ein einzelner Server ist ein einzelner Ausfallpunkt – und hat eine Kapazitätsgrenze. Große Dienste verteilen Verkehr auf viele gleiche Server hinter einem <strong>Loadbalancer</strong> (LB). Clients verbinden sich mit einer Adresse (einer <em>virtuellen IP</em>), und der LB wählt für jede Verbindung oder Anfrage ein gesundes Backend.</p>
${analogy('Ein Loadbalancer ist die Empfangsperson in einem vollen Restaurant. Statt alle Gäste zum ersten Kellner zu schicken, setzt sie jede Gruppe zu dem, der gerade frei ist – und setzt niemanden mehr an einen Tisch, dessen Kellner sich krankgemeldet hat.')}

<h2 id="algorithms">Verteilungsverfahren</h2>
<ul>
<li><strong>Round Robin</strong>: 1, 2, 3, 1, 2, 3 … Einfach, ignoriert aber, wie ausgelastet jeder Server ist.</li>
<li><strong>Gewichtet</strong>: Größere Server bekommen anteilig mehr.</li>
<li><strong>Least Connections</strong>: an den mit den wenigsten aktiven Anfragen – passt sich an langsame Server an.</li>
<li><strong>Hash (IP oder Cookie)</strong>: Derselbe Client landet immer beim selben Server („Sticky Sessions“).</li>
</ul>
<p>Starte den Simulator. Mach dann Server B langsam und vergleiche Round Robin mit Least Connections. Schalte einen Server ab und sieh, wie die <strong>Health Checks</strong> ihn aus der Rotation nehmen.</p>
<div data-widget="loadbalancer"></div>

<h2 id="l4-l7">Schicht 4 vs. Schicht 7</h2>
<p>Ein <strong>L4</strong>-Loadbalancer schaut nur auf IPs und Ports – rasend schnell und protokollunabhängig. Ein <strong>L7</strong>-Loadbalancer (Reverse Proxy) versteht HTTP: Er kann <code>/api</code> an einen Pool und <code>/images</code> an einen anderen schicken, TLS terminieren, Header hinzufügen und fehlgeschlagene Anfragen wiederholen. Die meisten Websites nutzen beides: L4 am Rand, L7 dahinter.</p>

<h2 id="cdn">CDNs: Inhalte näher bringen</h2>
<p>Latenz ist durch die Lichtgeschwindigkeit begrenzt. Ein <strong>Content Delivery Network</strong> hält Kopien von Inhalten auf Servern in Hunderten Städten. Per <strong>Anycast</strong> oder DNS-Steuerung landest du beim nächsten <em>Edge</em>. Hat er die Datei im Cache (ein <em>Hit</em>), ist die Antwort in wenigen Millisekunden da. Bei einem <em>Miss</em> holt der Edge sie einmal vom <strong>Origin</strong> und bedient danach alle.</p>
${note('Der Header <code>Cache-Control</code> sagt Caches, wie lange eine Antwort wiederverwendet werden darf. <code>max-age=31536000, immutable</code> auf Dateien mit Fingerabdruck wie <code>app.3f9a.js</code> lässt Browser und CDNs sie ein Jahr behalten.')}

${deep('Consistent Hashing: Server hinzufügen, ohne alles neu zu mischen', `
<p>Mit naivem Hashing (<code>server = hash(key) % N</code>) ändert ein zusätzlicher Server <code>N</code> und ordnet fast jeden Schlüssel neu zu – überall werden die Caches auf einen Schlag kalt. <strong>Consistent Hashing</strong> setzt Server und Schlüssel auf einen Ring; jeder Schlüssel geht zum nächsten Server im Uhrzeigersinn. Ein Server mehr oder weniger verschiebt nur die Schlüssel in seinem Abschnitt, etwa 1/N davon. <em>Virtuelle Knoten</em> (viele Punkte pro Server) gleichen die Last aus. Diese Idee steckt in CDNs, verteilten Caches und Datenbanken wie Cassandra und DynamoDB.</p>`)}
${deep('Health Checks, Failover und die „Thundering Herd“', `
<p>LBs prüfen Backends (etwa <code>GET /healthz</code> alle 2 s) und nehmen eines nach N Fehlschlägen heraus. Sorgfalt zählt: Fragen Health Checks eine gemeinsame Datenbank ab und wird diese langsam, fällt <em>jeder</em> Server gleichzeitig durch, und der LB erklärt die ganze Flotte für tot. Läuft ein Cache ab, können Tausende Anfragen gleichzeitig den Origin treffen (eine <strong>Thundering Herd</strong>). Request Coalescing, zufällig gestreute Ablaufzeiten und „veraltet ausliefern, während neu geladen wird“ glätten das.</p>`)}
${deep('Globaler Verkehr: DNS, Anycast und BGP im Zusammenspiel', `
<p>Eine Anfrage an einen globalen Dienst wird dreimal gesteuert: <strong>GeoDNS</strong> oder <strong>Anycast</strong> wählt eine Region, ein L4-LB im Rechenzentrum verteilt Flows per ECMP und Consistent Hashing auf Maschinen, und ein L7-Proxy leitet die HTTP-Anfrage zum richtigen Microservice. Fällt eine ganze Region aus, verlagern DNS- oder BGP-Ankündigungen die Nutzer innerhalb von Sekunden bis Minuten.</p>`)}
`,
    quiz: [
      { q: 'Ein Backend wird deutlich langsamer. Welches Verfahren passt sich automatisch an?', a: ['Round Robin', 'Least Connections', 'IP-Hash', 'Zufall'], c: 1, why: 'Ein langsamer Server sammelt offene Anfragen an, also schickt Least Connections ihm weniger neue.' },
      { q: 'Was löst ein CDN-Cache-„Miss“ aus?', a: ['Eine Fehlerseite', 'Der Edge holt den Inhalt vom Origin', 'Eine DNS-Abfrage', 'Einen TCP-Reset'], c: 1, why: 'Bei einem Miss holt der Edge das Objekt vom Origin, speichert es und liefert es aus.' },
      { q: 'Was kann /api und /images an verschiedene Server-Pools leiten?', a: ['Ein L4-Loadbalancer', 'Ein L7-Loadbalancer', 'Ein Switch', 'ARP'], c: 1, why: 'Nur ein L7-Loadbalancer (versteht HTTP) kann den URL-Pfad lesen.' },
    ],
  },
  /* ============================================================ */
  {
    id: 'tcp-udp', level: 'core', icon: '🤝', color: '#8b7bff', minutes: 14,
    title: 'TCP & UDP',
    summary: 'Ports, der Drei-Wege-Handshake, Zuverlässigkeit, Fluss- und Staukontrolle.',
    body: `
<h2 id="ports">Ports: welches Programm?</h2>
<p>IP bringt Daten zur richtigen <em>Maschine</em>. Die Transportschicht bringt sie zum richtigen <em>Programm</em> – mit <strong>Portnummern</strong> (0–65535). Ein Webserver lauscht auf 443, SSH auf 22, DNS auf 53. Dein Browser nutzt auf seiner Seite einen zufälligen hohen <strong>ephemeren Port</strong>. Eine Verbindung ist durch das <strong>5-Tupel</strong> bestimmt: Protokoll, Quell-IP, Quellport, Ziel-IP, Zielport.</p>

<h2 id="udp-vs-tcp">UDP vs. TCP</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th></th><th>UDP</th><th>TCP</th></tr>
<tr><td>Verbindung</td><td>Keine – einfach senden</td><td>Erst Handshake</td></tr>
<tr><td>Zuverlässigkeit</td><td>Best Effort; Verlust, Duplikate oder Umsortierung möglich</td><td>Jedes Byte kommt einmal und in Reihenfolge an</td></tr>
<tr><td>Header</td><td>8 Byte</td><td>20–60 Byte</td></tr>
<tr><td>Fluss-/Staukontrolle</td><td>Nein</td><td>Ja</td></tr>
<tr><td>Genutzt von</td><td>DNS, Spiele, VoIP, Videocalls, QUIC</td><td>Web (HTTP/1.1, 2), E-Mail, SSH, Dateiübertragung</td></tr>
</table></div>
${analogy('UDP ist quer durch den Raum rufen: schnell, ohne Vorbereitung, aber wer ein Wort verpasst, hat Pech. TCP ist ein Telefonat, bei dem du nach jedem Satz „alles angekommen?“ fragst und Verpasstes wiederholst.')}

<h2 id="handshake">Der Drei-Wege-Handshake & zuverlässige Zustellung</h2>
<p>TCP nummeriert jedes Byte mit einer <strong>Sequenznummer</strong>. Bevor Daten fließen, einigen sich beide Seiten per Handshake auf Startnummern: <strong>SYN → SYN-ACK → ACK</strong>. Der Empfänger bestätigt erhaltene Daten; kommt ein ACK nicht vor Ablauf eines Timers, sendet der Sender <strong>erneut</strong>. Dreh den Paketverlust hoch und sieh, wie TCP sich erholt.</p>
<div data-widget="tcp"></div>

<h2 id="windows">Flusskontrolle & Sliding Windows</h2>
<p>Nach jedem Segment auf ein ACK zu warten, wäre auf langen Wegen quälend langsam. TCP hält ein <strong>Fenster</strong> von Segmenten gleichzeitig unterwegs. Der Empfänger meldet, wie viel Puffer er hat (<strong>rwnd</strong>, Flusskontrolle), und der Sender begrenzt sich zusätzlich mit einem <strong>Staufenster</strong> (<strong>cwnd</strong>), um das Netz nicht zu überlasten.</p>

${deep('Staukontrolle: Slow Start, AIMD, CUBIC und BBR', `
<p>TCP tastet sich an die verfügbare Bandbreite heran:</p>
<ol>
<li><strong>Slow Start</strong>: cwnd beginnt klein (heute 10 Segmente) und <em>verdoppelt</em> sich jede RTT – exponentielles Wachstum.</li>
<li>Am Slow-Start-Schwellwert wechselt es zu <strong>Congestion Avoidance</strong>: etwa +1 Segment pro RTT (additive Erhöhung).</li>
<li>Bei Verlust wird cwnd <strong>multiplikativ verringert</strong> (halbiert). Das ist <strong>AIMD</strong> – und es sorgt dafür, dass viele Flows einen fairen Anteil bekommen.</li>
</ol>
<div data-widget="cwnd"></div>
<p>Linux nutzt standardmäßig <strong>CUBIC</strong>, das cwnd als kubische Funktion der Zeit seit dem letzten Verlust wachsen lässt, um dicke Leitungen schnell zu füllen. Googles <strong>BBR</strong> modelliert dagegen Engpass-Bandbreite und RTT des Weges und hält Warteschlangen kurz – Verlust ist nicht das Hauptsignal für Stau.</p>`)}
${deep('Verbindungen schließen, TIME_WAIT und der TCP-Zustandsautomat', `
<p>Das Schließen braucht vier Segmente, weil jede Richtung einzeln beendet wird: <strong>FIN → ACK</strong>, dann <strong>FIN → ACK</strong> in die andere Richtung. Die Seite, die zuerst schließt, geht für 2×MSL (oft 60 s) in <strong>TIME_WAIT</strong>, damit verirrte alte Segmente keine neue Verbindung mit demselben 5-Tupel stören. Stark ausgelastete Proxys mit Tausenden kurzer Verbindungen können dadurch ephemere Ports aufbrauchen.</p>
<pre class="code">CLOSED → SYN_SENT → ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED   <span class="c"># Client</span>
LISTEN → SYN_RCVD → ESTABLISHED → CLOSE_WAIT → LAST_ACK → CLOSED                 <span class="c"># Server</span></pre>
<p>Ein <strong>RST</strong>-Segment bricht eine Verbindung sofort ab – das bekommt man, wenn man sich mit einem geschlossenen Port verbindet.</p>`)}
${deep('QUIC: TCPs Nachfolger auf UDP', `
<p>TCP hat <strong>Head-of-Line-Blocking</strong>: Ein verlorenes Segment hält alle Daten dahinter auf, selbst für unabhängige HTTP/2-Streams. Und sein Handshake plus TLS kostet 2–3 Rundreisen. <strong>QUIC</strong> läuft über UDP, verschlüsselt fast alles (auch Transport-Header), multiplext unabhängige Streams, sodass Verlust in einem die anderen nicht blockiert, und verbindet Transport- und TLS-1.3-Handshake zu 1 RTT (0-RTT bei Wiederaufnahme). Verbindungen überleben IP-Wechsel (WLAN → 4G) dank Connection-IDs. HTTP/3 ist HTTP über QUIC.</p>`)}
`,
    quiz: [
      { q: 'In welcher Reihenfolge läuft der TCP-Handshake?', a: ['ACK, SYN, SYN-ACK', 'SYN, SYN-ACK, ACK', 'SYN, ACK, FIN', 'HELLO, OK, GO'], c: 1, why: 'Der Client sendet SYN, der Server antwortet SYN-ACK, der Client bestätigt mit ACK.' },
      { q: 'Warum bevorzugen Onlinespiele oft UDP?', a: ['Es ist verschlüsselt', 'Alte Daten sind nutzlos – Warten auf Neusendungen erzeugt Lag', 'Es hat größere Pakete', 'Router bevorzugen es'], c: 1, why: 'Ein Positions-Update von vor 200 ms ist wertlos; besser gleich das nächste nehmen, als auf eine Neusendung zu warten.' },
      { q: 'Was passiert bei der TCP-Staukontrolle (klassisches Reno) mit cwnd bei Paketverlust?', a: ['Es verdoppelt sich', 'Es wird ungefähr halbiert', 'Es bleibt gleich', 'Es wird auf rwnd gesetzt'], c: 1, why: 'AIMD: additive Erhöhung, multiplikative Verringerung – cwnd wird bei Verlust gekürzt (halbiert).' },
    ],
  },

  /* ============================================================ */
  {
    id: 'dns', level: 'apps', icon: '📇', color: '#ffd166', minutes: 10,
    title: 'DNS: das Telefonbuch des Internets',
    summary: 'Wie Namen über eine Hierarchie von Servern und Caches zu IP-Adressen werden.',
    body: `
<h2 id="why-dns">Warum es DNS gibt</h2>
<p>Menschen merken sich <code>wikipedia.org</code>; Router brauchen <code>185.15.58.224</code>. Das <strong>Domain Name System</strong> ist eine verteilte, hierarchische Datenbank, die Namen in Adressen übersetzt (und vieles mehr). Es ist so zentral, dass „es ist immer DNS“ ein Running Gag unter Ingenieuren ist.</p>

<h2 id="hierarchy">Die Hierarchie</h2>
<p>Namen liest man von rechts nach links: die unsichtbare Wurzel <code>.</code>, dann eine <strong>Top-Level-Domain</strong> (<code>org</code>), dann die Domain (<code>wikipedia</code>), dann optionale Subdomains (<code>de</code>). Jede Ebene <strong>delegiert</strong> die Zuständigkeit an die nächste. Kein Server weiß alles – aber jeder weiß, wen man als Nächstes fragt.</p>

<h2 id="resolution">Auflösung Schritt für Schritt</h2>
<p>Dein Gerät fragt einen <strong>rekursiven Resolver</strong> (den deines Providers oder <code>1.1.1.1</code>/<code>8.8.8.8</code>). Ist die Antwort nicht im Cache, geht der Resolver den Baum entlang: Root → TLD → autoritativer Server. Geh es unten Schritt für Schritt durch – und dann noch einmal, um den Cache zu sehen.</p>
<div data-widget="dns"></div>
${analogy('Der Resolver ist ein Bibliothekar. Fragst du nach „de.wikipedia.org“, geht er zum Hauptkatalog (Root) – „schau in der .org-Abteilung“ –, dann zum .org-Regal – „Wikipedia hat einen eigenen Raum“ –, und in Wikipedias Raum steht schließlich das genaue Buch. Fragt das nächste Mal jemand, weiß der Bibliothekar es auswendig.')}

<h2 id="records">Eintragstypen</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Typ</th><th>Bedeutung</th><th>Beispiel</th></tr>
<tr><td>A</td><td>IPv4-Adresse</td><td><code>example.com → 93.184.215.14</code></td></tr>
<tr><td>AAAA</td><td>IPv6-Adresse</td><td><code>example.com → 2606:2800:21f:cb07::1</code></td></tr>
<tr><td>CNAME</td><td>Alias auf einen anderen Namen</td><td><code>www → example.com</code></td></tr>
<tr><td>MX</td><td>Mailserver der Domain</td><td><code>10 mail.example.com</code></td></tr>
<tr><td>NS</td><td>Autoritative Nameserver</td><td><code>a.iana-servers.net</code></td></tr>
<tr><td>TXT</td><td>Freitext (SPF, Verifizierung)</td><td><code>"v=spf1 -all"</code></td></tr>
</table></div>
<p>Jeder Eintrag hat eine <strong>TTL</strong> – wie viele Sekunden Resolver ihn cachen dürfen. Niedrige TTLs erlauben schnelle Änderungen; hohe TTLs bedeuten weniger Anfragen.</p>
<pre class="code"><span class="k">$</span> dig +short example.com A
93.184.215.14
<span class="k">$</span> dig +trace example.com   <span class="c"># die ganze Delegationskette ansehen</span></pre>
<p>Wenn DNS kaputt ist, spiel <a href="#/play/dnsdet">DNS-Detektiv</a> – sieben echte Störungen zum Lösen.</p>

${deep('DNS-Sicherheit: Spoofing, DNSSEC, DoH und DoT', `
<p>Klassisches DNS ist unverschlüsseltes UDP auf Port 53: Jeder auf dem Weg kann deine Anfragen lesen, und ein Angreifer, der die 16-Bit-Anfrage-ID und den Quellport errät, kann eine gefälschte Antwort einschleusen (<strong>Cache Poisoning</strong>; der Kaminsky-Angriff 2008 machte das praktikabel, bis Quellport-Zufall eingeführt wurde).</p>
<ul>
<li><strong>DNSSEC</strong> fügt Signaturen hinzu: Jede Zone signiert ihre Einträge, und Eltern bürgen für die Schlüssel ihrer Kinder (DS-Einträge) – eine Vertrauenskette bis zur Root. Das liefert <em>Integrität</em>, keine Vertraulichkeit.</li>
<li><strong>DoT</strong> (DNS over TLS, Port 853) und <strong>DoH</strong> (DNS over HTTPS, Port 443) verschlüsseln die Anfrage zwischen dir und dem Resolver – <em>Vertraulichkeit</em> im lokalen Netz.</li>
</ul>`)}
${deep('Wie CDNs dich per DNS zum nächsten Server schicken', `
<p>Löst du einen Namen auf, den ein CDN bedient, schaut der autoritative Server auf den Standort des Resolvers (oder den <strong>EDNS-Client-Subnet</strong>-Hinweis) und antwortet mit der IP eines nahen Edge-Servers. Oft zeigt ein CNAME von <code>www.shop.com</code> auf etwas wie <code>shop.cdn-anbieter.net</code>, damit das CDN die Antwort steuert. Mit kurzen TTLs lässt sich Verkehr so in Sekunden von überlasteten oder ausgefallenen Standorten weglenken.</p>`)}
`,
    quiz: [
      { q: 'Welcher Eintrag bildet einen Namen auf eine IPv6-Adresse ab?', a: ['A', 'AAAA', 'MX', 'PTR'], c: 1, why: 'AAAA-Einträge („Quad-A“) enthalten 128-Bit-IPv6-Adressen.' },
      { q: 'Wen fragt ein rekursiver Resolver bei leerem Cache zuerst?', a: ['Den autoritativen Server', 'Einen Root-Server', 'Den TLD-Server', 'Deinen Browser'], c: 1, why: 'Root-Server verweisen auf die richtigen TLD-Server, die auf die autoritativen verweisen.' },
      { q: 'Was steuert die TTL eines DNS-Eintrags?', a: ['Wie viele Hops die Antwort nehmen darf', 'Wie lange sie gecacht werden darf', 'Ihre Priorität', 'Ihre Verschlüsselung'], c: 1, why: 'Die TTL eines Eintrags ist die Anzahl Sekunden, die Resolver die Antwort cachen dürfen.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'http-tls', level: 'apps', icon: '🔐', color: '#4cc9ff', minutes: 12,
    title: 'HTTP & TLS',
    summary: 'Was beim Laden einer Seite passiert: Anfragen, Antworten und Verschlüsselung.',
    body: `
<h2 id="http">HTTP: Anfragen und Antworten</h2>
<p><strong>HTTP</strong> ist die Sprache des Webs. Ein Client sendet eine <strong>Anfrage</strong> (Methode, Pfad, Header, optional ein Body); der Server liefert eine <strong>Antwort</strong> (Statuscode, Header, Body). In HTTP/1.1 ist das reiner Text, man kann es also lesen. Bau unten eine Anfrage und sieh, was der Server zurückschickt.</p>
<div data-widget="http"></div>
<h3>Statuscodes auf einen Blick</h3>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Bereich</th><th>Bedeutung</th><th>Klassiker</th></tr>
<tr><td>1xx</td><td>Information</td><td>101 Switching Protocols</td></tr>
<tr><td>2xx</td><td>Erfolg</td><td>200 OK, 201 Created, 204 No Content</td></tr>
<tr><td>3xx</td><td>Umleitung</td><td>301 Moved Permanently, 304 Not Modified</td></tr>
<tr><td>4xx</td><td>Fehler beim Client</td><td>400, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests</td></tr>
<tr><td>5xx</td><td>Fehler beim Server</td><td>500, 502 Bad Gateway, 503 Unavailable</td></tr>
</table></div>

<h2 id="page-load">Alles, was passiert, wenn du Enter drückst</h2>
<ol>
<li><strong>DNS</strong> löst den Hostnamen in eine IP auf.</li>
<li><strong>TCP</strong>-Handshake zu Port 443 (oder ein QUIC-Handshake über UDP).</li>
<li><strong>TLS</strong>-Handshake: Schlüssel aushandeln, das Zertifikat des Servers prüfen.</li>
<li><strong>HTTP</strong>-Anfrage für die Seite; das HTML in der Antwort verweist auf CSS, JS, Bilder …</li>
<li>Der Browser nutzt die Verbindung weiter (HTTP/2-Multiplexing), um den Rest zu laden, und rendert dann.</li>
</ol>
<p>In 3D erleben: <a href="#/play/journey">Reise eines Klicks</a>.</p>

<h2 id="tls">TLS: das S in HTTPS</h2>
<p><strong>TLS</strong> gibt drei Garantien: <strong>Vertraulichkeit</strong> (niemand kann mitlesen), <strong>Integrität</strong> (niemand kann unbemerkt ändern) und <strong>Authentizität</strong> (du sprichst mit dem echten Server). Geh einen TLS-1.3-Handshake durch:</p>
<div data-widget="tls"></div>
${analogy('Diffie-Hellman ist wie Farbe mischen: Du und ich behalten je eine geheime Farbe, tauschen öffentlich „gemeinsames Gelb + mein Geheimnis“-Mischungen aus und mischen dann jeweils unser eigenes Geheimnis in die Mischung des anderen. Wir landen bei derselben Endfarbe – aber ein Lauscher, der nur die Mischungen gesehen hat, kann sie nicht wieder entmischen.')}

${deep('Zertifikate und die Vertrauenskette', `
<p>Ein Zertifikat verbindet einen öffentlichen Schlüssel mit einem Domainnamen, signiert von einer <strong>Zertifizierungsstelle</strong> (CA). Dein Browser bringt rund 150 vertrauenswürdige Root-CAs mit. Ein Server sendet sein <em>Leaf</em>-Zertifikat plus <em>Zwischenzertifikate</em>; der Browser prüft jede Signatur bis zu einer vertrauenswürdigen Root, ob der Name passt und ob nichts abgelaufen oder widerrufen ist.</p>
<pre class="code">ISRG Root X1           <span class="c"># Root, im Vertrauensspeicher von OS/Browser</span>
 └─ R11                <span class="c"># Zwischen-CA</span>
     └─ example.org    <span class="c"># Leaf: öffentlicher Schlüssel + Namen + Gültigkeit</span></pre>
<p><strong>Certificate Transparency</strong>-Logs machen jedes ausgestellte Zertifikat öffentlich, sodass Fehlausstellungen auffallen. Let’s Encrypt machte Zertifikate kostenlos und automatisch (ACME) – ein großer Grund, warum der meiste Webverkehr heute verschlüsselt ist.</p>`)}
${deep('HTTP/1.1 vs. HTTP/2 vs. HTTP/3', `
<div class="tbl-wrap"><table class="tbl">
<tr><th></th><th>HTTP/1.1</th><th>HTTP/2</th><th>HTTP/3</th></tr>
<tr><td>Format</td><td>Text</td><td>Binäre Frames</td><td>Binäre Frames</td></tr>
<tr><td>Transport</td><td>TCP</td><td>TCP</td><td>QUIC (UDP)</td></tr>
<tr><td>Parallele Anfragen</td><td>~6 Verbindungen pro Host</td><td>Viele Streams auf einer Verbindung</td><td>Unabhängige Streams, kein TCP-HOL-Blocking</td></tr>
<tr><td>Header-Kompression</td><td>Nein</td><td>HPACK</td><td>QPACK</td></tr>
</table></div>`)}
${deep('Forward Secrecy: warum mitgeschnittener Verkehr sicher bleibt', `
<p>Beim alten RSA-Schlüsseltausch verschlüsselte der Browser den Sitzungsschlüssel mit dem Langzeitschlüssel des Servers. Wer diesen Schlüssel Jahre später stahl, konnte jede mitgeschnittene Sitzung entschlüsseln. TLS 1.3 <em>verlangt</em> <strong>ephemeres Diffie-Hellman</strong> (ECDHE): frische Schlüssel pro Verbindung, danach weggeworfen. Wird der Zertifikatsschlüssel später kompromittiert, verrät das nichts über vergangene Sitzungen – das ist <strong>Forward Secrecy</strong>.</p>`)}
`,
    quiz: [
      { q: 'Was bedeutet HTTP 404?', a: ['Server abgestürzt', 'Nicht gefunden', 'Verboten', 'Dauerhaft verschoben'], c: 1, why: '4xx sind Client-Fehler; 404 heißt, die Ressource existiert auf dem Server nicht.' },
      { q: 'Welche TLS-Eigenschaft sorgt dafür, dass du mit dem echten Server sprichst?', a: ['Vertraulichkeit', 'Integrität', 'Authentizität', 'Kompression'], c: 2, why: 'Die Zertifikatskette weist die Identität des Servers nach.' },
      { q: 'Worüber läuft HTTP/3?', a: ['TCP', 'QUIC über UDP', 'SCTP', 'Rohes IP'], c: 1, why: 'HTTP/3 bildet HTTP auf QUIC ab, das über UDP läuft.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'nat-firewalls', level: 'apps', icon: '🛡️', color: '#ff5470',
    minutes: 11,
    title: 'NAT, Firewalls & Sicherheit',
    summary: 'Eine öffentliche IP teilen, Verkehr filtern und Netze verteidigen.',
    body: `
<h2 id="nat">NAT: viele Geräte, eine öffentliche IP</h2>
<p>Bei dir zu Hause gibt es Dutzende Geräte, aber dein Provider gibt dir <em>eine</em> öffentliche IPv4. <strong>NAT</strong> (Network Address Translation – genauer <strong>PAT</strong> / NAPT) auf deinem Router schreibt die private Quell-<code>IP:Port</code> ausgehender Pakete auf seine öffentliche IP und einen eindeutigen Port um und merkt sich die Zuordnung, damit Antworten zurückübersetzt werden können.</p>
<div data-widget="nat"></div>
${note('Ein Nebeneffekt: Unaufgeforderte eingehende Verbindungen haben keine Zuordnung und werden verworfen. NAT ist nicht als Sicherheitsfunktion gedacht, wirkt aber ein bisschen wie eine Firewall – und deshalb braucht ein Spieleserver zu Hause <strong>Portweiterleitung</strong>.')}

<h2 id="firewalls">Firewalls</h2>
<p>Eine <strong>Firewall</strong> entscheidet, welcher Verkehr erlaubt ist. Regeln prüfen Felder wie Quelle, Ziel, Protokoll und Port und werden <strong>von oben nach unten ausgewertet – die erste passende gewinnt</strong>. Eine gute Richtlinie endet mit „alles andere verweigern“ (<strong>Default Deny</strong>). <strong>Zustandsbehaftete</strong> Firewalls verfolgen Verbindungen, sodass Antworten auf von dir gestarteten Verkehr automatisch erlaubt sind.</p>
<p>Schreib Regeln, die den Testverkehr unten richtig behandeln – Web rein, Angreifer raus. Danach: <a href="#/play/defender">Firewall Defender</a> in 3D.</p>
<div data-widget="firewall"></div>

<h2 id="threats">Häufige Bedrohungen</h2>
<ul>
<li><strong>Mitlesen</strong> unverschlüsselten Verkehrs → TLS/VPNs nutzen.</li>
<li><strong>Spoofing</strong> (gefälschte Quell-IPs, ARP-/DNS-Vergiftung) → Prüfung, DNSSEC, DAI.</li>
<li><strong>DDoS</strong> – Fluten von vielen Rechnern → Scrubbing-Dienste, Anycast, Ratenbegrenzung.</li>
<li><strong>Portscans</strong>, um offene Dienste zu finden → Unnötiges schließen, Default Deny.</li>
<li><strong>Laterale Bewegung</strong>, nachdem ein Gerät kompromittiert ist → Segmentierung (VLANs, Zero Trust).</li>
</ul>

${deep('NAT-Typen und NAT-Traversal (STUN, TURN, ICE)', `
<p>Videocalls wollen direkte Peer-to-Peer-Verbindungen, aber beide Seiten sitzen oft hinter NAT. Über einen <strong>STUN</strong>-Server erfährt jede Seite ihre öffentliche <code>IP:Port</code>-Zuordnung; die Peers tauschen diese Kandidaten aus (per <strong>ICE</strong>) und versuchen, „Löcher zu stanzen“, indem sie gleichzeitig aneinander senden. Bei strengem <em>symmetrischem</em> NAT (eine andere Zuordnung pro Ziel) scheitert das, und der Verkehr läuft stattdessen über einen <strong>TURN</strong>-Server. Das ist die Technik unter WebRTC.</p>`)}
${deep('Zero Trust: Burg und Graben vergessen', `
<p>Das klassische Modell vertraute allem innerhalb der Perimeter-Firewall. War ein Angreifer einmal drin (Phishing, ein verwundbarer Drucker), konnte er sich frei bewegen. <strong>Zero Trust</strong> geht davon aus, dass das Netz feindlich ist: Jede Anfrage wird anhand von Benutzeridentität, Gerätezustand und Kontext authentifiziert und autorisiert – egal, woher sie kommt. Mikrosegmentierung begrenzt, was ein einzelner Rechner erreicht, und VPN-lose Zugangs-Proxys ersetzen „im Netz sein“ als Berechtigung.</p>`)}
${deep('VPNs: Tunnel mit Verschlüsselung', `
<p>Ein VPN kapselt deine Pakete in verschlüsselte Pakete an einen VPN-Server. <strong>IPsec</strong> arbeitet auf Schicht 3 und ist bei Site-to-Site verbreitet. <strong>WireGuard</strong> ist ein modernes, minimales Design (~4 000 Zeilen) mit Curve25519, ChaCha20-Poly1305 und UDP. Für das lokale Netz sieht aller Verkehr wie ein einziger verschlüsselter UDP-Strom zum VPN-Server aus. Mehr in der Lektion <a href="#/learn/vpn">VPNs & WireGuard</a>.</p>`)}
`,
    quiz: [
      { q: 'Was ändert PAT/NAPT in ausgehenden Paketen?', a: ['Nur die Ziel-IP', 'Quell-IP und Quellport', 'Die TTL', 'Nur die MAC-Adresse'], c: 1, why: 'Es schreibt die private Quell-IP:Port auf die öffentliche IP und einen eindeutigen Port um und merkt sich die Zuordnung.' },
      { q: 'Firewall-Regeln werden üblicherweise ausgewertet …', a: ['Zufällig', 'Von unten nach oben', 'Von oben nach unten, die erste passende gewinnt', 'Alle gleichzeitig, die Mehrheit gewinnt'], c: 2, why: 'Die Reihenfolge zählt: Die erste passende Regel entscheidet – deshalb steht Default Deny am Ende.' },
      { q: 'Welche Technik leitet WebRTC-Medien weiter, wenn Hole Punching scheitert?', a: ['STUN', 'TURN', 'DHCP', 'ARP'], c: 1, why: 'TURN-Server leiten den Verkehr weiter, wenn kein direkter Peer-to-Peer-Weg möglich ist.' },
    ],
  },
  /* ============================================================ */
  {
    id: 'ip-addresses', level: 'core', icon: '🔢', color: '#4cc9ff', minutes: 10,
    title: 'IP-Adressen & Binär',
    summary: 'IPv4 in Binär, Netz- und Hostanteil, private Bereiche und ein Blick auf IPv6.',
    body: `
<h2 id="what-ip">Was ist eine IP-Adresse?</h2>
<p>Eine <strong>IPv4-Adresse</strong> ist eine 32-Bit-Zahl, die eine Netzwerkschnittstelle identifiziert. Man schreibt sie als vier <strong>Oktette</strong> (je 8 Bit) in Dezimal, getrennt durch Punkte: <code>192.168.1.42</code>. Jedes Oktett reicht von 0 bis 255, weil 8 Bit bis 2⁸ − 1 = 255 zählen.</p>
<p>Schalte die Bits unten um und sieh, wie sich die Adresse ändert. Jedes Bit ist eine Zweierpotenz wert: 128, 64, 32, 16, 8, 4, 2, 1.</p>
<div data-widget="bits"></div>

<h2 id="net-host">Netzanteil und Hostanteil</h2>
<p>Jede Adresse teilt sich in ein <strong>Netzpräfix</strong> (in welchem Netz du bist) und einen <strong>Hostanteil</strong> (welches Gerät in diesem Netz). Die Grenze schreibt man in <strong>CIDR</strong>-Notation: <code>192.168.1.42/24</code> heißt „die ersten 24 Bit sind das Netz“. Geräte mit demselben Präfix sind im selben lokalen Netz und reden direkt miteinander; alles andere geht ans <strong>Default-Gateway</strong> (deinen Router).</p>
${analogy('Eine IP ist wie eine Postanschrift. Das Präfix ist die Straße („Hauptstraße“), der Hostanteil die Hausnummer. Der Briefträger (Router) braucht nur die Straße, um in die Nähe zu kommen; die letzten Meter erledigt die Nummer.')}

<h2 id="special">Besondere Bereiche, die man kennen sollte</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Bereich</th><th>Bedeutung</th></tr>
<tr><td><code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code></td><td>Privat (RFC 1918) – wird im öffentlichen Internet nicht geroutet; hinter NAT genutzt</td></tr>
<tr><td><code>127.0.0.0/8</code></td><td>Loopback – <code>127.0.0.1</code> ist „dieser Rechner“</td></tr>
<tr><td><code>169.254.0.0/16</code></td><td>Link-Local – selbst vergeben, wenn DHCP scheitert</td></tr>
<tr><td><code>100.64.0.0/10</code></td><td>Carrier-Grade-NAT (Provider)</td></tr>
<tr><td><code>224.0.0.0/4</code></td><td>Multicast</td></tr>
<tr><td><code>255.255.255.255</code></td><td>Eingeschränkter Broadcast</td></tr>
</table></div>

<h2 id="dhcp">Wie man eine Adresse bekommt: DHCP</h2>
<p>Wenn dein Laptop ins WLAN kommt, hat er noch keine IP. Er sendet eine <strong>DHCP</strong>-Anfrage als Broadcast, und ein Server (meist dein Router) verleiht ihm eine Adresse, Subnetzmaske, Default-Gateway und DNS-Server. Die vier Nachrichten ergeben <strong>DORA</strong>: <em>Discover → Offer → Request → Acknowledge</em>.</p>

${deep('IPv6: 128 Bit und (theoretisch) kein NAT mehr', `
<p>IPv4 hat nur ~4,3 Milliarden Adressen – je nach Region seit 2011–2019 erschöpft. <strong>IPv6</strong> nutzt 128-Bit-Adressen, geschrieben als acht 16-Bit-Gruppen in Hex:</p>
<pre class="code">2001:0db8:0000:0000:0000:ff00:0042:8329
<span class="c"># führende Nullen weg, eine Nullfolge mit :: abkürzen</span>
2001:db8::ff00:42:8329</pre>
<ul>
<li>Das übliche LAN-Präfix ist ein <strong>/64</strong> – 18 Trillionen Adressen pro Subnetz.</li>
<li>Hosts können sich per <strong>SLAAC</strong> (zustandslose Autokonfiguration) aus Router Advertisements selbst konfigurieren.</li>
<li>ARP wird durch <strong>Neighbor Discovery</strong> (ICMPv6) ersetzt. Broadcast gibt es nicht – nur Multicast.</li>
<li><code>::1</code> ist Loopback; <code>fe80::/10</code> ist Link-Local; <code>2000::/3</code> ist Global Unicast.</li>
</ul>
<p>Die meisten Netze laufen heute im <strong>Dual Stack</strong> – IPv4 und IPv6 gleichzeitig – und Clients bevorzugen IPv6, wobei „Happy Eyeballs“ beide gegeneinander antreten lässt. Mehr in der Lektion <a href="#/learn/ipv6">IPv6 im Detail</a>.</p>`)}
${deep('Klassen-Geschichte: warum man noch „Klasse C“ hört', `
<p>Vor 1993 bestimmten die ersten Bits die Netzgröße: Klasse A (<code>0xxx</code>, /8), Klasse B (<code>10xx</code>, /16), Klasse C (<code>110x</code>, /24). Das verschwendete riesige Blöcke – eine Organisation mit 300 Hosts bekam eine Klasse B mit 65 534. <strong>CIDR</strong> (Classless Inter-Domain Routing) erlaubte Präfixe beliebiger Länge und die <em>Zusammenfassung</em> von Routen, was die Internet-Routingtabelle vor der Explosion bewahrte. „Klasse C“ ist heute nur Umgangssprache für ein /24.</p>`)}
`,
    quiz: [
      { q: 'Was ist 11000000 in Dezimal?', a: ['128', '192', '224', '240'], c: 1, why: '128 + 64 = 192.' },
      { q: 'Welche Adresse ist privat?', a: ['8.8.8.8', '172.20.1.5', '172.40.1.5', '193.168.0.1'], c: 1, why: '172.16.0.0/12 umfasst 172.16.x.x – 172.31.x.x; 172.20.1.5 liegt darin.' },
      { q: 'Wofür steht DORA bei DHCP?', a: ['Detect, Open, Route, Accept', 'Discover, Offer, Request, Acknowledge', 'Deliver, Organize, Reply, Assign', 'Domain, Origin, Resolve, Answer'], c: 1, why: 'Die vier DHCP-Nachrichten: Discover, Offer, Request, Acknowledge.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'subnetting', level: 'core', icon: '🧮', color: '#ff7a45', minutes: 12,
    title: 'Subnetting',
    summary: 'Masken, Netz- und Broadcastadressen und Netze in Stücke teilen.',
    body: `
<h2 id="masks">Subnetzmasken</h2>
<p>Die Präfixlänge lässt sich auch als <strong>Subnetzmaske</strong> schreiben: 1en für Netzbits, 0en für Hostbits. <code>/24</code> = <code>11111111.11111111.11111111.00000000</code> = <code>255.255.255.0</code>. Ein bitweises UND zwischen IP und Maske ergibt die <strong>Netzadresse</strong>.</p>
<pre class="code">  192.168.  1. 42   11000000.10101000.00000001.<span class="s">00101010</span>
& 255.255.255.  0   11111111.11111111.11111111.<span class="c">00000000</span>
= 192.168.  1.  0   <span class="k">Netzadresse</span></pre>

<h2 id="calc">Der Subnetzrechner</h2>
<p>Gib eine beliebige Adresse und ein Präfix ein. Sieh die Netzbits (violett) und Hostbits (mint) und wie sich der Adressbereich beim Verschieben des Präfixes ändert.</p>
<div data-widget="subnet"></div>

<h2 id="rules">Faustregeln</h2>
<ul>
<li>Ein /<em>n</em> hat 2<sup>(32−n)</sup> Adressen. Zieh 2 für nutzbare Hosts ab – die erste ist die <strong>Netzadresse</strong>, die letzte die <strong>Broadcastadresse</strong>.</li>
<li>Jedes zusätzliche Präfixbit halbiert die Größe: /24 = 256, /25 = 128, /26 = 64, /27 = 32, /28 = 16, /29 = 8, /30 = 4.</li>
<li>Subnetzgrenzen sind Vielfache der Blockgröße. In einem /26 (Block 64) beginnen die Netze bei .0, .64, .128, .192.</li>
<li><code>/31</code> ist auf Punkt-zu-Punkt-Leitungen erlaubt (2 Hosts, kein Broadcast); <code>/32</code> ist eine Einzelhost-Route.</li>
</ul>
${analogy('Subnetting ist Pizza schneiden. Das /24 ist die ganze Pizza mit 256 Stücken Adressraum; jedes zusätzliche Präfixbit halbiert jedes Stück.')}

<h2 id="why-subnet">Warum überhaupt subnetten?</h2>
<p>Kleinere Broadcast-Domänen bedeuten weniger Rauschen; getrennte Subnetze für Gäste, Kameras und Server erlauben Firewalls dazwischen; und gute Adresspläne lassen Router viele Subnetze zu einer Route <strong>zusammenfassen</strong>.</p>
<h2 id="practice">Üben</h2>
<p>Bereit? Finde Netzadresse, Broadcast und Hostanzahl. Jede richtige Antwort bringt XP. Für die räumliche Version spiel <a href="#/play/blocks">Subnetz-Blöcke</a>.</p>
<div data-widget="subnet-practice"></div>

${deep('VLSM: Subnetting mit variabler Länge Schritt für Schritt', `
<p>Gegeben <code>10.0.0.0/24</code>: Teile Subnetze für 100, 50, 20 und 2 Hosts auf. Immer das <strong>größte zuerst</strong>, damit Blöcke ausgerichtet bleiben:</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Bedarf</th><th>Block</th><th>Präfix</th><th>Subnetz</th><th>Nutzbarer Bereich</th></tr>
<tr><td>100</td><td>128</td><td>/25</td><td>10.0.0.0/25</td><td>.1 – .126</td></tr>
<tr><td>50</td><td>64</td><td>/26</td><td>10.0.0.128/26</td><td>.129 – .190</td></tr>
<tr><td>20</td><td>32</td><td>/27</td><td>10.0.0.192/27</td><td>.193 – .222</td></tr>
<tr><td>2</td><td>4</td><td>/30</td><td>10.0.0.224/30</td><td>.225 – .226</td></tr>
</table></div>
<p>Damit bleiben <code>10.0.0.228/30</code> bis <code>10.0.0.255</code> frei für Wachstum.</p>`)}
${deep('Routenzusammenfassung (Supernetting)', `
<p>Ein Router, der <code>192.168.0.0/24</code>, <code>.1.0/24</code>, <code>.2.0/24</code> und <code>.3.0/24</code> ankündigt, kann stattdessen eine Route ankündigen: <code>192.168.0.0/22</code>. Schreib die Adressen binär untereinander und behalte die gemeinsamen Bits:</p>
<pre class="code">192.168.000000<span class="s">00</span>.0
192.168.000000<span class="s">01</span>.0
192.168.000000<span class="s">10</span>.0
192.168.000000<span class="s">11</span>.0
         ^^^^^^ 22 gemeinsame Bits →  <span class="k">192.168.0.0/22</span></pre>
<p>Die globale BGP-Tabelle hat über 1 Million IPv4-Routen; Zusammenfassung verhindert, dass sie noch viel größer ist.</p>`)}
`,
    quiz: [
      { q: 'Wie viele nutzbare Hosts hat ein /27?', a: ['32', '30', '62', '14'], c: 1, why: '2^(32−27) = 32 Adressen, minus Netz und Broadcast = 30.' },
      { q: 'Wie lautet die Netzadresse von 10.1.1.77/26?', a: ['10.1.1.0', '10.1.1.64', '10.1.1.76', '10.1.1.128'], c: 1, why: '/26-Blöcke sind 64 breit: .0, .64, .128, .192. 77 liegt in .64–.127.' },
      { q: 'Welche Maske entspricht /20?', a: ['255.255.240.0', '255.255.255.240', '255.255.224.0', '255.240.0.0'], c: 0, why: '20 Bit = 8 + 8 + 4, und 11110000 = 240 im dritten Oktett.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'switching', level: 'core', icon: '🔀', color: '#ff5c9a', minutes: 10,
    title: 'Ethernet, Switches & ARP',
    summary: 'MAC-Adressen, wie Switches lernen und wie IPs auf MACs abgebildet werden.',
    body: `
<h2 id="mac">MAC-Adressen</h2>
<p>Jede Netzwerkschnittstelle hat eine 48-Bit-<strong>MAC-Adresse</strong>, geschrieben wie <code>3c:22:fb:9a:10:4e</code>. Die ersten 24 Bit kennzeichnen den Hersteller (die OUI). MACs zählen nur auf der <strong>lokalen Leitung</strong> – sie verlassen dein LAN nie.</p>

<h2 id="switch">Wie ein Switch lernt</h2>
<p>Ein <strong>Switch</strong> leitet Ethernet-Rahmen zwischen Ports weiter. Anfangs weiß er nichts. Jedes Mal, wenn ein Rahmen ankommt, notiert er „<em>Quell-MAC X hängt an Port P</em>“ in seiner <strong>MAC-Adresstabelle</strong>. Zum Weiterleiten:</p>
<ol>
<li>Steht die Ziel-MAC in der Tabelle → nur an diesen einen Port senden (<strong>weiterleiten</strong>).</li>
<li>Ist sie unbekannt → an jeden Port außer dem Eingangsport senden (<strong>fluten</strong>).</li>
<li>Ist das Ziel der Broadcast <code>ff:ff:ff:ff:ff:ff</code> → fluten.</li>
</ol>
<p>Wähle unten Sender und Empfänger und sieh zu, wie sich die Tabelle füllt.</p>
<div data-widget="switch"></div>
${analogy('Ein Switch ist ein Empfangsmitarbeiter in einem neuen Büro. Beim ersten Brief für „Alice“ ruft er ihn in jeden Flur. Aber er merkt sich, aus welchem Flur Alices eigene Briefe kommen – und geht beim nächsten Mal direkt dorthin.')}

<h2 id="arp">ARP: von IP zu MAC</h2>
<p>Dein Laptop kennt die <em>IP</em>, die er erreichen will, aber Ethernet braucht eine <em>MAC</em>. <strong>ARP</strong> (Address Resolution Protocol) löst das: Es sendet als Broadcast „<em>Wer hat 192.168.1.20? Sag es 192.168.1.10</em>“. Der Besitzer antwortet direkt mit seiner MAC, und beide Seiten speichern die Antwort in einer <strong>ARP-Tabelle</strong>. Deine siehst du mit <code>arp -a</code>.</p>
${note('Liegt das Ziel <em>außerhalb</em> deines Subnetzes, fragst du per ARP nach der MAC des <strong>Default-Gateways</strong>, nicht des Zielservers. Der Rahmen geht an den Router; das IP-Paket darin ist weiterhin an den Server adressiert.')}

<h2 id="hub-switch-router">Hub vs. Switch vs. Router</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Gerät</th><th>Schicht</th><th>Entscheidet anhand</th><th>Verhalten</th></tr>
<tr><td>Hub</td><td>1</td><td>Nichts</td><td>Wiederholt jedes Bit an jeden Port (eine Kollisionsdomäne)</td></tr>
<tr><td>Switch</td><td>2</td><td>MAC-Tabelle</td><td>Leitet Rahmen an den richtigen Port; flutet Broadcasts</td></tr>
<tr><td>Router</td><td>3</td><td>Routingtabelle</td><td>Verbindet verschiedene IP-Netze; blockt Broadcasts</td></tr>
</table></div>

${deep('VLANs: viele LANs auf einem Switch', `
<p>Ein <strong>VLAN</strong> teilt einen physischen Switch in mehrere logische – Gäste in VLAN 20 sehen Server in VLAN 10 auf Schicht 2 nicht. Zwischen Switches trägt ein <strong>Trunk</strong> viele VLANs, indem jeder Rahmen ein 4-Byte-<strong>802.1Q-Tag</strong> mit 12-Bit-VLAN-ID (1–4094) bekommt. Um von einem VLAN ins andere zu kommen, braucht man einen Router (oder Layer-3-Switch) – genau dort setzt man Firewall-Regeln. Mehr in der Lektion <a href="#/learn/vlans">VLANs & Spanning Tree</a>.</p>`)}
${deep('Schleifen, Broadcast-Stürme und Spanning Tree', `
<p>Redundante Verbindungen zwischen Switches erzeugen <strong>Schleifen</strong>. Ethernet-Rahmen haben keine TTL, also würde ein einziger Broadcast ewig kreisen und sich vervielfachen, bis das Netz zusammenbricht (ein <em>Broadcast-Sturm</em>). <strong>STP</strong> (Spanning Tree Protocol, 802.1D) wählt eine <em>Root-Bridge</em> und blockiert gerade so viele Ports, dass die Topologie ein schleifenfreier Baum wird; fällt eine Leitung aus, wird ein blockierter Port freigegeben. Rapid STP (802.1w) konvergiert in etwa einer Sekunde statt 30–50. Moderne Rechenzentren vermeiden STP ganz mit gerouteten Layer-3-Fabrics.</p>`)}
${deep('ARP-Spoofing – warum das LAN nicht automatisch vertrauenswürdig ist', `
<p>ARP hat keine Authentifizierung: Jeder kann „<em>192.168.1.1 ist bei aa:bb:cc…</em>“ senden. Ein Angreifer kann Caches vergiften und sich in den Verkehr hängen. Abwehr: <strong>Dynamic ARP Inspection</strong> auf Switches (prüft ARP gegen DHCP-Leases), Port Security – und vor allem Ende-zu-Ende-Verschlüsselung (TLS), sodass ein Mann in der Mitte nur Chiffretext sieht.</p>`)}
`,
    quiz: [
      { q: 'Was macht ein Switch mit einem Rahmen für eine unbekannte Ziel-MAC?', a: ['Verwirft ihn', 'Flutet ihn an alle anderen Ports', 'Schickt ihn an den Router', 'Fragt DNS'], c: 1, why: 'Unbekannter Unicast wird geflutet; die Antwort lehrt den Switch dann, wo diese MAC hängt.' },
      { q: 'Was bildet ARP ab?', a: ['Hostnamen auf IPs', 'IPs auf MAC-Adressen', 'Ports auf Prozesse', 'MACs auf VLANs'], c: 1, why: 'ARP löst eine IPv4-Adresse des nächsten Hops in die MAC auf, die für den Ethernet-Rahmen nötig ist.' },
      { q: 'Dein PC (192.168.1.10/24) sendet an 8.8.8.8. Wessen MAC steht im Rahmen?', a: ['Die von 8.8.8.8', 'Die des Default-Gateways', 'Die Broadcast-MAC', 'Deine eigene'], c: 1, why: '8.8.8.8 liegt außerhalb des Subnetzes, also ist der Rahmen an den Router (Default-Gateway) adressiert.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'routing', level: 'core', icon: '🧭', color: '#5cf2c2', minutes: 12,
    title: 'Routing',
    summary: 'Routingtabellen, Longest-Prefix-Match, kürzeste Wege und BGP.',
    body: `
<h2 id="routers">Was ein Router tut</h2>
<p>Ein <strong>Router</strong> verbindet Netze. Für jedes Paket liest er die Ziel-IP, schlägt sie in seiner <strong>Routingtabelle</strong> nach, verringert die TTL und schickt das Paket über das gewählte Interface zum <strong>nächsten Hop</strong>. Das wiederholt er Millionen Mal pro Sekunde.</p>
<h3>Longest-Prefix-Match</h3>
<p>Mehrere Routen können zu einem Ziel passen. Der Router wählt die <strong>spezifischste</strong> – das längste Präfix. Die <code>0.0.0.0/0</code>-<strong>Default-Route</strong> passt auf alles und ist daher der letzte Ausweg.</p>
<div data-widget="lpm"></div>

<h2 id="dynamic">Tabellen automatisch bauen</h2>
<p>Kleine Netze nutzen <strong>statische Routen</strong>, die ein Admin eintippt. Größere nutzen <strong>Routingprotokolle</strong>, damit Router Wege lernen und auf Ausfälle reagieren:</p>
<ul>
<li><strong>Distanzvektor</strong> (RIP): Router sagen Nachbarn „ich erreiche X in N Hops“. Einfach, aber langsam beim Konvergieren.</li>
<li><strong>Link-State</strong> (OSPF, IS-IS): Jeder Router flutet eine Karte seiner Verbindungen, dann rechnet jeder mit dem <strong>Dijkstra</strong>-Algorithmus auf der ganzen Karte.</li>
<li><strong>Pfadvektor</strong> (BGP): zwischen Organisationen im Internet; wählt Routen nach Richtlinien, nicht nur nach Entfernung.</li>
</ul>
<p>Unten ist ein Link-State-Netz. Ändere Kosten, kappe Leitungen und sieh, wie Dijkstra den Baum kürzester Wege neu berechnet.</p>
<div data-widget="dijkstra"></div>
${analogy('Distanzvektor ist, Fremde nach dem Weg zu fragen („der Bahnhof ist 3 Straßen in diese Richtung“). Link-State ist: Jeder teilt seinen Stadtplan, und du planst die Route selbst.')}

<h2 id="traceroute">Routen sehen: traceroute</h2>
<p><code>traceroute</code> (bzw. <code>tracert</code> unter Windows) sendet Pakete mit TTL = 1, 2, 3 … Jeder Router, der die TTL auf 0 senkt, schickt eine ICMP-Nachricht „Time Exceeded“ zurück – und verrät sich damit. So kartiert man den Weg zu einem Server Hop für Hop.</p>
<pre class="code"><span class="k">$</span> traceroute example.com
 1  192.168.1.1      1.2 ms   <span class="c"># dein Heimrouter</span>
 2  10.42.0.1        8.9 ms   <span class="c"># Zugangsnetz des Providers</span>
 3  core1.par.isp    9.5 ms
 4  ix.paris.net    10.1 ms   <span class="c"># Internet-Knoten</span>
 5  93.184.215.14   18.7 ms   <span class="c"># Ziel</span></pre>
<p>Willst du selbst das Paket <em>sein</em>? Spiel <a href="#/play/runner">Packet Runner 3D</a>.</p>

${deep('BGP: das Routingprotokoll, das das Internet zusammenhält', `
<p>Jede Organisation mit eigenem Netz ist ein <strong>autonomes System</strong> mit Nummer (AS15169 ist Google, AS13335 Cloudflare). BGP-Router tauschen <em>Präfixe</em> zusammen mit dem <strong>AS-Pfad</strong> aus – der Liste der Netze, durch die die Route lief. Der Pfad verhindert Schleifen (verwirf jede Route mit deinem eigenen AS) und steuert Richtlinien.</p>
<p>Die Routenwahl folgt Geschäftsbeziehungen: Routen von <em>Kunden</em> bevorzugen (die zahlen dir), dann von <em>Peers</em> (kostenloser Austausch), dann von <em>Providern</em> (denen du zahlst). Erst danach kommen Kriterien wie der kürzeste AS-Pfad.</p>
<p>Weil BGP Nachbarn vertraut, verbreiten sich Fehler: Ein <strong>Route Leak</strong> oder <strong>Hijack</strong> kann große Teile des Internets ins Leere laufen lassen. <strong>RPKI</strong> lässt Netze kryptografisch signieren, welches AS welches Präfix ankündigen darf, und Router verwerfen ungültige Ankündigungen zunehmend.</p>`)}
${deep('Dijkstra in Code', `
<pre class="code"><span class="k">function</span> dijkstra(graph, src) {
  <span class="k">const</span> dist = {}, prev = {}, todo = <span class="k">new</span> Set(Object.keys(graph));
  <span class="k">for</span> (<span class="k">const</span> v <span class="k">of</span> todo) dist[v] = Infinity;
  dist[src] = <span class="n">0</span>;
  <span class="k">while</span> (todo.size) {
    <span class="c">// den nächstgelegenen unbesuchten Knoten nehmen</span>
    <span class="k">const</span> u = [...todo].reduce((a, b) => dist[a] &lt; dist[b] ? a : b);
    todo.delete(u);
    <span class="k">for</span> (<span class="k">const</span> [v, cost] <span class="k">of</span> Object.entries(graph[u])) {
      <span class="k">if</span> (dist[u] + cost &lt; dist[v]) { dist[v] = dist[u] + cost; prev[v] = u; }
    }
  }
  <span class="k">return</span> { dist, prev };
}</pre>
<p>Echte Router nutzen eine Prioritätswarteschlange (O((V+E) log V)) und inkrementelles SPF, damit eine einzelne Leitungsänderung nicht alles neu berechnet.</p>`)}
${deep('ECMP, Anycast und wie große Seiten Last verteilen', `
<p>Sind zwei Wege gleich teuer, nutzen Router <strong>ECMP</strong> (Equal-Cost Multipath) und hashen das 5-Tupel jedes Flows, damit die Pakete einer Verbindung auf einem Weg bleiben (keine Umsortierung). <strong>Anycast</strong> kündigt <em>dasselbe</em> IP-Präfix von vielen Orten an; BGP liefert dich dann automatisch beim nächsten ab – so antworten <code>1.1.1.1</code> und Root-DNS-Server mit einer Adresse aus Hunderten Städten.</p>`)}
`,
    quiz: [
      { q: 'Es gibt die Routen 10.0.0.0/8, 10.1.0.0/16 und 10.1.2.0/24. Wohin geht 10.1.2.9?', a: ['10.0.0.0/8', '10.1.0.0/16', '10.1.2.0/24', 'Die Default-Route'], c: 2, why: 'Longest-Prefix-Match: /24 ist die spezifischste passende Route.' },
      { q: 'Welchen Algorithmus nutzt OSPF zur Wegberechnung?', a: ['Bellman-Ford', 'Dijkstra', 'Round Robin', 'Spanning Tree'], c: 1, why: 'Link-State-Protokolle wie OSPF und IS-IS nutzen Dijkstras Shortest-Path-First-Algorithmus.' },
      { q: 'Wie entdeckt traceroute jeden Hop?', a: ['Es fragt DNS', 'Es erhöht die TTL und liest ICMP-„Time Exceeded“-Antworten', 'Es liest die Routingtabelle aus der Ferne', 'Es nutzt ARP'], c: 1, why: 'Jeder Router, der ein Paket mit abgelaufener TTL verwirft, antwortet mit ICMP Time Exceeded und verrät sich.' },
    ],
  },
  /* ============================================================ */
  {
    id: 'what-is-a-network', level: 'foundations', icon: '🕸️', color: '#5cf2c2', minutes: 8,
    title: 'Was ist ein Netzwerk?',
    summary: 'Knoten, Verbindungen, Topologien – und warum das Internet ein Netz aus Netzen ist.',
    body: `
<h2 id="nodes-links">Knoten und Verbindungen</h2>
<p>Ein <strong>Netzwerk</strong> ist einfach eine Menge von Geräten (<strong>Knoten</strong>), die über <strong>Verbindungen</strong> (Links) Daten austauschen können. Dein Handy, ein Laptop, eine smarte Glühbirne, ein Server im Rechenzentrum und der Router im Regal sind alles Knoten. Verbindungen können Kupferkabel, Glasfasern oder Funkwellen (WLAN, 5G) sein.</p>
${analogy('Stell dir ein Straßennetz vor. Häuser sind Knoten, Straßen sind Verbindungen, und Briefe und Pakete zwischen den Häusern sind die <em>Daten</em>. Netzwerktechnik ist alles, was dafür sorgt, dass jedes Paket an der richtigen Tür ankommt – auch wenn eine Straße gesperrt ist.')}
<p>Jedes Netzwerk, von zwei Laptops an einem Kabel bis zum weltweiten Internet, beantwortet dieselben Fragen:</p>
<ul>
  <li><strong>Adressierung</strong> – wie benenne ich das Ziel?</li>
  <li><strong>Weiterleitung</strong> – über welche Verbindung sollen diese Daten als Nächstes?</li>
  <li><strong>Teilen</strong> – wie teilen sich viele Gespräche dieselben Leitungen?</li>
  <li><strong>Zuverlässigkeit</strong> – was passiert, wenn etwas kaputtgeht oder Daten verloren gehen?</li>
</ul>

<h2 id="topologies">Topologien: die Form eines Netzes</h2>
<p>Eine <strong>Topologie</strong> beschreibt, wie Knoten verkabelt sind. Jede Form tauscht Kosten gegen Ausfallsicherheit. Probier sie unten aus: Wähle ein Layout und <em>klicke eine Verbindung an, um sie zu kappen</em>. Sieh, welche Knoten sich noch erreichen.</p>
<div data-widget="topology"></div>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Topologie</th><th>Vorteile</th><th>Nachteile</th><th>Wo man sie sieht</th></tr>
<tr><td>Bus</td><td>Billig, einfach</td><td>Ein Bruch teilt alles; Kollisionen</td><td>Frühes Ethernet (Koax)</td></tr>
<tr><td>Stern</td><td>Leicht zu verwalten; ein defektes Kabel trifft nur einen Knoten</td><td>Die Mitte ist ein einzelner Ausfallpunkt</td><td>Dein WLAN zu Hause, Büro-Switches</td></tr>
<tr><td>Ring</td><td>Vorhersagbar; übersteht einen Bruch, wenn bidirektional</td><td>Zwei Brüche teilen ihn</td><td>Glasfaserringe in Städten, Token Ring</td></tr>
<tr><td>Vermascht</td><td>Sehr ausfallsicher, viele Wege</td><td>Teuer: n(n−1)/2 Verbindungen bei Vollvermaschung</td><td>Internet-Backbone, Rechenzentren</td></tr>
</table></div>

<h2 id="lan-wan">LAN, WAN und das Internet</h2>
<p>Ein <strong>LAN</strong> (Local Area Network) umfasst eine Wohnung, ein Büro oder einen Campus – meist gehört es einer Organisation. Ein <strong>WAN</strong> (Wide Area Network) erstreckt sich über Städte oder Kontinente. Das <strong>Internet</strong> ist ein riesiges Netz <em>aus</em> Netzen: Zehntausende unabhängig betriebene Netze (sogenannte <strong>autonome Systeme</strong>), die vereinbaren, Verkehr auszutauschen.</p>
${note('Dein Heimnetz ist ein LAN. Dein Internetanbieter (ISP) verbindet dieses LAN mit seinem eigenen Netz, das mit anderen Anbietern, Cloud-Providern und Content-Netzen verbunden ist – und dieses Geflecht ist das Internet.')}

<h2 id="packets">Paketvermittlung</h2>
<p>Alte Telefonnetze nutzten <strong>Leitungsvermittlung</strong>: Ein Anruf reservierte für seine gesamte Dauer einen festen Weg. Das Internet nutzt <strong>Paketvermittlung</strong>: Daten werden in kleine Stücke, sogenannte <strong>Pakete</strong>, zerlegt, und jedes trägt seine eigene Zieladresse. Router leiten Pakete unabhängig voneinander weiter – so teilen sich viele Gespräche die Leitungen effizient, und Verkehr kann um Ausfälle herumfließen.</p>
${analogy('Leitungsvermittlung ist, einen ganzen Zug für einen Fahrgast zu buchen. Paketvermittlung ist: Alle teilen sich Busse, und jeder Fahrgast hat ein Ticket mit seinem Ziel.')}

${deep('Netze messen: Bandbreite, Latenz, Jitter und Verlust', `
<p>Vier Zahlen beschreiben, wie sich ein Weg „anfühlt“:</p>
<ul>
<li><strong>Bandbreite / Durchsatz</strong> – wie viele Bits pro Sekunde fließen können (Mbit/s, Gbit/s). Bandbreite ist die Kapazität, Durchsatz das, was tatsächlich ankommt.</li>
<li><strong>Latenz</strong> – wie lange ein Bit bis zum Ziel braucht. Sie ist die Summe aus <em>Ausbreitung</em> (Entfernung ÷ Lichtgeschwindigkeit im Medium, ca. 200 000 km/s in Glasfaser), <em>Übertragung</em> (Paketgröße ÷ Leitungsrate), <em>Verarbeitung</em> und <em>Warteschlangen</em>.</li>
<li><strong>Jitter</strong> – Schwankung der Latenz. Schlecht für Sprache und Video.</li>
<li><strong>Paketverlust</strong> – der Anteil der Pakete, die nie ankommen, meist weil eine Warteschlange übergelaufen ist.</li>
</ul>
<p>Das <strong>Bandbreite-Verzögerungs-Produkt</strong> (Bandbreite × Rundlaufzeit) sagt, wie viele Bits gleichzeitig „unterwegs“ sind. Eine 1-Gbit/s-Leitung mit 80 ms RTT hält 10 MB in der Luft – deshalb braucht TCP auf langen, dicken Leitungen große Fenster.</p>
<pre class="code"><span class="c"># Ausbreitungsverzögerung Paris → New York (~5 800 km Glasfaser)</span>
5 800 km ÷ 200 000 km/s ≈ <span class="n">29 ms</span> einfach  →  mind. ~58 ms RTT</pre>
<p>Kein Geld der Welt schlägt die Physik: Die Lichtgeschwindigkeit setzt eine Untergrenze für die Latenz – deshalb stellen CDNs Server in deine Nähe.</p>
`)}
${deep('Graphentheorie: warum vermaschte Netze überleben', `
<p>Ein Netz ist ein <strong>Graph</strong> G = (V, E). Ausfallsicherheit hängt am <em>Zusammenhang</em>: Der <strong>Kantenzusammenhang</strong> λ(G) ist die kleinste Zahl an Verbindungen, die man kappen muss, um den Graphen zu teilen. Ein Stern hat λ = 1 (eine Speiche kappen isoliert ein Blatt). Ein Ring hat λ = 2. Ein Vollmaschennetz aus n Knoten hat λ = n − 1.</p>
<p>Echte Backbones streben λ ≥ 2 zwischen allen Standorten an, oft mit physisch getrennten Glasfaserwegen – zwei Kabel im selben Graben sind eigentlich eine Verbindung, sobald der Bagger kommt.</p>`)}
`,
    quiz: [
      { q: 'Welche Topologie hat in der Mitte einen einzelnen Ausfallpunkt?', a: ['Vermascht', 'Stern', 'Ring', 'Keine davon'], c: 1, why: 'Beim Stern läuft alles über den zentralen Switch/Hub – fällt er aus, sind alle abgeschnitten.' },
      { q: 'Was ist die Kernidee der Paketvermittlung?', a: ['Pro Gespräch wird ein fester Weg reserviert', 'Daten werden in unabhängig weitergeleitete Stücke zerlegt', 'Alle Knoten teilen sich ein Kabel', 'Nur ein Gerät darf gleichzeitig senden'], c: 1, why: 'Jedes Paket trägt sein Ziel und teilt sich Leitungen mit anderem Verkehr; kein Weg wird reserviert.' },
      { q: 'Wie viele Verbindungen braucht ein Vollmaschennetz aus 6 Knoten?', a: ['6', '12', '15', '36'], c: 2, why: 'n(n−1)/2 = 6×5/2 = 15.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'layers', level: 'foundations', icon: '🧅', color: '#8b7bff', minutes: 10,
    title: 'Schichten: OSI & TCP/IP',
    summary: 'Warum Netzwerktechnik als Stapel gebaut ist und wie Daten in Header verpackt werden.',
    body: `
<h2 id="why-layers">Warum Schichten?</h2>
<p>Netzwerktechnik ist ein riesiges Problem: elektrische Signale, Adressierung, Routing um den Globus, zuverlässige Zustellung, Verschlüsselung, Webseiten. Statt eines Monsterprogramms teilt man die Aufgabe in <strong>Schichten</strong>. Jede Schicht bietet der darüberliegenden einen Dienst und nutzt die darunterliegende – und man kann die Umsetzung einer Schicht austauschen (WLAN statt Ethernet), ohne die anderen anzufassen.</p>
${analogy('Ein Geschenk ins Ausland schicken: Du schreibst eine Karte (Anwendung), packst sie in einen Karton (Transport), klebst das Adressetikett drauf (Vermittlung), der Kurier lädt ihn in einen Lkw zum nächsten Depot (Sicherung), und der Lkw fährt auf der Straße (Bitübertragung). Jeder kümmert sich nur um seinen Schritt.')}

<h2 id="models">Das OSI-Modell vs. TCP/IP</h2>
<p>Das <strong>OSI-Modell</strong> hat sieben Schichten und ist ein tolles Vokabular. Das Internet läuft tatsächlich mit dem einfacheren <strong>TCP/IP-Modell</strong> (4 Schichten), aber Ingenieure sagen trotzdem „Layer-2-Switch“ oder „Layer-7-Loadbalancer“ mit den OSI-Nummern. Klick eine Schicht an, um sie zu erkunden, und drück dann <em>Senden</em>, um die Kapselung zu sehen.</p>
<div data-widget="osi"></div>
<p>Eine klassische Eselsbrücke von oben nach unten: <strong>A</strong>lle <strong>D</strong>eutschen <strong>S</strong>chüler <strong>T</strong>rinken <strong>V</strong>erschiedene <strong>S</strong>orten <strong>B</strong>ier (Anwendung, Darstellung, Sitzung, Transport, Vermittlung, Sicherung, Bitübertragung).</p>

<h2 id="encapsulation">Kapselung</h2>
<p>Während die Daten beim Sender den Stapel <em>hinunter</em> wandern, fügt jede Schicht ihren eigenen <strong>Header</strong> hinzu (die Sicherungsschicht zusätzlich einen Trailer). Die Dateneinheit heißt auf jeder Schicht anders – ihre <strong>PDU</strong> (Protocol Data Unit):</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Schicht</th><th>PDU</th><th>Wichtige Adresse</th><th>Typisches Gerät</th></tr>
<tr><td>Anwendung (7–5)</td><td>Daten / Nachricht</td><td>URL, Hostname</td><td>Server, Browser</td></tr>
<tr><td>Transport (4)</td><td>Segment (TCP) / Datagramm (UDP)</td><td>Portnummer</td><td>Firewall, Loadbalancer</td></tr>
<tr><td>Vermittlung (3)</td><td>Paket</td><td>IP-Adresse</td><td>Router</td></tr>
<tr><td>Sicherung (2)</td><td>Rahmen (Frame)</td><td>MAC-Adresse</td><td>Switch, Access Point</td></tr>
<tr><td>Bitübertragung (1)</td><td>Bits / Symbole</td><td>—</td><td>Kabel, Netzwerkkarte, Repeater</td></tr>
</table></div>
<p>Der Empfänger macht das Umgekehrte – <strong>Entkapselung</strong>: Jede Schicht liest und entfernt ihren eigenen Header und gibt die Nutzlast nach oben weiter.</p>
${note('Router arbeiten auf Schicht 3: Sie entfernen den alten Rahmen, schauen in den IP-Header und packen das Paket in einen <em>neuen</em> Rahmen für die nächste Leitung. Die IP-Adressen bleiben Ende-zu-Ende gleich, die MAC-Adressen wechseln bei jedem Hop.')}

${deep('Was steht eigentlich in einem Header? Echte Byte-Layouts', `
<p>Hier ist ein IPv4-Header – 20 Byte ohne Optionen – die wichtigsten 160 Bits im Internet:</p>
<pre class="code"> 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-------+-------+---------------+-------------------------------+
|<span class="k">Version</span>|  <span class="k">IHL</span>  |  DSCP / ECN   |         <span class="k">Total Length</span>          |
+-------+-------+---------------+-----+-------------------------+
|        Identification         |Flags|     Fragment Offset     |
+---------------+---------------+-----+-------------------------+
|  <span class="n">Time to Live</span> |   <span class="s">Protocol</span>    |        Header Checksum        |
+---------------+---------------+-------------------------------+
|                     <span class="s">Quell-IP-Adresse</span>                          |
+---------------------------------------------------------------+
|                     <span class="s">Ziel-IP-Adresse</span>                           |
+---------------------------------------------------------------+</pre>
<ul>
<li>Die <strong>TTL</strong> wird von jedem Router verringert; bei 0 wird das Paket verworfen (verhindert Endlosschleifen – und macht <code>traceroute</code> möglich).</li>
<li><strong>Protocol</strong> sagt dem Empfänger, welcher Transport-Header folgt: 6 = TCP, 17 = UDP, 1 = ICMP.</li>
<li>Ein Ethernet-Rahmen fügt 14 Byte Header hinzu (Ziel-MAC, Quell-MAC, EtherType) und 4 Byte CRC-Trailer.</li>
</ul>
<p>Der Overhead summiert sich: Eine Ethernet-Nutzlast von 1 500 Byte mit TCP/IPv4 lässt höchstens 1 460 Byte (die <strong>MSS</strong>) für deine Daten übrig.</p>`)}
${deep('Wo das Modell bricht: Tunnel, TLS und QUIC', `
<p>Schichten sind ein Modell, kein Gesetz. Ein VPN steckt ein ganzes IP-Paket <em>in</em> ein anderes IP-Paket (Schicht 3 in Schicht 3). TLS sitzt unbequem zwischen Transport und Anwendung. <strong>QUIC</strong> (genutzt von HTTP/3) baut Zuverlässigkeit und Verschlüsselung im Userspace über UDP – und verwischt die Schichten 4–7. VXLAN transportiert Layer-2-Ethernet-Rahmen in UDP, damit Rechenzentren LANs über geroutete Netze spannen können.</p>
<p>Die nützliche Lehre: Denk bei jedem Protokoll an <em>„was braucht es von unten, was bietet es nach oben“</em>, nicht an das Kästchen, in das es passt.</p>`)}
`,
    quiz: [
      { q: 'Auf welcher Schicht treffen Router ihre Weiterleitungsentscheidungen?', a: ['Schicht 2 – Sicherung', 'Schicht 3 – Vermittlung', 'Schicht 4 – Transport', 'Schicht 7 – Anwendung'], c: 1, why: 'Router lesen die IP-Zieladresse (Vermittlungsschicht), um den nächsten Hop zu wählen.' },
      { q: 'Wie heißt die PDU auf der Sicherungsschicht?', a: ['Segment', 'Paket', 'Rahmen (Frame)', 'Bit'], c: 2, why: 'Schicht 2 transportiert Rahmen, adressiert mit MAC-Adressen.' },
      { q: 'Ein Paket durchquert drei Router. Welche Adressen ändern sich bei jedem Hop?', a: ['IP-Adressen', 'MAC-Adressen', 'Portnummern', 'Keine'], c: 1, why: 'Jede Leitung bekommt einen neuen Rahmen mit neuen Quell-/Ziel-MACs; IPs bleiben Ende-zu-Ende (ohne NAT).' },
    ],
  },

  /* ============================================================ */
  {
    id: 'bits-on-the-wire', level: 'foundations', icon: '〰️', color: '#ffd166', minutes: 7,
    title: 'Bits auf der Leitung',
    summary: 'Wie aus Nullen und Einsen Spannung, Licht und Funkwellen werden – die Bitübertragungsschicht.',
    body: `
<h2 id="signals">Von Bits zu Signalen</h2>
<p>Alles darüber wird am Ende zu einem <strong>Signal</strong>: Spannungsänderungen auf Kupfer, Lichtpulse in Glasfaser oder modulierte Funkwellen in der Luft. Die Bitübertragungsschicht legt fest, wie eine 0 und eine 1 aussehen, wie schnell sie gesendet werden (die <strong>Symbolrate</strong>) und wie Sender und Empfänger im Takt bleiben.</p>
<div data-widget="signal"></div>
<h3>Leitungscodes</h3>
<ul>
<li><strong>NRZ</strong> (Non-Return-to-Zero): hoch = 1, niedrig = 0. Einfach, aber lange Folgen gleicher Bits haben keine Wechsel, sodass die Uhr des Empfängers wegdriften kann.</li>
<li><strong>Manchester</strong>: Jedes Bit hat in der Mitte einen Wechsel (niedrig→hoch = 1). Selbsttaktend, genutzt von 10-Mbit/s-Ethernet, braucht aber die doppelte Bandbreite.</li>
<li><strong>PAM-4</strong>: Vier Spannungsstufen tragen <em>zwei</em> Bits pro Symbol. Genutzt von modernen 100–400-Gbit/s-Leitungen.</li>
</ul>

<h2 id="media">Medien: Kupfer, Glasfaser, Funk</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Medium</th><th>Typische Geschwindigkeit</th><th>Reichweite</th><th>Hinweise</th></tr>
<tr><td>Twisted Pair (Cat6)</td><td>1–10 Gbit/s</td><td>100 m</td><td>Verdrillung hebt Störungen auf</td></tr>
<tr><td>Singlemode-Glasfaser</td><td>10 Gbit/s – 800 Gbit/s+</td><td>10–80 km+ pro Abschnitt</td><td>Immun gegen elektromagnetische Störungen, Unterseekabel</td></tr>
<tr><td>Wi‑Fi 6/7</td><td>Hunderte Mbit/s – mehrere Gbit/s</td><td>Dutzende Meter</td><td>Geteiltes Medium, Störungen, Halbduplex</td></tr>
<tr><td>5G / LTE</td><td>10 – 1000+ Mbit/s</td><td>km</td><td>Lizenziertes Spektrum, von Netzbetreibern verwaltet</td></tr>
</table></div>
${note('<strong>Duplex</strong>: Vollduplex-Leitungen senden gleichzeitig in beide Richtungen (modernes geswitchtes Ethernet). Halbduplex-Medien (klassisches WLAN, Walkie-Talkies) müssen sich abwechseln und brauchen daher Regeln, wer wann spricht.')}

<h2 id="sharing">Das Medium teilen</h2>
<p>Teilen sich mehrere Geräte ein Medium, dürfen sie nicht durcheinanderreden. Klassisches Ethernet nutzte <strong>CSMA/CD</strong> („hören, senden, und bei erkannter Kollision eine zufällige Zeit warten“). WLAN nutzt <strong>CSMA/CA</strong>: Funkgeräte hören Kollisionen beim Senden nicht, also warten sie zufällige Zeiten <em>vor</em> dem Senden und verlangen Bestätigungen.</p>

${deep('Shannon, Rauschen und warum WLAN weit weg vom Router langsam wird', `
<p>Claude Shannon bewies die maximale fehlerfreie Rate eines Kanals:</p>
<pre class="code">C = B · log₂(1 + S/N)
<span class="c"># C = Kapazität (bit/s), B = Bandbreite (Hz), S/N = Signal-Rausch-Verhältnis</span>
<span class="c"># 20-MHz-WLAN-Kanal bei SNR 30 dB (S/N = 1000):</span>
C ≈ 20e6 × log₂(1001) ≈ <span class="n">199 Mbit/s</span></pre>
<p>Je weiter du dich vom Access Point entfernst, desto schwächer das Signal, desto niedriger das SNR – und das Funkgerät wechselt zu robusteren (langsameren) <strong>Modulations- und Codierungsverfahren</strong>, etwa von 1024-QAM (10 Bit/Symbol) hinunter zu BPSK (1 Bit/Symbol). Breitere Kanäle (mehr B) und MIMO (mehrere parallele räumliche Ströme) machen WLAN schneller.</p>`)}
${deep('Fehlererkennung: Parität, Prüfsummen und CRC', `
<p>Rauschen kippt Bits. Jede Schicht fügt Redundanz hinzu, um Fehler zu <em>erkennen</em>: Ethernet hängt eine 32-Bit-<strong>CRC</strong> (zyklische Redundanzprüfung) an – eine Polynomdivision über den Rahmen, die alle Fehlerbursts bis 32 Bit findet. IP und TCP nutzen eine einfachere 16-Bit-Einerkomplement-Prüfsumme. Beschädigte Rahmen werden stillschweigend verworfen; höhere Schichten (wie TCP) müssen das bemerken und neu senden.</p>
<p>Manche Leitungen gehen weiter mit <strong>Vorwärtsfehlerkorrektur</strong> (FEC) – genug Redundanz, um Fehler ohne Neusendung zu <em>reparieren</em>. Unverzichtbar für 400G-Optik und Raumsonden.</p>`)}
`,
    quiz: [
      { q: 'Warum macht Manchester-Codierung die Taktrückgewinnung leicht?', a: ['Sie nutzt vier Spannungsstufen', 'Jedes Bit enthält einen Wechsel', 'Sie sendet nie Nullen', 'Sie läuft nur über Glasfaser'], c: 1, why: 'Der garantierte Wechsel in der Bitmitte lässt den Empfänger seine Uhr bei jedem Bit neu synchronisieren.' },
      { q: 'Welches Zugriffsverfahren nutzt WLAN?', a: ['CSMA/CD', 'CSMA/CA', 'Token Passing', 'Leitungsvermittlung'], c: 1, why: 'Funkgeräte erkennen Kollisionen beim Senden nicht, also vermeidet WLAN sie (Collision Avoidance) und nutzt ACKs.' },
      { q: 'Wie viele Bits sendet PAM-4 pro Symbol?', a: ['1', '2', '4', '8'], c: 1, why: 'Vier Stufen = log₂(4) = 2 Bits pro Symbol.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'wifi', level: 'foundations', icon: '📶', color: '#4cc9ff', minutes: 10,
    title: 'WLAN & Funk',
    summary: 'Funk, Kanäle, Signalstärke – und warum dein WLAN im Schlafzimmer langsam ist.',
    body: `
<h2 id="radio">Netzwerk über Funk</h2>
<p><strong>WLAN</strong> (Wi‑Fi, IEEE 802.11) überträgt Ethernet-ähnliche Rahmen per Funk. Dein Laptop und der <strong>Access Point</strong> (AP) sprechen abwechselnd auf einem gemeinsamen <strong>Kanal</strong> – einem Ausschnitt aus dem 2,4-, 5- oder 6-GHz-Band. Anders als ein Kabel teilt man die Luft mit Nachbarn, Mikrowellen und Bluetooth, und Wände schlucken Signal.</p>
${analogy('WLAN ist ein Gespräch in einem vollen Café. Je weiter ihr auseinandersitzt, desto lauter und langsamer müsst ihr reden, um verstanden zu werden. Und wenn der Nebentisch denselben „Kanal“ nutzt, unterbrecht ihr euch ständig.')}

<h2 id="signal">Signalstärke: RSSI und SNR</h2>
<p>Signalstärke wird in <strong>dBm</strong> gemessen, einer logarithmischen Skala: −30 dBm ist hervorragend, −90 dBm kaum noch da. Entscheidend ist aber der <strong>SNR</strong> (Signal-Rausch-Abstand): wie weit das Signal über dem Grundrauschen (ca. −95 dBm) liegt. Ein höherer SNR erlaubt dichtere Modulation und damit mehr Bits pro Sekunde.</p>
<p>Zieh den Laptop und die Access Points durch die Wohnung unten. Wände kosten Signal, Entfernung kostet Signal, und zwei APs auf demselben Kanal kommen sich in die Quere.</p>
<div data-widget="wifi"></div>
<div class="tbl-wrap"><table class="tbl">
<tr><th>RSSI</th><th>Qualität</th><th>Was du merkst</th></tr>
<tr><td>−30 bis −55 dBm</td><td>Hervorragend</td><td>Volle Geschwindigkeit, 4K-Streaming, große Downloads</td></tr>
<tr><td>−55 bis −67 dBm</td><td>Gut</td><td>Videocalls laufen gut</td></tr>
<tr><td>−67 bis −75 dBm</td><td>Mittel</td><td>Surfen geht, Calls können ruckeln</td></tr>
<tr><td>unter −80 dBm</td><td>Schlecht</td><td>Abbrüche, Wiederholungen, sehr niedrige Raten</td></tr>
</table></div>

<h2 id="bands">Bänder und Kanäle</h2>
<ul>
<li><strong>2,4 GHz</strong>: große Reichweite, geht gut durch Wände, aber überfüllt und langsam. Nur die Kanäle <strong>1, 6 und 11</strong> überlappen sich nicht.</li>
<li><strong>5 GHz</strong>: viel mehr Kanäle und deutlich schneller, aber kürzere Reichweite.</li>
<li><strong>6 GHz</strong> (Wi‑Fi 6E/7): riesiges, sauberes Spektrum und sehr breite Kanäle, aber die kürzeste Reichweite.</li>
</ul>
${note('Teilen sich zwei Netze einen Kanal, addieren sie sich nicht – sie <em>teilen</em> sich die Sendezeit. Ein anderer, nicht überlappender Kanal hilft oft mehr als ein schnellerer Router.')}

<h2 id="joining">Wie ein Gerät beitritt</h2>
<ol>
<li><strong>Scannen</strong>: auf <em>Beacons</em> hören (APs kündigen ihre SSID etwa zehnmal pro Sekunde an).</li>
<li><strong>Authentifizieren & assoziieren</strong> mit dem gewählten AP.</li>
<li><strong>WPA2/WPA3-4-Wege-Handshake</strong>: Schlüssel aus dem Passwort ableiten, ohne es zu senden.</li>
<li><strong>DHCP</strong>: eine IP-Adresse bekommen – fertig, du bist online.</li>
</ol>

${deep('WLAN-Generationen und was sie wirklich schneller machte', `
<div class="tbl-wrap"><table class="tbl">
<tr><th>Name</th><th>Standard</th><th>Wichtigste Tricks</th></tr>
<tr><td>Wi‑Fi 4</td><td>802.11n</td><td>MIMO (mehrere Antennen), 40-MHz-Kanäle</td></tr>
<tr><td>Wi‑Fi 5</td><td>802.11ac</td><td>256-QAM, 80/160 MHz, Downlink-MU-MIMO</td></tr>
<tr><td>Wi‑Fi 6/6E</td><td>802.11ax</td><td>OFDMA (viele Nutzer pro Übertragung), 1024-QAM, 6-GHz-Band, Target Wake Time</td></tr>
<tr><td>Wi‑Fi 7</td><td>802.11be</td><td>320-MHz-Kanäle, 4096-QAM, Multi-Link über mehrere Bänder</td></tr>
</table></div>
<p>Das Muster: mehr <em>Bandbreite</em> (breitere Kanäle), mehr <em>Bits pro Symbol</em> (dichteres QAM, braucht hohen SNR), mehr <em>parallele Ströme</em> (MIMO) und besseres <em>Teilen</em> (OFDMA). Die Reichweite hat sich kaum verbessert – die Physik hat sich nicht geändert.</p>`)}
${deep('Das Hidden-Node-Problem und RTS/CTS', `
<p>Laptop A und B hören beide den AP, aber nicht einander (eine Wand dazwischen). Beide halten den Kanal für „frei“ und senden gleichzeitig – ihre Rahmen kollidieren <em>beim AP</em>. Die Lösung ist <strong>RTS/CTS</strong>: Eine Station fragt „Request To Send“, und der AP antwortet „Clear To Send“ so laut, dass jede Station es hört und schweigt. Das kostet Sendezeit, daher nutzt man es für größere Rahmen.</p>`)}
${deep('WLAN-Sicherheit: WEP → WPA2 → WPA3', `
<p><strong>WEP</strong> war in Minuten geknackt. <strong>WPA2-PSK</strong> nutzt einen 4-Wege-Handshake – aber wer ihn mitschneidet, kann das Passwort offline erraten (Wörterbuchangriff). <strong>WPA3-SAE</strong> nutzt einen passwortauthentifizierten Schlüsselaustausch (Dragonfly), der Offline-Raten verhindert und Forward Secrecy bietet. Firmennetze nutzen <strong>802.1X</strong> mit persönlichem Login über einen RADIUS-Server statt eines gemeinsamen Passworts.</p>`)}
`,
    quiz: [
      { q: 'Welche 2,4-GHz-Kanäle überlappen sich nicht?', a: ['1, 2, 3', '1, 6, 11', '1, 7, 13', 'Alle'], c: 1, why: 'Jeder Kanal ist ~20 MHz breit, aber nur 5 MHz versetzt – daher stören sich nur 1, 6 und 11 nicht.' },
      { q: 'Welcher RSSI-Wert ist das stärkste Signal?', a: ['−85 dBm', '−70 dBm', '−45 dBm', '−95 dBm'], c: 2, why: 'dBm-Werte näher an null sind stärker; −45 dBm ist hervorragend.' },
      { q: 'Warum sinkt die Geschwindigkeit weit weg vom Access Point?', a: ['Der Router drosselt dich', 'Niedrigerer SNR erzwingt langsamere, robustere Modulation', 'DHCP erneuert sich', 'IP-Pakete werden größer'], c: 1, why: 'Mit weniger Abstand zum Rauschen muss das Funkgerät weniger Bits pro Symbol nutzen, um fehlerfrei zu bleiben.' },
    ],
  },
  /* ============================================================ */
  {
    id: 'ipv6', level: 'core', icon: '6️⃣', color: '#4cc9ff', minutes: 12,
    title: 'IPv6 im Detail',
    summary: '128-Bit-Adressen, wie man sie kürzt, SLAAC und das Leben im Dual-Stack.',
    body: `
<h2 id="why6">Warum IPv6?</h2>
<p>IPv4 hat rund 4,3 Milliarden Adressen – und die sind seit Jahren aufgebraucht. NAT hat sie gestreckt, aber mit Nebenwirkungen: Geräte erreichen sich nicht mehr direkt, und Provider brauchen riesige Carrier-Grade-NAT-Anlagen. <strong>IPv6</strong> nutzt <strong>128-Bit</strong>-Adressen: 340 Sextillionen (3,4×10<sup>38</sup>), genug, um jedem Gerät wieder eine weltweit eindeutige Adresse zu geben.</p>
${analogy('IPv4 ist eine Stadt, der die Hausnummern ausgegangen sind: Ganze Wohnblöcke teilen sich eine Nummer, und ein Pförtner (NAT) sortiert die Post. IPv6 gibt jeder Wohnung wieder eine eigene Nummer – und es bleiben genug für jedes Sandkorn übrig.')}

<h2 id="notation">Adressen schreiben</h2>
<p>Eine IPv6-Adresse besteht aus 8 Gruppen mit je 4 Hex-Ziffern: <code>2001:0db8:0000:0000:0000:ff00:0042:8329</code>. Zwei Regeln machen sie kürzer:</p>
<ol>
<li><strong>Führende Nullen</strong> pro Gruppe weglassen: <code>0db8</code> → <code>db8</code>, <code>0000</code> → <code>0</code>.</li>
<li><strong>Eine</strong> Folge von Nullgruppen durch <code>::</code> ersetzen – die längste (bei Gleichstand die erste).</li>
</ol>
<p>Ergebnis: <code>2001:db8::ff00:42:8329</code>. Probier den Umrechner und dann das Training:</p>
<div data-widget="ipv6"></div>
${warn('<code>::</code> darf nur einmal vorkommen – sonst wüsste niemand, wie viele Nullen jedes davon versteckt. <code>2001::1::2</code> ist ungültig.')}

<h2 id="types">Adresstypen</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Präfix</th><th>Typ</th><th>IPv4-Verwandter</th></tr>
<tr><td><code>2000::/3</code></td><td>Global Unicast (öffentlich)</td><td>öffentliche Adressen</td></tr>
<tr><td><code>fe80::/10</code></td><td>Link-Local – auf jedem Interface, wird nie geroutet</td><td>169.254.0.0/16</td></tr>
<tr><td><code>fc00::/7</code></td><td>Unique Local (privat)</td><td>10/8, 192.168/16</td></tr>
<tr><td><code>ff00::/8</code></td><td>Multicast (IPv6 hat keinen Broadcast)</td><td>224.0.0.0/4</td></tr>
<tr><td><code>::1</code></td><td>Loopback</td><td>127.0.0.1</td></tr>
</table></div>
<p>Ein LAN bekommt fast immer ein <strong>/64</strong>: Die ersten 64 Bit sind das Netz, die letzten 64 die <strong>Interface-ID</strong>. Provider geben einem Haushalt typischerweise ein /56 oder /48 – das sind 256 bzw. 65 536 LANs.</p>

<h2 id="slaac">Eine Adresse bekommen: SLAAC</h2>
<p>IPv6-Hosts können sich ganz ohne DHCP-Server selbst konfigurieren. Der Router sendet <strong>Router Advertisements</strong> („dieses LAN ist 2001:db8:ab:1::/64, ich bin dein Gateway“), und der Host baut seine Interface-ID selbst. Sie kann aus der MAC entstehen (EUI-64, siehe Widget) oder – heute meist – aus zufälligen <em>Privacy-Adressen</em>, die regelmäßig wechseln. <strong>Neighbor Discovery</strong> (ICMPv6) ersetzt ARP, und <strong>DAD</strong> (Duplicate Address Detection) stellt sicher, dass niemand sonst dieselbe Adresse nutzt.</p>

${deep('Dual Stack und Happy Eyeballs', `
<p>Die meisten Netze betreiben IPv4 und IPv6 parallel (<strong>Dual Stack</strong>). Hat ein Name sowohl A- als auch AAAA-Einträge, lässt der Browser beide gegeneinander antreten: Er startet mit IPv6 und probiert nach etwa 250 ms ohne Verbindung zusätzlich IPv4 – der Schnellere gewinnt. Das ist <strong>Happy Eyeballs</strong> (RFC 8305), und deshalb fühlt sich das Web bei halb kaputtem IPv6 nicht langsam an.</p>
<p>Mobilfunknetze laufen oft <strong>nur mit IPv6</strong> und nutzen <strong>NAT64/DNS64</strong>: Fragt eine App nach einer Seite mit reiner IPv4-Adresse, erfindet DNS64 eine IPv6-Adresse in <code>64:ff9b::/96</code>, und ein NAT64-Gateway übersetzt.</p>`)}
${deep('Der IPv6-Header: einfacher und schneller', `
<p>Der IPv6-Header ist fest 40 Byte groß und hat weniger Felder als IPv4: keine Header-Prüfsumme (Schicht 2 und 4 prüfen ohnehin) und keine Fragmentierung durch Router (nur der Sender fragmentiert, per Path-MTU-Discovery). Optionen wandern in <strong>Extension Header</strong>, verkettet über das Feld <em>Next Header</em>. <em>Hop Limit</em> ersetzt die TTL. Die minimale MTU ist 1280 Byte.</p>
<pre class="code">| Version | Traffic Class | Flow Label            |
| Payload Length   | <span class="k">Next Header</span> | <span class="n">Hop Limit</span> |
| <span class="s">Quelladresse (128 Bit)</span>                      |
| <span class="s">Zieladresse (128 Bit)</span>                       |</pre>`)}
`,
    quiz: [
      { q: 'Was ist die korrekte Kurzform von 2001:0db8:0000:0000:0001:0000:0000:0001?', a: ['2001:db8::1::1', '2001:db8::1:0:0:1', '2001:db8:0:0:1::1', '2001:db8::10:0:1'], c: 1, why: 'Beide Nullfolgen sind 2 Gruppen lang; die erste bekommt das ::, die zweite bleibt als 0:0.' },
      { q: 'Welche IPv6-Funktion ersetzt ARP?', a: ['DHCPv6', 'Neighbor Discovery (ICMPv6)', 'Happy Eyeballs', 'NAT64'], c: 1, why: 'Neighbor Discovery findet Link-Layer-Adressen mit ICMPv6-Multicast-Nachrichten.' },
      { q: 'Wie groß ist ein typisches IPv6-LAN-Subnetz?', a: ['/24', '/48', '/64', '/128'], c: 2, why: 'Ein /64 ist Standard: 64 Bit Netz und 64 Bit Interface-ID, die SLAAC braucht.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'vlans', level: 'core', icon: '🌳', color: '#ff5c9a', minutes: 11,
    title: 'VLANs & Spanning Tree',
    summary: 'Einen Switch in viele Netze teilen – und verhindern, dass redundante Links das LAN lahmlegen.',
    body: `
<h2 id="vlan">VLANs: viele LANs, ein Switch</h2>
<p>Ein <strong>VLAN</strong> (virtuelles LAN) teilt einen Switch in getrennte Broadcast-Domänen. Ports in VLAN 10 (Mitarbeiter) sehen keine Rahmen aus VLAN 20 (Gäste) auf Schicht 2 – als hingen sie an verschiedenen Switches. Um zwischen VLANs zu kommunizieren, muss der Verkehr über einen Router oder Layer-3-Switch – genau dort setzt man Firewall-Regeln.</p>
${analogy('Ein Bürogebäude, aber Etagen mit eigenen Schlüsselkarten: Alle teilen sich den Aufzug (die Switch-Hardware), doch Gäste können nur auf der Gäste-Etage aussteigen.')}

<h2 id="trunks">Access-Ports und Trunks</h2>
<ul>
<li>Ein <strong>Access-Port</strong> gehört zu genau einem VLAN. Der PC daran weiß nicht einmal, dass es VLANs gibt.</li>
<li>Ein <strong>Trunk</strong> verbindet Switches und trägt viele VLANs. Jeder Rahmen bekommt ein 4 Byte großes <strong>802.1Q-Tag</strong> mit einer 12-Bit-VLAN-ID (1–4094), damit der nächste Switch weiß, wohin er gehört.</li>
</ul>

<h2 id="loops">Redundanz erzeugt Schleifen</h2>
<p>Für Ausfallsicherheit verkabelt man Switches im Ring oder Netz. Aber Ethernet-Rahmen haben <strong>keine TTL</strong>: Ein Broadcast in einer Schleife kreist für immer, und jeder Switch flutet eine frische Kopie aus allen Ports. In Sekunden ist das Netz dicht – ein <strong>Broadcast-Sturm</strong>. Probier es aus: Sende einen Broadcast ohne Spanning Tree, dann schalte es ein.</p>
<div data-widget="vlan"></div>

<h2 id="stp">Spanning Tree Protocol</h2>
<p><strong>STP</strong> (802.1D) lässt eine Topologie mit Schleifen wie einen Baum funktionieren:</p>
<ol>
<li>Die Switches wählen eine <strong>Root-Bridge</strong> (kleinste Bridge-ID = Priorität + MAC).</li>
<li>Jeder andere Switch wählt seinen besten Weg zur Root (seinen <em>Root-Port</em>).</li>
<li>Jedes Segment bekommt einen weiterleitenden <em>Designated Port</em>. Alle übrigen Ports werden <strong>blockiert</strong>.</li>
</ol>
<p>Blockierte Links bleiben als Reserve physisch verbunden. Fällt ein aktiver Link aus, rechnet STP neu und gibt einen Ersatz frei.</p>
${note('Schaltest du im Lab VLANs und STP zusammen ein, siehst du beide Aufgaben nebeneinander: VLANs entscheiden, <em>wer</em> einen Broadcast bekommt – STP sorgt dafür, dass jeder ihn <em>genau einmal</em> bekommt.')}

${deep('Rapid STP, PortFast und BPDU Guard', `
<p>Klassisches STP braucht 30–50 Sekunden zum Konvergieren (Listening → Learning → Forwarding). <strong>RSTP</strong> (802.1w) nutzt einen Handshake zwischen Nachbarn und ist in etwa einer Sekunde fertig. <strong>PortFast</strong> lässt Access-Ports zu PCs das Warten überspringen. <strong>BPDU Guard</strong> schaltet einen PortFast-Port ab, wenn plötzlich ein Switch daran auftaucht – so kann niemand mit einem billigen Switch aus der Wanddose zur Root-Bridge werden.</p>`)}
${deep('VLAN-Hopping und warum natives VLAN 1 gefährlich ist', `
<p>Auf einem Trunk wird ein <em>natives VLAN</em> ohne Tag gesendet. Ein Angreifer in diesem VLAN kann einen Rahmen mit <strong>zwei</strong> 802.1Q-Tags bauen: Der erste Switch entfernt das äußere (native) Tag und leitet den Rahmen – noch mit dem Opfer-VLAN getaggt – über den Trunk weiter. Abwehr: VLAN 1 nie nutzen, das native VLAN auf eine unbenutzte ID setzen und automatische Trunk-Aushandlung (DTP) auf Access-Ports abschalten.</p>`)}
${deep('Rechenzentren: ganz ohne STP', `
<p>Moderne Rechenzentren wollen nicht die Hälfte ihrer Links blockieren. Sie nutzen ein <strong>Leaf-Spine</strong>-Design mit gerouteten Layer-3-Links überall und <strong>ECMP</strong>, um alle Wege gleichzeitig zu nutzen. Mandanten bekommen isolierte Netze über Overlays wie <strong>VXLAN</strong>, das Layer-2-Rahmen in UDP verpackt – mit einer 24-Bit-ID, also 16 Millionen Segmenten statt 4094 VLANs.</p>`)}
`,
    quiz: [
      { q: 'Warum verursacht eine Schleife zwischen Switches einen Broadcast-Sturm?', a: ['Switches haben zu wenig Speicher', 'Ethernet-Rahmen haben keine TTL, Kopien kreisen und vervielfachen sich endlos', 'VLAN-Tags werden beschädigt', 'IP-Adressen kollidieren'], c: 1, why: 'Ohne Hop-Limit kreisen geflutete Broadcasts endlos, und jeder Switch fügt weitere Kopien hinzu.' },
      { q: 'Was trägt ein 802.1Q-Tag?', a: ['Die IP-Adresse', 'Eine 12-Bit-VLAN-ID', 'Die TTL', 'Die MAC-Tabelle'], c: 1, why: 'Das 4-Byte-Tag enthält Prioritätsbits und eine 12-Bit-VLAN-ID (1–4094).' },
      { q: 'Was macht STP mit redundanten Links?', a: ['Löscht sie', 'Blockiert einige Ports, damit die Topologie ein Baum wird', 'Verteilt Last über alle', 'Macht Trunks daraus'], c: 1, why: 'STP blockiert gerade so viele Ports, dass keine Schleifen bleiben, und hält sie als Reserve.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'email', level: 'apps', icon: '✉️', color: '#ffd166', minutes: 11,
    title: 'E-Mail: SMTP, SPF, DKIM, DMARC',
    summary: 'Wie eine Mail ihren Weg findet – und warum Spamschutz im DNS steckt.',
    body: `
<h2 id="flow">Die Reise einer E-Mail</h2>
<p>E-Mail ist einer der ältesten Internetdienste und funktioniert bis heute wie die Post:</p>
<ol>
<li>Dein Mailprogramm (der <strong>MUA</strong>) liefert die Nachricht per <strong>SMTP</strong> auf Port <strong>587</strong> beim Server deines Anbieters ein – nach dem Login.</li>
<li>Der Server deines Anbieters schaut im DNS nach dem <strong>MX-Eintrag</strong> der Empfänger-Domain: Welcher Server nimmt Mail für sie an?</li>
<li>Er verbindet sich mit diesem Server auf Port <strong>25</strong> und übergibt die Nachricht per SMTP.</li>
<li>Der Empfänger liest sie später per <strong>IMAP</strong> (Port 993) oder im Browser.</li>
</ol>
${analogy('SMTP ist ein Kurier, der jeden Umschlag annimmt und den Absendernamen darauf nie prüft. SPF, DKIM und DMARC sind der Sicherheitsdienst im Empfängergebäude, der prüft, ob Kurier und Brief wirklich von dem kommen, der draufsteht.')}

<h2 id="smtp">SMTP sprechen</h2>
<p>SMTP ist ein Textprotokoll, das man von Hand tippen könnte:</p>
<pre class="code"><span class="s">S: 220 mx1.mail.example ESMTP</span>
C: EHLO smtp.lovelace.org
<span class="s">S: 250-STARTTLS</span>
C: MAIL FROM:&lt;ada@lovelace.org&gt;
C: RCPT TO:&lt;grace@mail.example&gt;
C: DATA
C: From: Ada &lt;ada@lovelace.org&gt;
C: Subject: Maschinen
C: .
<span class="s">S: 250 OK queued</span></pre>
${warn('Nichts in SMTP prüft <code>MAIL FROM</code> oder den <code>From:</code>-Header. Jeder kann behaupten, <code>ceo@bank.example</code> zu sein. Diese Lücke ist der Grund, warum Phishing funktioniert – und warum es die folgenden drei Prüfungen gibt.')}

<h2 id="auth">SPF, DKIM, DMARC</h2>
<ul>
<li><strong>SPF</strong>: Die Domain veröffentlicht im DNS, welche IPs ihre Mails senden dürfen: <code>v=spf1 ip4:198.51.100.0/24 -all</code>.</li>
<li><strong>DKIM</strong>: Der sendende Server <em>signiert</em> Header und Inhalt; der öffentliche Schlüssel liegt im DNS unter <code>selector._domainkey.domain</code>.</li>
<li><strong>DMARC</strong>: die Richtlinie der Domain (<code>p=none / quarantine / reject</code>). Sie verlangt, dass SPF oder DKIM bestehen <em>und</em> zur sichtbaren <code>From:</code>-Domain passen, und fordert Berichte an.</li>
</ul>
<p>Schick drei Mails und beobachte die Prüfungen:</p>
<div data-widget="email"></div>

${deep('Warum Weiterleiten SPF bricht, DKIM aber nicht', `
<p>Wenn eine Mailingliste oder ein Weiterleiter deine Mail erneut versendet, kommt sie von <em>deren</em> IP – die steht nicht in deinem SPF-Eintrag, also scheitert SPF. Die DKIM-Signatur reist dagegen <em>mit</em> der Nachricht und bleibt gültig, solange die signierten Header und der Inhalt unverändert sind. Mailinglisten, die eine Fußzeile anhängen, brechen auch DKIM; <strong>ARC</strong> (Authenticated Received Chain) lässt Zwischenstationen die ursprünglichen Ergebnisse bezeugen.</p>`)}
${deep('Transportverschlüsselung: STARTTLS und MTA-STS', `
<p>SMTP zwischen Servern wechselt per <code>STARTTLS</code> zu TLS – aber nur <em>opportunistisch</em>: Ein Angreifer in der Mitte kann das STARTTLS-Angebot entfernen und Klartext erzwingen. Mit <strong>MTA-STS</strong> veröffentlicht eine Domain „nutze für meinen MX immer TLS mit gültigem Zertifikat“, und <strong>TLS-RPT</strong> meldet Fehler. Ende-zu-Ende-Verschlüsselung (S/MIME, PGP) ist eine eigene Ebene, die den Inhalt sogar vor den Mailservern schützt.</p>`)}
`,
    quiz: [
      { q: 'Welcher DNS-Eintrag sagt Servern, wohin Mail für eine Domain zugestellt wird?', a: ['A', 'MX', 'PTR', 'SOA'], c: 1, why: 'MX-Einträge (Mail eXchanger) listen die Server, die Mail für die Domain annehmen, mit Prioritäten.' },
      { q: 'Was prüft SPF?', a: ['Die Signatur der Nachricht', 'Ob die sendende IP für die Domain senden darf', 'Die Rechtschreibung im Betreff', 'Ob das Postfach existiert'], c: 1, why: 'SPF vergleicht die verbundene IP mit der Liste im TXT-Eintrag der Domain.' },
      { q: 'Eine weitergeleitete Mail scheitert an SPF, besteht aber DKIM (passend). Was sagt DMARC?', a: ['Ablehnen', 'Bestanden', 'Quarantäne', 'Zurück an den Absender'], c: 1, why: 'DMARC besteht, wenn SPF oder DKIM besteht und zur From:-Domain passt.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'vpn', level: 'apps', icon: '🔐', color: '#8b7bff', minutes: 10,
    title: 'VPNs & WireGuard',
    summary: 'Tunnel, was ein VPN wirklich verbirgt, und wie moderne VPNs wie WireGuard funktionieren.',
    body: `
<h2 id="tunnel">Ein Tunnel ist ein Paket im Paket</h2>
<p>Ein <strong>VPN</strong> (virtuelles privates Netz) nimmt dein ganzes IP-Paket, verschlüsselt es und packt es als <em>Nutzlast</em> in ein neues Paket an einen VPN-Server. Netze dazwischen sehen nur das äußere Paket: verschlüsseltes UDP zu einem Server. Der Server packt es aus und schickt das innere Paket weiter, als säßest du dort.</p>
${analogy('Statt eine Postkarte einzuwerfen, legst du sie in eine abgeschlossene Kiste und schickst die Kiste an einen Freund im Ausland, der sie öffnet und die Postkarte von dort abschickt. Die Post hier weiß nur, dass du deinem Freund eine Kiste geschickt hast.')}

<h2 id="sees">Wer sieht was?</h2>
<p>Schalte VPN und HTTPS um und sieh, was jeder Beobachter erfährt:</p>
<div data-widget="vpn"></div>
${note('Ein VPN verschiebt Vertrauen, es schafft es nicht ab. Café und Provider erfahren weniger, aber der VPN-Anbieter sieht jetzt alles, was die vorher gesehen haben. HTTPS bleibt auch im Tunnel wichtig.')}

<h2 id="uses">Zwei Arten von VPN</h2>
<ul>
<li><strong>Fernzugriff (Remote Access)</strong>: Laptop oder Handy verbinden sich ins Firmennetz – oder über einen Privatsphäre-VPN-Anbieter nach draußen.</li>
<li><strong>Site-to-Site</strong>: Zwei Büro-Router halten einen dauerhaften Tunnel, sodass beide LANs übers Internet wie ein Netz wirken.</li>
</ul>

<h2 id="wireguard">WireGuard</h2>
<p><strong>WireGuard</strong> ist ein modernes VPN, das in Linux eingebaut ist – etwa 4 000 Zeilen Code statt Hunderttausender bei älteren Lösungen. Jeder Teilnehmer hat ein Schlüsselpaar; die Konfiguration listet die Gegenstellen, ihre öffentlichen Schlüssel und welche IPs (<code>AllowedIPs</code>) dahinter liegen. Es nutzt genau einen festen Satz moderner Kryptografie (Curve25519, ChaCha20-Poly1305, BLAKE2s) und läuft über UDP, standardmäßig auf Port 51820.</p>
<pre class="code"><span class="c"># /etc/wireguard/wg0.conf auf einem Laptop</span>
[Interface]
PrivateKey = <span class="s">(privater Schlüssel des Laptops)</span>
Address    = 10.8.0.2/32

[Peer]
PublicKey  = <span class="s">(öffentlicher Schlüssel des Servers)</span>
Endpoint   = vpn.example:51820
AllowedIPs = <span class="n">0.0.0.0/0, ::/0</span>   <span class="c"># alles durch den Tunnel schicken</span></pre>

${deep('IPsec vs. OpenVPN vs. WireGuard', `
<div class="tbl-wrap"><table class="tbl">
<tr><th></th><th>IPsec</th><th>OpenVPN</th><th>WireGuard</th></tr>
<tr><td>Schicht</td><td>3 (im Kernel)</td><td>Userspace über TLS</td><td>3 (im Kernel)</td></tr>
<tr><td>Transport</td><td>ESP (IP-Protokoll 50), UDP 500/4500</td><td>UDP oder TCP</td><td>UDP</td></tr>
<tr><td>Konfiguration</td><td>komplex, viele Cipher-Optionen</td><td>Zertifikate, viele Optionen</td><td>Schlüssel + AllowedIPs, keine Wahl</td></tr>
<tr><td>Typischer Einsatz</td><td>Site-to-Site, Unternehmen</td><td>Fernzugriff, ältere Setups</td><td>alles Neue</td></tr>
</table></div>`)}
${deep('Split Tunnel, MTU und DNS-Lecks', `
<ul>
<li><strong>Split Tunnel</strong>: Nur Firmen-Subnetze gehen durchs VPN (<code>AllowedIPs = 10.0.0.0/8</code>), der Rest direkt. <strong>Full Tunnel</strong>: <code>0.0.0.0/0</code>.</li>
<li><strong>MTU</strong>: Die zusätzlichen äußeren Header (WireGuard fügt etwa 60–80 Byte hinzu) bedeuten, dass innere Pakete kleiner sein müssen. WireGuard nutzt standardmäßig MTU 1420. Falsch eingestellt verschwinden große Pakete.</li>
<li><strong>DNS-Leck</strong>: Fragt dein Gerät weiterhin den DNS-Server des Cafés, sieht jeder, welche Seiten du nachschlägst – obwohl der Verkehr getunnelt ist. Ein guter VPN-Client leitet auch DNS durch den Tunnel.</li>
</ul>`)}
`,
    quiz: [
      { q: 'Mit Full-Tunnel-VPN im Café-WLAN – was sieht das Café-Netz?', a: ['Jede Seite, die du besuchst', 'Verschlüsselten Verkehr zum VPN-Server', 'Deine Passwörter', 'Gar nichts, nicht einmal Verkehr'], c: 1, why: 'Alles steckt in verschlüsselten Paketen an den VPN-Server; nur dieses Ziel ist sichtbar.' },
      { q: 'Welchen Port und Transport nutzt WireGuard standardmäßig?', a: ['TCP 443', 'UDP 51820', 'UDP 500', 'TCP 1194'], c: 1, why: 'WireGuard läuft über UDP, üblicherweise auf Port 51820.' },
      { q: 'Warum verringert ein VPN-Tunnel die nutzbare MTU?', a: ['Verschlüsselung komprimiert Daten', 'Die zusätzlichen äußeren Header brauchen Platz in jedem Paket', 'VPNs erlauben nur kleine Dateien', 'Die TTL wird verringert'], c: 1, why: 'Äußere IP-/UDP-/WireGuard-Header kosten Bytes, also muss das innere Paket kleiner sein, um in die Link-MTU zu passen.' },
    ],
  },
];
