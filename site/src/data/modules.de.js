import { analogy, note, warn, deep } from './blocks.js';

// Deutsche Lektionen. Gleiche ids wie in modules.en.js; fehlende ids fallen auf Englisch zurück.
export const MODULES_DE = [
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
