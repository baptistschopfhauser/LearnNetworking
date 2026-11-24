// Course content. Each module's `body` is HTML; `<div data-widget="name"></div>` mounts an interactive widget.
// `<details class="deep-dive">` blocks are optional in-depth material.

const analogy = (t) => `<div class="callout analogy"><span class="ci">💡</span><div><p>${t}</p></div></div>`;
const note = (t) => `<div class="callout"><span class="ci">✦</span><div><p>${t}</p></div></div>`;
const warn = (t) => `<div class="callout warn"><span class="ci">⚠</span><div><p>${t}</p></div></div>`;
const deep = (title, body) => `<details class="deep-dive"><summary><span class="tag violet">Deep dive</span> ${title}<span class="chev">▶</span></summary><div class="dd-body">${body}</div></details>`;

export const LEVELS = [
  { id: 'foundations', name: 'Foundations', blurb: 'What a network is, how data is layered, and how bits travel.' },
  { id: 'core', name: 'Core mechanics', blurb: 'Addressing, switching, routing and reliable transport.' },
  { id: 'apps', name: 'The Internet you use', blurb: 'Names, the web, encryption and keeping networks safe.' },
  { id: 'pro', name: 'Pro track', blurb: 'Diagnose problems like an engineer and run services at scale.' },
];

export const MODULES = [
  /* ============================================================ */
  {
    id: 'what-is-a-network', level: 'foundations', icon: '🕸️', color: '#5cf2c2', minutes: 8,
    title: 'What is a network?',
    summary: 'Nodes, links, topologies — and why the Internet is a network of networks.',
    body: `
<h2 id="nodes-links">Nodes and links</h2>
<p>A <strong>network</strong> is just a set of devices (<strong>nodes</strong>) connected by <strong>links</strong> so they can exchange data. Your phone, a laptop, a smart bulb, a server in a data center and the router on your shelf are all nodes. Links can be copper cables, glass fibre, or radio waves (Wi‑Fi, 5G).</p>
${analogy('Think of a road system. Houses are nodes, roads are links, and the letters and parcels moving between houses are the <em>data</em>. Networking is everything that makes sure each parcel reaches the right door — even if a road is closed.')}
<p>Every network, from two laptops on a cable to the global Internet, answers the same questions:</p>
<ul>
  <li><strong>Addressing</strong> — how do I name the destination?</li>
  <li><strong>Forwarding</strong> — which link should this piece of data take next?</li>
  <li><strong>Sharing</strong> — how do many conversations share the same links?</li>
  <li><strong>Reliability</strong> — what happens when something breaks or data gets lost?</li>
</ul>

<h2 id="topologies">Topologies: the shape of a network</h2>
<p>A <strong>topology</strong> describes how nodes are wired together. Each shape trades cost against resilience. Play with them below: pick a layout, then <em>click a link to cut it</em> and watch which nodes can still reach each other.</p>
<div data-widget="topology"></div>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Topology</th><th>Pros</th><th>Cons</th><th>Where you see it</th></tr>
<tr><td>Bus</td><td>Cheap, simple</td><td>One break splits everything; collisions</td><td>Early Ethernet (coax)</td></tr>
<tr><td>Star</td><td>Easy to manage; one bad cable affects one node</td><td>The centre is a single point of failure</td><td>Your home Wi‑Fi, office switches</td></tr>
<tr><td>Ring</td><td>Predictable; can survive one break if bidirectional</td><td>Two breaks partition it</td><td>Metro fibre rings, Token Ring</td></tr>
<tr><td>Mesh</td><td>Very resilient, many paths</td><td>Expensive: n(n−1)/2 links for full mesh</td><td>Internet backbone, data centres</td></tr>
</table></div>

<h2 id="lan-wan">LAN, WAN and the Internet</h2>
<p>A <strong>LAN</strong> (Local Area Network) covers a home, office or campus — usually one organisation owns it. A <strong>WAN</strong> (Wide Area Network) spans cities or continents. The <strong>Internet</strong> is a gigantic network <em>of</em> networks: tens of thousands of independently run networks (called <strong>Autonomous Systems</strong>) that agree to exchange traffic.</p>
${note('Your home network is a LAN. Your Internet Service Provider (ISP) connects that LAN to its own network, which connects to other ISPs, cloud providers and content networks — and that interconnected web is the Internet.')}

<h2 id="packets">Packet switching</h2>
<p>Old telephone networks used <strong>circuit switching</strong>: a call reserved a dedicated path for its whole duration. The Internet uses <strong>packet switching</strong>: data is chopped into small chunks called <strong>packets</strong>, each carrying its own destination address. Routers forward packets independently, so many conversations share links efficiently and traffic can flow around failures.</p>
${analogy('Circuit switching is booking an entire train for one passenger. Packet switching is everyone sharing buses, each passenger holding a ticket with their destination.')}

${deep('Measuring networks: bandwidth, latency, jitter and loss', `
<p>Four numbers describe how a path "feels":</p>
<ul>
<li><strong>Bandwidth / throughput</strong> — how many bits per second can flow (Mbps, Gbps). Bandwidth is the capacity; throughput is what you actually get.</li>
<li><strong>Latency</strong> — how long one bit takes to get there. It is the sum of <em>propagation</em> (distance ÷ speed of light in the medium, ~200 000 km/s in fibre), <em>transmission</em> (packet size ÷ link rate), <em>processing</em> and <em>queuing</em> delay.</li>
<li><strong>Jitter</strong> — variation in latency. Bad for voice and video.</li>
<li><strong>Packet loss</strong> — the share of packets that never arrive, usually because a queue overflowed.</li>
</ul>
<p>The <strong>bandwidth‑delay product</strong> (bandwidth × round‑trip time) tells you how many bits are "in flight" on a path. A 1 Gbps link with 80 ms RTT holds 10 MB in flight — which is why TCP needs large windows on long fat pipes.</p>
<pre class="code"><span class="c"># propagation delay Paris → New York (~5 800 km of fibre)</span>
5 800 km ÷ 200 000 km/s ≈ <span class="n">29 ms</span> one way  →  ~58 ms RTT minimum</pre>
<p>No amount of money beats physics: the speed of light sets a floor on latency, which is why CDNs put servers close to you.</p>
`)}
${deep('Graph theory view: why meshes survive', `
<p>A network is a <strong>graph</strong> G = (V, E). Resilience is about <em>connectivity</em>: the <strong>edge connectivity</strong> λ(G) is the minimum number of links you must cut to split the graph. A star has λ = 1 (cut any spoke, isolate a leaf). A ring has λ = 2. A full mesh of n nodes has λ = n − 1.</p>
<p>Real backbones aim for λ ≥ 2 between every pair of sites, often using physically diverse fibre paths — two cables in the same trench are really one link when a digger arrives.</p>`)}
`,
    quiz: [
      { q: 'Which topology has a single point of failure at its centre?', a: ['Mesh', 'Star', 'Ring', 'None of them'], c: 1, why: 'In a star every node talks through the central switch/hub — if it fails, everyone is cut off.' },
      { q: 'What is the key idea of packet switching?', a: ['A dedicated path is reserved per conversation', 'Data is split into independently forwarded chunks', 'All nodes share a single cable', 'Only one device can send at a time'], c: 1, why: 'Packets each carry their destination and share links with other traffic; no path is reserved.' },
      { q: 'How many links does a full mesh of 6 nodes need?', a: ['6', '12', '15', '36'], c: 2, why: 'n(n−1)/2 = 6×5/2 = 15.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'layers', level: 'foundations', icon: '🧅', color: '#8b7bff', minutes: 10,
    title: 'Layers: OSI & TCP/IP',
    summary: 'Why networking is built as a stack, and how data gets wrapped in headers.',
    body: `
<h2 id="why-layers">Why layers?</h2>
<p>Networking is a huge problem: electrical signals, addressing, routing across the planet, reliable delivery, encryption, web pages. Instead of one monster program, we split the job into <strong>layers</strong>. Each layer offers a service to the one above and uses the one below — and you can swap one layer's implementation (Wi‑Fi instead of Ethernet) without touching the others.</p>
${analogy('Sending a gift abroad: you write a card (application), put it in a box (transport), add a shipping label with the address (network), the courier loads it into a truck for the next depot (data link), and the truck drives on the road (physical). Each worker only cares about their own step.')}

<h2 id="models">The OSI model vs. TCP/IP</h2>
<p>The <strong>OSI model</strong> has seven layers and is a great vocabulary. The Internet actually runs the simpler <strong>TCP/IP model</strong> (4 layers), but engineers still say "layer 2 switch" or "layer 7 load balancer" using OSI numbers. Click a layer to explore it, then hit <em>Send</em> to watch encapsulation.</p>
<div data-widget="osi"></div>
<p>A classic mnemonic, top to bottom: <strong>A</strong>ll <strong>P</strong>eople <strong>S</strong>eem <strong>T</strong>o <strong>N</strong>eed <strong>D</strong>ata <strong>P</strong>rocessing.</p>

<h2 id="encapsulation">Encapsulation</h2>
<p>As data goes <em>down</em> the stack on the sender, each layer adds its own <strong>header</strong> (and the link layer also a trailer). The unit of data has a different name at each layer — its <strong>PDU</strong> (Protocol Data Unit):</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Layer</th><th>PDU</th><th>Key address</th><th>Typical device</th></tr>
<tr><td>Application (7–5)</td><td>Data / message</td><td>URL, hostname</td><td>Server, browser</td></tr>
<tr><td>Transport (4)</td><td>Segment (TCP) / Datagram (UDP)</td><td>Port number</td><td>Firewall, load balancer</td></tr>
<tr><td>Network (3)</td><td>Packet</td><td>IP address</td><td>Router</td></tr>
<tr><td>Data link (2)</td><td>Frame</td><td>MAC address</td><td>Switch, access point</td></tr>
<tr><td>Physical (1)</td><td>Bits / symbols</td><td>—</td><td>Cable, NIC, repeater</td></tr>
</table></div>
<p>The receiver does the reverse — <strong>decapsulation</strong> — each layer reading and stripping its own header before handing the payload up.</p>
${note('Routers work at layer 3: they strip the old frame, look at the IP header, and wrap the packet in a <em>new</em> frame for the next link. The IP addresses stay the same end‑to‑end; the MAC addresses change at every hop.')}

${deep('What actually is in a header? Real byte layouts', `
<p>Here is an IPv4 header — 20 bytes without options — the most important 160 bits on the Internet:</p>
<pre class="code"> 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-------+-------+---------------+-------------------------------+
|<span class="k">Version</span>|  <span class="k">IHL</span>  |  DSCP / ECN   |         <span class="k">Total Length</span>          |
+-------+-------+---------------+-----+-------------------------+
|        Identification         |Flags|     Fragment Offset     |
+---------------+---------------+-----+-------------------------+
|  <span class="n">Time to Live</span> |   <span class="s">Protocol</span>    |        Header Checksum        |
+---------------+---------------+-------------------------------+
|                     <span class="s">Source IP Address</span>                         |
+---------------------------------------------------------------+
|                  <span class="s">Destination IP Address</span>                       |
+---------------------------------------------------------------+</pre>
<ul>
<li><strong>TTL</strong> is decremented by every router; at 0 the packet is dropped (prevents infinite loops — and makes <code>traceroute</code> possible).</li>
<li><strong>Protocol</strong> tells the receiver which transport header follows: 6 = TCP, 17 = UDP, 1 = ICMP.</li>
<li>An Ethernet frame adds 14 bytes of header (dest MAC, src MAC, EtherType) and a 4‑byte CRC trailer.</li>
</ul>
<p>Overhead adds up: a 1 500‑byte Ethernet payload carrying TCP/IPv4 leaves at most 1 460 bytes (the <strong>MSS</strong>) for your data.</p>`)}
${deep('Where the model breaks: tunnels, TLS and QUIC', `
<p>Layers are a model, not a law. A VPN puts an entire IP packet <em>inside</em> another IP packet (layer 3 in layer 3). TLS sits awkwardly between transport and application. <strong>QUIC</strong> (used by HTTP/3) implements reliability and encryption on top of UDP in user space — blurring layers 4–7. VXLAN carries layer‑2 Ethernet frames inside UDP so data centres can stretch LANs across routed networks.</p>
<p>The useful lesson: think of each protocol as <em>"what does it need from below, what does it offer above"</em>, not which box it fits in.</p>`)}
`,
    quiz: [
      { q: 'At which layer do routers make forwarding decisions?', a: ['Layer 2 — Data link', 'Layer 3 — Network', 'Layer 4 — Transport', 'Layer 7 — Application'], c: 1, why: 'Routers read the IP (network-layer) destination address to choose the next hop.' },
      { q: 'What is the PDU called at the data link layer?', a: ['Segment', 'Packet', 'Frame', 'Bit'], c: 2, why: 'Layer 2 carries frames, addressed with MAC addresses.' },
      { q: 'As a packet crosses three routers, which addresses change at each hop?', a: ['IP addresses', 'MAC addresses', 'Port numbers', 'None'], c: 1, why: 'Each link gets a fresh frame with new source/destination MACs; IPs stay end-to-end (ignoring NAT).' },
    ],
  },

  /* ============================================================ */
  {
    id: 'bits-on-the-wire', level: 'foundations', icon: '〰️', color: '#ffd166', minutes: 7,
    title: 'Bits on the wire',
    summary: 'How 0s and 1s become voltage, light and radio waves — the physical layer.',
    body: `
<h2 id="signals">From bits to signals</h2>
<p>Everything above eventually becomes a <strong>signal</strong>: voltage changes on copper, pulses of light in fibre, or modulated radio waves in the air. The physical layer defines how a 0 and a 1 look, how fast they're sent (the <strong>symbol rate</strong>), and how sender and receiver stay in sync.</p>
<div data-widget="signal"></div>
<h3>Line codes</h3>
<ul>
<li><strong>NRZ</strong> (Non‑Return‑to‑Zero): high = 1, low = 0. Simple, but a long run of identical bits has no transitions, so the receiver's clock can drift.</li>
<li><strong>Manchester</strong>: every bit has a transition in the middle (low→high = 1). Self‑clocking, used by 10 Mbps Ethernet, but needs double the bandwidth.</li>
<li><strong>PAM‑4</strong>: four voltage levels carry <em>two</em> bits per symbol. Used by modern 100–400 Gbps links.</li>
</ul>

<h2 id="media">Media: copper, fibre, radio</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Medium</th><th>Typical speed</th><th>Reach</th><th>Notes</th></tr>
<tr><td>Twisted pair (Cat6)</td><td>1–10 Gbps</td><td>100 m</td><td>Twisting cancels interference</td></tr>
<tr><td>Single-mode fibre</td><td>10 Gbps – 800 Gbps+</td><td>10–80 km+ per span</td><td>Immune to EM noise, undersea cables</td></tr>
<tr><td>Wi‑Fi 6/7</td><td>Hundreds of Mbps – multi Gbps</td><td>Tens of metres</td><td>Shared medium, interference, half‑duplex</td></tr>
<tr><td>5G / LTE</td><td>10s – 1000s Mbps</td><td>km</td><td>Licensed spectrum, managed by carriers</td></tr>
</table></div>
${note('<strong>Duplex</strong>: full‑duplex links send both ways at once (modern switched Ethernet). Half‑duplex media (classic Wi‑Fi, walkie‑talkies) must take turns, which is why they need rules for who talks when.')}

<h2 id="sharing">Sharing the medium</h2>
<p>When several devices share one medium they must avoid talking over each other. Classic Ethernet used <strong>CSMA/CD</strong> ("listen, send, and if you detect a collision, back off a random time"). Wi‑Fi uses <strong>CSMA/CA</strong>: radios can't hear collisions while transmitting, so they wait random back‑offs <em>before</em> sending and require acknowledgements.</p>

${deep('Shannon, noise and why Wi‑Fi slows down far from the router', `
<p>Claude Shannon proved the maximum error‑free rate of a channel:</p>
<pre class="code">C = B · log₂(1 + S/N)
<span class="c"># C = capacity (bit/s), B = bandwidth (Hz), S/N = signal-to-noise ratio</span>
<span class="c"># 20 MHz Wi-Fi channel at SNR 30 dB (S/N = 1000):</span>
C ≈ 20e6 × log₂(1001) ≈ <span class="n">199 Mbit/s</span></pre>
<p>As you walk away from the access point, the signal weakens, SNR drops, and the radio switches to more robust (slower) <strong>modulation and coding schemes</strong> — e.g. from 1024‑QAM (10 bits/symbol) down to BPSK (1 bit/symbol). Wider channels (more B) and MIMO (multiple parallel spatial streams) are how Wi‑Fi gets faster.</p>`)}
${deep('Error detection: parity, checksums and CRC', `
<p>Noise flips bits. Each layer adds redundancy to <em>detect</em> corruption: Ethernet appends a 32‑bit <strong>CRC</strong> (cyclic redundancy check) — polynomial division over the frame that catches all burst errors up to 32 bits. IP and TCP use a simpler 16‑bit ones'‑complement checksum. Corrupted frames are silently dropped; it's up to higher layers (like TCP) to notice and retransmit.</p>
<p>Some links go further with <strong>forward error correction</strong> (FEC) — sending enough redundancy to <em>repair</em> errors without retransmission, essential for 400G optics and deep‑space probes.</p>`)}
`,
    quiz: [
      { q: 'Why does Manchester encoding make clock recovery easy?', a: ['It uses four voltage levels', 'Every bit contains a transition', 'It never sends zeros', 'It runs on fibre only'], c: 1, why: 'The guaranteed mid-bit transition lets the receiver resynchronise its clock on every bit.' },
      { q: 'Which access method does Wi‑Fi use?', a: ['CSMA/CD', 'CSMA/CA', 'Token passing', 'Circuit switching'], c: 1, why: 'Radios can’t detect collisions while sending, so Wi‑Fi avoids them (Collision Avoidance) and uses ACKs.' },
      { q: 'PAM-4 sends how many bits per symbol?', a: ['1', '2', '4', '8'], c: 1, why: 'Four levels = log₂(4) = 2 bits per symbol.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'wifi', level: 'foundations', icon: '📶', color: '#4cc9ff', minutes: 10,
    title: 'Wi‑Fi & wireless',
    summary: 'Radio, channels, signal strength and why your Wi‑Fi is slow in the bedroom.',
    body: `
<h2 id="radio">Networking over radio</h2>
<p><strong>Wi‑Fi</strong> (IEEE 802.11) carries Ethernet‑like frames over radio waves. Your laptop and the <strong>access point</strong> (AP) take turns talking on a shared <strong>channel</strong>, a slice of the 2.4 GHz, 5 GHz or 6 GHz band. Unlike a cable, the air is shared with neighbours, microwaves and Bluetooth, and walls absorb the signal.</p>
${analogy('Wi‑Fi is a conversation in a busy café. The further apart you sit, the louder you have to speak and the slower you talk so you’re understood. If the next table uses the same "channel", you keep interrupting each other.')}

<h2 id="signal">Signal strength: RSSI and SNR</h2>
<p>Signal strength is measured in <strong>dBm</strong>, a logarithmic scale where −30 dBm is excellent and −90 dBm is barely there. What really matters is the <strong>SNR</strong> (signal‑to‑noise ratio): how far the signal stands above the background noise (about −95 dBm). A higher SNR lets the radio use denser modulation and get more bits per second.</p>
<p>Drag the laptop and the access points around the flat below. Walls cost signal, distance costs signal, and two APs on the same channel step on each other.</p>
<div data-widget="wifi"></div>
<div class="tbl-wrap"><table class="tbl">
<tr><th>RSSI</th><th>Quality</th><th>What you’ll notice</th></tr>
<tr><td>−30 to −55 dBm</td><td>Excellent</td><td>Top speeds, 4K streaming, big downloads</td></tr>
<tr><td>−55 to −67 dBm</td><td>Good</td><td>Video calls are fine</td></tr>
<tr><td>−67 to −75 dBm</td><td>Fair</td><td>Browsing OK, calls may stutter</td></tr>
<tr><td>below −80 dBm</td><td>Poor</td><td>Drops, retries, very low rates</td></tr>
</table></div>

<h2 id="bands">Bands and channels</h2>
<ul>
<li><strong>2.4 GHz</strong>: long range and passes walls well, but crowded and slow. Only channels <strong>1, 6 and 11</strong> don’t overlap.</li>
<li><strong>5 GHz</strong>: many more channels and much faster, but shorter range.</li>
<li><strong>6 GHz</strong> (Wi‑Fi 6E/7): huge clean spectrum and very wide channels, but the shortest range.</li>
</ul>
${note('When two networks share a channel they don’t add up, they <em>split</em> the airtime. Picking a different non‑overlapping channel often helps more than buying a faster router.')}

<h2 id="joining">How a device joins</h2>
<ol>
<li><strong>Scan</strong>: listen for <em>beacons</em> (APs announce their SSID about 10 times per second).</li>
<li><strong>Authenticate & associate</strong> with the chosen AP.</li>
<li><strong>WPA2/WPA3 4‑way handshake</strong>: derive encryption keys from the password without sending it.</li>
<li><strong>DHCP</strong>: get an IP address, then you’re online.</li>
</ol>

${deep('Wi‑Fi generations and what actually made them faster', `
<div class="tbl-wrap"><table class="tbl">
<tr><th>Name</th><th>Standard</th><th>Key tricks</th></tr>
<tr><td>Wi‑Fi 4</td><td>802.11n</td><td>MIMO (multiple antennas), 40 MHz channels</td></tr>
<tr><td>Wi‑Fi 5</td><td>802.11ac</td><td>256‑QAM, 80/160 MHz, downlink MU‑MIMO</td></tr>
<tr><td>Wi‑Fi 6/6E</td><td>802.11ax</td><td>OFDMA (many users per transmission), 1024‑QAM, 6 GHz band, target wake time</td></tr>
<tr><td>Wi‑Fi 7</td><td>802.11be</td><td>320 MHz channels, 4096‑QAM, multi‑link operation across bands</td></tr>
</table></div>
<p>The theme: more <em>bandwidth</em> (wider channels), more <em>bits per symbol</em> (denser QAM, which needs high SNR), more <em>parallel streams</em> (MIMO), and better <em>sharing</em> (OFDMA). Range barely improved; physics didn’t change.</p>`)}
${deep('The hidden node problem and RTS/CTS', `
<p>Laptops A and B can both hear the AP but not each other (a wall between them). Both sense a "free" channel and transmit at once, so their frames collide <em>at the AP</em>. The fix is <strong>RTS/CTS</strong>: a station asks "Request To Send", and the AP answers "Clear To Send" so loudly that every station hears it and stays quiet. It costs airtime, so it’s used for larger frames.</p>`)}
${deep('Wi‑Fi security: WEP → WPA2 → WPA3', `
<p><strong>WEP</strong> was broken in minutes. <strong>WPA2‑PSK</strong> uses a 4‑way handshake, but anyone who captures it can try to guess the password offline (a dictionary attack). <strong>WPA3‑SAE</strong> uses a password‑authenticated key exchange (Dragonfly), which stops offline guessing and gives forward secrecy. Enterprise networks use <strong>802.1X</strong> with a per‑user login through a RADIUS server instead of one shared password.</p>`)}
`,
    quiz: [
      { q: 'Which 2.4 GHz channels don’t overlap?', a: ['1, 2, 3', '1, 6, 11', '1, 7, 13', 'All of them'], c: 1, why: 'Each channel is ~20 MHz wide but spaced 5 MHz apart, so only 1, 6 and 11 are clear of each other.' },
      { q: 'Which RSSI is the strongest signal?', a: ['−85 dBm', '−70 dBm', '−45 dBm', '−95 dBm'], c: 2, why: 'dBm values closer to zero are stronger; −45 dBm is excellent.' },
      { q: 'Why does speed drop far from the access point?', a: ['The router throttles you', 'Lower SNR forces slower, more robust modulation', 'DHCP renews', 'IP packets get bigger'], c: 1, why: 'With less margin above the noise, the radio must use fewer bits per symbol to stay error-free.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'ip-addresses', level: 'core', icon: '🔢', color: '#4cc9ff', minutes: 10,
    title: 'IP addresses & binary',
    summary: 'IPv4 in binary, network vs host part, private ranges and a peek at IPv6.',
    body: `
<h2 id="what-ip">What is an IP address?</h2>
<p>An <strong>IPv4 address</strong> is a 32‑bit number that identifies an interface on a network. We write it as four <strong>octets</strong> (8 bits each) in decimal, separated by dots: <code>192.168.1.42</code>. Each octet ranges 0–255 because 8 bits can count to 2⁸ − 1 = 255.</p>
<p>Flip the bits below and watch the address change. Each bit is worth a power of two: 128, 64, 32, 16, 8, 4, 2, 1.</p>
<div data-widget="bits"></div>

<h2 id="net-host">Network part and host part</h2>
<p>Every address is split into a <strong>network prefix</strong> (which network you're on) and a <strong>host part</strong> (which device on that network). The split is written in <strong>CIDR</strong> notation: <code>192.168.1.42/24</code> means "the first 24 bits are the network". Devices with the same prefix are on the same local network and can talk directly; anything else goes to the <strong>default gateway</strong> (your router).</p>
${analogy('An IP is like a street address. The prefix is the street ("Rue de la Paix"), the host part is the house number. The postman (router) only needs the street to get close; the last few metres use the number.')}

<h2 id="special">Special ranges you should know</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Range</th><th>Meaning</th></tr>
<tr><td><code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code></td><td>Private (RFC 1918) — not routed on the public Internet; used behind NAT</td></tr>
<tr><td><code>127.0.0.0/8</code></td><td>Loopback — <code>127.0.0.1</code> is "this machine"</td></tr>
<tr><td><code>169.254.0.0/16</code></td><td>Link‑local — self‑assigned when DHCP fails</td></tr>
<tr><td><code>100.64.0.0/10</code></td><td>Carrier‑grade NAT (ISPs)</td></tr>
<tr><td><code>224.0.0.0/4</code></td><td>Multicast</td></tr>
<tr><td><code>255.255.255.255</code></td><td>Limited broadcast</td></tr>
</table></div>

<h2 id="dhcp">How you get an address: DHCP</h2>
<p>When your laptop joins Wi‑Fi it has no IP yet. It broadcasts a <strong>DHCP</strong> request and a server (usually your router) leases it an address, subnet mask, default gateway and DNS servers. The four messages spell <strong>DORA</strong>: <em>Discover → Offer → Request → Acknowledge</em>.</p>

${deep('IPv6: 128 bits and no more NAT (in theory)', `
<p>IPv4 has only ~4.3 billion addresses — exhausted since 2011–2019 depending on the region. <strong>IPv6</strong> uses 128‑bit addresses, written as eight groups of 16 bits in hex:</p>
<pre class="code">2001:0db8:0000:0000:0000:ff00:0042:8329
<span class="c"># drop leading zeros, compress one run of zero groups with ::</span>
2001:db8::ff00:42:8329</pre>
<ul>
<li>The usual LAN prefix is a <strong>/64</strong> — 18 quintillion addresses per subnet.</li>
<li>Hosts can configure themselves with <strong>SLAAC</strong> (stateless autoconfiguration) from router advertisements.</li>
<li>ARP is replaced by <strong>Neighbor Discovery</strong> (ICMPv6). There's no broadcast — only multicast.</li>
<li><code>::1</code> is loopback; <code>fe80::/10</code> is link‑local; <code>2000::/3</code> is global unicast.</li>
</ul>
<p>Most networks today run <strong>dual stack</strong> — both IPv4 and IPv6 at once — and clients prefer IPv6 with "Happy Eyeballs" racing the two.</p>`)}
${deep('Classful history: why you still hear "Class C"', `
<p>Before 1993, address size was fixed by the first bits: Class A (<code>0xxx</code>, /8), Class B (<code>10xx</code>, /16), Class C (<code>110x</code>, /24). It wasted enormous blocks — an organisation needing 300 hosts got a Class B with 65 534. <strong>CIDR</strong> (Classless Inter‑Domain Routing) let prefixes be any length and allowed <em>aggregation</em> of routes, which saved the Internet routing table from exploding. "Class C" today is just slang for a /24.</p>`)}
`,
    quiz: [
      { q: 'What is 11000000 in decimal?', a: ['128', '192', '224', '240'], c: 1, why: '128 + 64 = 192.' },
      { q: 'Which address is private?', a: ['8.8.8.8', '172.20.1.5', '172.40.1.5', '193.168.0.1'], c: 1, why: '172.16.0.0/12 covers 172.16.x.x – 172.31.x.x; 172.20.1.5 is inside it.' },
      { q: 'What does DORA stand for in DHCP?', a: ['Detect, Open, Route, Accept', 'Discover, Offer, Request, Acknowledge', 'Deliver, Organize, Reply, Assign', 'Domain, Origin, Resolve, Answer'], c: 1, why: 'The four DHCP messages: Discover, Offer, Request, Acknowledge.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'subnetting', level: 'core', icon: '🧮', color: '#ff7a45', minutes: 12,
    title: 'Subnetting',
    summary: 'Masks, network & broadcast addresses, and carving networks into pieces.',
    body: `
<h2 id="masks">Subnet masks</h2>
<p>The prefix length can also be written as a <strong>subnet mask</strong>: 1s for network bits, 0s for host bits. <code>/24</code> = <code>11111111.11111111.11111111.00000000</code> = <code>255.255.255.0</code>. A bitwise AND between an IP and its mask gives the <strong>network address</strong>.</p>
<pre class="code">  192.168.  1. 42   11000000.10101000.00000001.<span class="s">00101010</span>
& 255.255.255.  0   11111111.11111111.11111111.<span class="c">00000000</span>
= 192.168.  1.  0   <span class="k">network address</span></pre>

<h2 id="calc">The subnet calculator</h2>
<p>Type any address and prefix. Watch the network bits (violet) and host bits (mint) and how the address range changes as you slide the prefix.</p>
<div data-widget="subnet"></div>

<h2 id="rules">Rules of thumb</h2>
<ul>
<li>A /<em>n</em> has 2<sup>(32−n)</sup> addresses. Subtract 2 for usable hosts — the first is the <strong>network address</strong>, the last is the <strong>broadcast address</strong>.</li>
<li>Each extra prefix bit halves the size: /24 = 256, /25 = 128, /26 = 64, /27 = 32, /28 = 16, /29 = 8, /30 = 4.</li>
<li>Subnet boundaries are multiples of the block size. In a /26 (block 64) the networks start at .0, .64, .128, .192.</li>
<li><code>/31</code> is allowed on point‑to‑point links (2 hosts, no broadcast); <code>/32</code> is a single host route.</li>
</ul>
${analogy('Subnetting is cutting a pizza. The /24 is the whole pizza with 256 slices of address space; each extra bit of prefix cuts every piece in half.')}

<h2 id="why-subnet">Why subnet at all?</h2>
<p>Smaller broadcast domains mean less noise; separate subnets for guests, cameras and servers let you put firewalls between them; and good address plans let routers <strong>summarise</strong> many subnets into one route.</p>
<h2 id="practice">Practice</h2>
<p>Ready? Find the network address, broadcast and host count. Each correct answer earns XP.</p>
<div data-widget="subnet-practice"></div>

${deep('VLSM: variable-length subnetting step by step', `
<p>Given <code>10.0.0.0/24</code>, allocate subnets for 100, 50, 20 and 2 hosts. Always allocate the <strong>largest first</strong> so blocks stay aligned:</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Need</th><th>Block</th><th>Prefix</th><th>Subnet</th><th>Usable range</th></tr>
<tr><td>100</td><td>128</td><td>/25</td><td>10.0.0.0/25</td><td>.1 – .126</td></tr>
<tr><td>50</td><td>64</td><td>/26</td><td>10.0.0.128/26</td><td>.129 – .190</td></tr>
<tr><td>20</td><td>32</td><td>/27</td><td>10.0.0.192/27</td><td>.193 – .222</td></tr>
<tr><td>2</td><td>4</td><td>/30</td><td>10.0.0.224/30</td><td>.225 – .226</td></tr>
</table></div>
<p>That leaves <code>10.0.0.228/30</code> through <code>10.0.0.255</code> free for growth.</p>`)}
${deep('Route summarisation (supernetting)', `
<p>A router advertising <code>192.168.0.0/24</code>, <code>.1.0/24</code>, <code>.2.0/24</code> and <code>.3.0/24</code> can advertise one route instead: <code>192.168.0.0/22</code>. Line the addresses up in binary and keep the bits they share:</p>
<pre class="code">192.168.000000<span class="s">00</span>.0
192.168.000000<span class="s">01</span>.0
192.168.000000<span class="s">10</span>.0
192.168.000000<span class="s">11</span>.0
         ^^^^^^ 22 common bits →  <span class="k">192.168.0.0/22</span></pre>
<p>The global BGP table has over 1 million IPv4 routes; summarisation is what keeps it from being far bigger.</p>`)}
`,
    quiz: [
      { q: 'How many usable hosts does a /27 have?', a: ['32', '30', '62', '14'], c: 1, why: '2^(32−27) = 32 addresses, minus network and broadcast = 30.' },
      { q: 'What is the network address of 10.1.1.77/26?', a: ['10.1.1.0', '10.1.1.64', '10.1.1.76', '10.1.1.128'], c: 1, why: '/26 blocks are 64 wide: .0, .64, .128, .192. 77 falls in .64–.127.' },
      { q: 'Which mask equals /20?', a: ['255.255.240.0', '255.255.255.240', '255.255.224.0', '255.240.0.0'], c: 0, why: '20 bits = 8 + 8 + 4, and 11110000 = 240 in the third octet.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'switching', level: 'core', icon: '🔀', color: '#ff5c9a', minutes: 10,
    title: 'Ethernet, switches & ARP',
    summary: 'MAC addresses, how switches learn, and how IPs map to MACs.',
    body: `
<h2 id="mac">MAC addresses</h2>
<p>Every network interface has a 48‑bit <strong>MAC address</strong>, written like <code>3c:22:fb:9a:10:4e</code>. The first 24 bits identify the manufacturer (the OUI). MACs only matter on the <strong>local link</strong> — they never leave your LAN.</p>

<h2 id="switch">How a switch learns</h2>
<p>A <strong>switch</strong> forwards Ethernet frames between ports. It starts knowing nothing. Each time a frame arrives, it notes "<em>source MAC X lives on port P</em>" in its <strong>MAC address table</strong>. To forward:</p>
<ol>
<li>If the destination MAC is in the table → send it out that one port (<strong>forward</strong>).</li>
<li>If it's unknown → send it out every port except the incoming one (<strong>flood</strong>).</li>
<li>If the destination is the broadcast <code>ff:ff:ff:ff:ff:ff</code> → flood.</li>
</ol>
<p>Pick a sender and a receiver below and watch the table fill up.</p>
<div data-widget="switch"></div>
${analogy('A switch is a receptionist in a new office. The first time a letter comes for "Alice", they shout it down every hallway. But they notice which hallway Alice’s own letters come from, and next time walk straight there.')}

<h2 id="arp">ARP: from IP to MAC</h2>
<p>Your laptop knows the <em>IP</em> it wants to reach, but Ethernet needs a <em>MAC</em>. <strong>ARP</strong> (Address Resolution Protocol) solves this: it broadcasts "<em>Who has 192.168.1.20? Tell 192.168.1.10</em>". The owner replies directly with its MAC, and both sides cache the answer in an <strong>ARP table</strong>. Check yours with <code>arp -a</code>.</p>
${note('If the destination is <em>outside</em> your subnet, you ARP for the <strong>default gateway’s</strong> MAC, not the final server’s. The frame goes to the router; the IP packet inside is still addressed to the server.')}

<h2 id="hub-switch-router">Hub vs switch vs router</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Device</th><th>Layer</th><th>Decides using</th><th>Behaviour</th></tr>
<tr><td>Hub</td><td>1</td><td>Nothing</td><td>Repeats every bit to every port (one collision domain)</td></tr>
<tr><td>Switch</td><td>2</td><td>MAC table</td><td>Forwards frames to the right port; floods broadcasts</td></tr>
<tr><td>Router</td><td>3</td><td>Routing table</td><td>Connects different IP networks; blocks broadcasts</td></tr>
</table></div>

${deep('VLANs: many LANs on one switch', `
<p>A <strong>VLAN</strong> splits a physical switch into several logical ones — guests on VLAN 20 can't see servers on VLAN 10 at layer 2. Between switches, a <strong>trunk</strong> link carries many VLANs by adding a 4‑byte <strong>802.1Q tag</strong> with a 12‑bit VLAN ID (1–4094) to each frame. To get from one VLAN to another you need a router (or a layer‑3 switch) — which is exactly where you put firewall rules.</p>`)}
${deep('Loops, broadcast storms and Spanning Tree', `
<p>Redundant links between switches create <strong>loops</strong>. Ethernet frames have no TTL, so a single broadcast would circle forever, multiplying until the network melts (a <em>broadcast storm</em>). <strong>STP</strong> (Spanning Tree Protocol, 802.1D) elects a <em>root bridge</em> and blocks just enough ports to make the topology a loop‑free tree; if a link fails, a blocked port is unblocked. Rapid STP (802.1w) converges in about a second instead of 30–50. Modern data centres avoid STP entirely with routed layer‑3 fabrics.</p>`)}
${deep('ARP spoofing — why the LAN is not automatically trusted', `
<p>ARP has no authentication: anyone can send "<em>192.168.1.1 is at aa:bb:cc...</em>". An attacker can poison caches and sit in the middle of traffic. Defences include <strong>Dynamic ARP Inspection</strong> on switches (validates ARP against DHCP leases), port security, and — most importantly — end‑to‑end encryption (TLS) so a man‑in‑the‑middle sees only ciphertext.</p>`)}
`,
    quiz: [
      { q: 'What does a switch do with a frame for an unknown destination MAC?', a: ['Drops it', 'Floods it out all other ports', 'Sends it to the router', 'Asks DNS'], c: 1, why: 'Unknown unicast is flooded; the reply then teaches the switch where that MAC lives.' },
      { q: 'What does ARP map?', a: ['Hostnames to IPs', 'IPs to MAC addresses', 'Ports to processes', 'MACs to VLANs'], c: 1, why: 'ARP resolves a next-hop IPv4 address to the MAC address needed to build the Ethernet frame.' },
      { q: 'Your PC (192.168.1.10/24) sends to 8.8.8.8. Whose MAC goes in the frame?', a: ['8.8.8.8’s', 'The default gateway’s', 'The broadcast MAC', 'Your own'], c: 1, why: '8.8.8.8 is off-subnet, so the frame is addressed to the router (default gateway).' },
    ],
  },

  /* ============================================================ */
  {
    id: 'routing', level: 'core', icon: '🧭', color: '#5cf2c2', minutes: 12,
    title: 'Routing',
    summary: 'Routing tables, longest-prefix match, shortest paths and BGP.',
    body: `
<h2 id="routers">What a router does</h2>
<p>A <strong>router</strong> connects networks. For every packet it reads the destination IP, looks it up in its <strong>routing table</strong>, decrements the TTL, and sends the packet out the chosen interface toward the <strong>next hop</strong>. It repeats this millions of times per second.</p>
<h3>Longest prefix match</h3>
<p>Several routes may match a destination. The router picks the <strong>most specific</strong> one — the longest prefix. The <code>0.0.0.0/0</code> <strong>default route</strong> matches everything, so it's the last resort.</p>
<div data-widget="lpm"></div>

<h2 id="dynamic">Building tables automatically</h2>
<p>Small networks use <strong>static routes</strong> typed by an admin. Bigger ones use <strong>routing protocols</strong> so routers learn paths and react to failures:</p>
<ul>
<li><strong>Distance vector</strong> (RIP): routers tell neighbours "I can reach X in N hops". Simple, slow to converge.</li>
<li><strong>Link state</strong> (OSPF, IS‑IS): every router floods a map of its links, then each runs <strong>Dijkstra's</strong> shortest path algorithm on the full map.</li>
<li><strong>Path vector</strong> (BGP): between organisations on the Internet; chooses routes by policy, not just distance.</li>
</ul>
<p>Below is a link‑state network. Drag the costs, cut links, and watch Dijkstra recompute the shortest path tree from the source.</p>
<div data-widget="dijkstra"></div>
${analogy('Distance vector is asking strangers for directions ("the station is 3 streets that way"). Link state is everyone sharing their own street map so you can plan the route yourself.')}

<h2 id="traceroute">Seeing routes: traceroute</h2>
<p><code>traceroute</code> (or <code>tracert</code> on Windows) sends packets with TTL = 1, 2, 3… Each router that decrements TTL to 0 sends back an ICMP "Time Exceeded" message — revealing itself. That's how you map the path to a server hop by hop.</p>
<pre class="code"><span class="k">$</span> traceroute example.com
 1  192.168.1.1      1.2 ms   <span class="c"># your home router</span>
 2  10.42.0.1        8.9 ms   <span class="c"># ISP access network</span>
 3  core1.par.isp    9.5 ms
 4  ix.paris.net    10.1 ms   <span class="c"># Internet exchange</span>
 5  93.184.215.14   18.7 ms   <span class="c"># destination</span></pre>
<p>Want to <em>be</em> the packet? Play <a href="#/play/runner">Packet Runner 3D</a>.</p>

${deep('BGP: the routing protocol that holds the Internet together', `
<p>Each organisation running its own network is an <strong>Autonomous System</strong> with a number (AS15169 is Google, AS13335 is Cloudflare). BGP routers exchange <em>prefixes</em> together with the <strong>AS path</strong> — the list of networks the route passed through. The path prevents loops (reject any route containing your own AS) and drives policy.</p>
<p>Route selection is governed by business relationships: prefer routes from <em>customers</em> (they pay you), then <em>peers</em> (free exchange), then <em>providers</em> (you pay them). Only after policy come tie‑breakers like shortest AS path.</p>
<p>Because BGP trusts what neighbours announce, mistakes propagate: a <strong>route leak</strong> or <strong>hijack</strong> can blackhole big chunks of the Internet. <strong>RPKI</strong> lets networks cryptographically sign which AS may originate which prefix, and routers increasingly drop invalid announcements.</p>`)}
${deep('Dijkstra in code', `
<pre class="code"><span class="k">function</span> dijkstra(graph, src) {
  <span class="k">const</span> dist = {}, prev = {}, todo = <span class="k">new</span> Set(Object.keys(graph));
  <span class="k">for</span> (<span class="k">const</span> v <span class="k">of</span> todo) dist[v] = Infinity;
  dist[src] = <span class="n">0</span>;
  <span class="k">while</span> (todo.size) {
    <span class="c">// take the closest unvisited node</span>
    <span class="k">const</span> u = [...todo].reduce((a, b) => dist[a] &lt; dist[b] ? a : b);
    todo.delete(u);
    <span class="k">for</span> (<span class="k">const</span> [v, cost] <span class="k">of</span> Object.entries(graph[u])) {
      <span class="k">if</span> (dist[u] + cost &lt; dist[v]) { dist[v] = dist[u] + cost; prev[v] = u; }
    }
  }
  <span class="k">return</span> { dist, prev };
}</pre>
<p>Real routers use a priority queue (O((V+E) log V)) and incremental SPF so a single link change doesn't recompute everything.</p>`)}
${deep('ECMP, anycast and how big sites balance traffic', `
<p>When two paths tie on cost, routers use <strong>ECMP</strong> (equal‑cost multipath), hashing each flow's 5‑tuple so a connection's packets stay on one path (avoiding reordering). <strong>Anycast</strong> announces the <em>same</em> IP prefix from many locations; BGP naturally delivers you to the nearest one — that's how <code>1.1.1.1</code> and root DNS servers answer from hundreds of cities with one address.</p>`)}
`,
    quiz: [
      { q: 'Routes 10.0.0.0/8, 10.1.0.0/16 and 10.1.2.0/24 all exist. Where does 10.1.2.9 go?', a: ['10.0.0.0/8', '10.1.0.0/16', '10.1.2.0/24', 'The default route'], c: 2, why: 'Longest prefix match: /24 is the most specific matching route.' },
      { q: 'Which algorithm does OSPF use to compute paths?', a: ['Bellman-Ford', 'Dijkstra', 'Round robin', 'Spanning tree'], c: 1, why: 'Link-state protocols like OSPF and IS-IS run Dijkstra’s shortest-path-first algorithm.' },
      { q: 'How does traceroute discover each hop?', a: ['It asks DNS', 'It increments TTL and reads ICMP Time Exceeded replies', 'It reads the routing table remotely', 'It uses ARP'], c: 1, why: 'Each router that drops a TTL-expired packet replies with ICMP Time Exceeded, revealing itself.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'tcp-udp', level: 'core', icon: '🤝', color: '#8b7bff', minutes: 14,
    title: 'TCP & UDP',
    summary: 'Ports, the three-way handshake, reliability, flow & congestion control.',
    body: `
<h2 id="ports">Ports: which program?</h2>
<p>IP gets data to the right <em>machine</em>. The transport layer gets it to the right <em>program</em> using <strong>port numbers</strong> (0–65535). A web server listens on 443, SSH on 22, DNS on 53. Your browser uses a random high <strong>ephemeral port</strong> on its side. A connection is identified by the <strong>5‑tuple</strong>: protocol, source IP, source port, destination IP, destination port.</p>

<h2 id="udp-vs-tcp">UDP vs TCP</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th></th><th>UDP</th><th>TCP</th></tr>
<tr><td>Connection</td><td>None — just send</td><td>Handshake first</td></tr>
<tr><td>Reliability</td><td>Best effort; may lose, duplicate or reorder</td><td>Every byte arrives once, in order</td></tr>
<tr><td>Header</td><td>8 bytes</td><td>20–60 bytes</td></tr>
<tr><td>Flow / congestion control</td><td>No</td><td>Yes</td></tr>
<tr><td>Used by</td><td>DNS, games, VoIP, video calls, QUIC</td><td>Web (HTTP/1.1, 2), email, SSH, file transfer</td></tr>
</table></div>
${analogy('UDP is shouting across a room: fast, no setup, but if someone misses a word, too bad. TCP is a phone call where you confirm "got it?" after every sentence and repeat what was missed.')}

<h2 id="handshake">The three-way handshake & reliable delivery</h2>
<p>TCP numbers every byte with a <strong>sequence number</strong>. Before sending data, both sides agree on starting numbers with a handshake: <strong>SYN → SYN‑ACK → ACK</strong>. The receiver acknowledges data it got; if an ACK doesn't arrive before a timeout, the sender <strong>retransmits</strong>. Crank up the packet loss and watch TCP recover.</p>
<div data-widget="tcp"></div>

<h2 id="windows">Flow control & sliding windows</h2>
<p>Waiting for an ACK after every segment would be painfully slow on long paths. TCP keeps a <strong>window</strong> of segments in flight. The receiver advertises how much buffer it has (<strong>rwnd</strong>, flow control) and the sender also limits itself to a <strong>congestion window</strong> (<strong>cwnd</strong>) so it doesn't overwhelm the network.</p>

${deep('Congestion control: slow start, AIMD, CUBIC and BBR', `
<p>TCP probes for available bandwidth:</p>
<ol>
<li><strong>Slow start</strong>: cwnd starts small (10 segments today) and <em>doubles</em> every RTT — exponential growth.</li>
<li>At the slow‑start threshold, switch to <strong>congestion avoidance</strong>: add ~1 segment per RTT (additive increase).</li>
<li>On loss, <strong>multiplicatively decrease</strong> (halve) cwnd. That's <strong>AIMD</strong> — and it's what makes many flows converge to a fair share.</li>
</ol>
<div data-widget="cwnd"></div>
<p>Linux defaults to <strong>CUBIC</strong>, which grows cwnd as a cubic function of time since the last loss to fill fat pipes quickly. Google's <strong>BBR</strong> instead models the path's bottleneck bandwidth and RTT, aiming to keep queues short — loss is not treated as the main congestion signal.</p>`)}
${deep('Closing connections, TIME_WAIT and the TCP state machine', `
<p>Closing takes four segments because each direction is shut independently: <strong>FIN → ACK</strong>, then <strong>FIN → ACK</strong> the other way. The side that closes first enters <strong>TIME_WAIT</strong> for 2×MSL (often 60 s) so stray old segments can't corrupt a new connection with the same 5‑tuple. Busy proxies with thousands of short connections can run out of ephemeral ports because of it.</p>
<pre class="code">CLOSED → SYN_SENT → ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED   <span class="c"># client</span>
LISTEN → SYN_RCVD → ESTABLISHED → CLOSE_WAIT → LAST_ACK → CLOSED                 <span class="c"># server</span></pre>
<p>A <strong>RST</strong> segment aborts a connection immediately — what you get when you connect to a closed port.</p>`)}
${deep('QUIC: TCP’s replacement built on UDP', `
<p>TCP has <strong>head‑of‑line blocking</strong>: one lost segment stalls all data behind it, even for unrelated HTTP/2 streams. And its handshake plus TLS costs 2–3 round trips. <strong>QUIC</strong> runs over UDP, encrypts almost everything (including transport headers), multiplexes independent streams so loss on one doesn't block others, and combines the transport and TLS 1.3 handshakes into 1 RTT (0‑RTT for resumed connections). Connections survive IP changes (Wi‑Fi → 4G) via connection IDs. HTTP/3 is HTTP over QUIC.</p>`)}
`,
    quiz: [
      { q: 'What is the order of the TCP handshake?', a: ['ACK, SYN, SYN-ACK', 'SYN, SYN-ACK, ACK', 'SYN, ACK, FIN', 'HELLO, OK, GO'], c: 1, why: 'Client sends SYN, server replies SYN-ACK, client confirms with ACK.' },
      { q: 'Why do online games often prefer UDP?', a: ['It’s encrypted', 'Old data is useless — waiting for retransmissions adds lag', 'It has bigger packets', 'Routers prioritise it'], c: 1, why: 'A position update from 200 ms ago is worthless; it’s better to just use the next one than stall for a retransmit.' },
      { q: 'In TCP congestion control, what happens to cwnd on packet loss (classic Reno)?', a: ['It doubles', 'It is roughly halved', 'It stays the same', 'It is set to rwnd'], c: 1, why: 'AIMD: additive increase, multiplicative decrease — cwnd is cut (halved) on loss.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'dns', level: 'apps', icon: '📇', color: '#ffd166', minutes: 10,
    title: 'DNS: the Internet’s phone book',
    summary: 'How names become IP addresses through a hierarchy of servers and caches.',
    body: `
<h2 id="why-dns">Why DNS exists</h2>
<p>Humans remember <code>wikipedia.org</code>; routers need <code>185.15.58.224</code>. The <strong>Domain Name System</strong> is a distributed, hierarchical database that translates names to addresses (and much more). It's so central that "it's always DNS" is a running joke among engineers.</p>

<h2 id="hierarchy">The hierarchy</h2>
<p>Names are read right to left: the invisible root <code>.</code>, then a <strong>top‑level domain</strong> (<code>org</code>), then the domain (<code>wikipedia</code>), then optional subdomains (<code>en</code>). Each level <strong>delegates</strong> authority to the next. No server knows everything — but each knows who to ask next.</p>

<h2 id="resolution">Resolution, step by step</h2>
<p>Your device asks a <strong>recursive resolver</strong> (your ISP's, or <code>1.1.1.1</code>/<code>8.8.8.8</code>). If the answer isn't cached, the resolver walks the tree: root → TLD → authoritative server. Step through it below; then run it again to see caching.</p>
<div data-widget="dns"></div>
${analogy('The resolver is a librarian. Ask for "en.wikipedia.org" and they go to the main catalogue (root) — "try the .org section", then the .org shelf — "Wikipedia has their own room", and finally Wikipedia’s room has the exact book. Next time someone asks, the librarian remembers.')}

<h2 id="records">Record types</h2>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Type</th><th>Meaning</th><th>Example</th></tr>
<tr><td>A</td><td>IPv4 address</td><td><code>example.com → 93.184.215.14</code></td></tr>
<tr><td>AAAA</td><td>IPv6 address</td><td><code>example.com → 2606:2800:21f:cb07::1</code></td></tr>
<tr><td>CNAME</td><td>Alias to another name</td><td><code>www → example.com</code></td></tr>
<tr><td>MX</td><td>Mail server for the domain</td><td><code>10 mail.example.com</code></td></tr>
<tr><td>NS</td><td>Authoritative name servers</td><td><code>a.iana-servers.net</code></td></tr>
<tr><td>TXT</td><td>Free text (SPF, verification)</td><td><code>"v=spf1 -all"</code></td></tr>
</table></div>
<p>Every record has a <strong>TTL</strong> — how many seconds resolvers may cache it. Low TTLs allow quick changes; high TTLs mean fewer queries.</p>
<pre class="code"><span class="k">$</span> dig +short example.com A
93.184.215.14
<span class="k">$</span> dig +trace example.com   <span class="c"># watch the full delegation chain</span></pre>

${deep('DNS security: spoofing, DNSSEC, DoH and DoT', `
<p>Classic DNS is plain UDP on port 53: anyone on the path can read your queries, and an attacker who guesses the 16‑bit query ID and source port can inject a fake answer (<strong>cache poisoning</strong>; the 2008 Kaminsky attack made this practical until source‑port randomisation).</p>
<ul>
<li><strong>DNSSEC</strong> adds signatures: each zone signs its records, and parents vouch for children's keys (DS records), forming a chain of trust up to the root. It provides <em>integrity</em>, not privacy.</li>
<li><strong>DoT</strong> (DNS over TLS, port 853) and <strong>DoH</strong> (DNS over HTTPS, port 443) encrypt the query between you and the resolver — <em>privacy</em> on the local network.</li>
</ul>`)}
${deep('How CDNs use DNS to send you to the nearest server', `
<p>When you resolve a name served by a CDN, the authoritative server looks at the resolver's location (or the <strong>EDNS Client Subnet</strong> hint) and answers with the IP of a nearby edge server. A CNAME often points from <code>www.shop.com</code> to something like <code>shop.cdn-provider.net</code> so the CDN controls the answer. Combined with short TTLs this lets traffic be steered away from overloaded or failed sites in seconds.</p>`)}
`,
    quiz: [
      { q: 'Which record maps a name to an IPv6 address?', a: ['A', 'AAAA', 'MX', 'PTR'], c: 1, why: 'AAAA ("quad-A") records hold 128-bit IPv6 addresses.' },
      { q: 'Who does a recursive resolver ask first on a cold cache?', a: ['The authoritative server', 'A root server', 'The TLD server', 'Your browser'], c: 1, why: 'Root servers point it to the right TLD servers, which point to the authoritative ones.' },
      { q: 'What does the TTL on a DNS record control?', a: ['How many hops the reply may take', 'How long it may be cached', 'Its priority', 'Its encryption'], c: 1, why: 'The record TTL is the number of seconds resolvers may cache the answer.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'http-tls', level: 'apps', icon: '🔐', color: '#4cc9ff', minutes: 12,
    title: 'HTTP & TLS',
    summary: 'What happens when you load a page: requests, responses, and encryption.',
    body: `
<h2 id="http">HTTP: requests and responses</h2>
<p><strong>HTTP</strong> is the language of the web. A client sends a <strong>request</strong> (method, path, headers, optional body); the server returns a <strong>response</strong> (status code, headers, body). It's plain text in HTTP/1.1, so you can read it. Build a request below and see what the server sends back.</p>
<div data-widget="http"></div>
<h3>Status codes at a glance</h3>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Range</th><th>Meaning</th><th>Classics</th></tr>
<tr><td>1xx</td><td>Informational</td><td>101 Switching Protocols</td></tr>
<tr><td>2xx</td><td>Success</td><td>200 OK, 201 Created, 204 No Content</td></tr>
<tr><td>3xx</td><td>Redirection</td><td>301 Moved Permanently, 304 Not Modified</td></tr>
<tr><td>4xx</td><td>Client error</td><td>400, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests</td></tr>
<tr><td>5xx</td><td>Server error</td><td>500, 502 Bad Gateway, 503 Unavailable</td></tr>
</table></div>

<h2 id="page-load">Everything that happens when you hit Enter</h2>
<ol>
<li><strong>DNS</strong> resolves the hostname to an IP.</li>
<li><strong>TCP</strong> handshake to port 443 (or a QUIC handshake over UDP).</li>
<li><strong>TLS</strong> handshake: agree on keys, verify the server's certificate.</li>
<li><strong>HTTP</strong> request for the page; the response HTML references CSS, JS, images…</li>
<li>The browser reuses the connection (HTTP/2 multiplexing) to fetch the rest, then renders.</li>
</ol>

<h2 id="tls">TLS: the S in HTTPS</h2>
<p><strong>TLS</strong> gives three guarantees: <strong>confidentiality</strong> (nobody can read it), <strong>integrity</strong> (nobody can modify it unnoticed) and <strong>authentication</strong> (you're talking to the real server). Step through a TLS 1.3 handshake:</p>
<div data-widget="tls"></div>
${analogy('Diffie‑Hellman is like mixing paint: you and I each keep a secret colour, publicly exchange "common yellow + my secret" mixtures, then each add our own secret to the other’s mixture. We end up with the same final colour, but an eavesdropper who saw only the mixtures can’t un‑mix them.')}

${deep('Certificates and the chain of trust', `
<p>A certificate binds a public key to a domain name, signed by a <strong>Certificate Authority</strong>. Your browser ships with ~150 trusted root CAs. A server sends its <em>leaf</em> certificate plus <em>intermediates</em>; the browser verifies each signature up to a trusted root, checks the name matches, and that nothing has expired or been revoked.</p>
<pre class="code">ISRG Root X1           <span class="c"># root, in your OS/browser trust store</span>
 └─ R11                <span class="c"># intermediate CA</span>
     └─ example.org    <span class="c"># leaf: public key + names + validity</span></pre>
<p><strong>Certificate Transparency</strong> logs make every issued certificate public, so mis‑issuance gets noticed. Let's Encrypt made certificates free and automated (ACME), which is a big reason most web traffic is now encrypted.</p>`)}
${deep('HTTP/1.1 vs HTTP/2 vs HTTP/3', `
<div class="tbl-wrap"><table class="tbl">
<tr><th></th><th>HTTP/1.1</th><th>HTTP/2</th><th>HTTP/3</th></tr>
<tr><td>Format</td><td>Text</td><td>Binary frames</td><td>Binary frames</td></tr>
<tr><td>Transport</td><td>TCP</td><td>TCP</td><td>QUIC (UDP)</td></tr>
<tr><td>Parallel requests</td><td>~6 connections per host</td><td>Many streams on one connection</td><td>Independent streams, no TCP HOL blocking</td></tr>
<tr><td>Header compression</td><td>No</td><td>HPACK</td><td>QPACK</td></tr>
</table></div>`)}
${deep('Forward secrecy: why recorded traffic stays safe', `
<p>In old RSA key exchange the browser encrypted the session key with the server's long‑term key. Steal that key years later and you could decrypt every recorded session. TLS 1.3 <em>requires</em> <strong>ephemeral Diffie‑Hellman</strong> (ECDHE): fresh keys per connection, thrown away afterwards. Compromising the server's certificate key later reveals nothing about past sessions — that's <strong>forward secrecy</strong>.</p>`)}
`,
    quiz: [
      { q: 'What does HTTP 404 mean?', a: ['Server crashed', 'Not Found', 'Forbidden', 'Moved permanently'], c: 1, why: '4xx are client errors; 404 means the resource doesn’t exist on the server.' },
      { q: 'Which TLS property ensures you talk to the real server?', a: ['Confidentiality', 'Integrity', 'Authentication', 'Compression'], c: 2, why: 'The certificate chain authenticates the server’s identity.' },
      { q: 'What does HTTP/3 run on?', a: ['TCP', 'QUIC over UDP', 'SCTP', 'Raw IP'], c: 1, why: 'HTTP/3 maps HTTP semantics onto QUIC, which runs over UDP.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'nat-firewalls', level: 'apps', icon: '🛡️', color: '#ff5470',
    minutes: 11,
    title: 'NAT, firewalls & security',
    summary: 'Sharing one public IP, filtering traffic, and defending networks.',
    body: `
<h2 id="nat">NAT: many devices, one public IP</h2>
<p>Your home has dozens of devices but your ISP gives you <em>one</em> public IPv4. <strong>NAT</strong> (Network Address Translation — strictly, <strong>PAT</strong> / NAPT) on your router rewrites outgoing packets' private source <code>IP:port</code> to its public IP and a unique port, and remembers the mapping so replies can be translated back.</p>
<div data-widget="nat"></div>
${note('A side effect: unsolicited inbound connections have no mapping, so they get dropped. NAT isn’t a security feature by design, but it behaves a bit like a firewall — and it’s why hosting a game server at home needs <strong>port forwarding</strong>.')}

<h2 id="firewalls">Firewalls</h2>
<p>A <strong>firewall</strong> decides which traffic is allowed. Rules match fields like source, destination, protocol and port, and are evaluated <strong>top to bottom — first match wins</strong>. A good policy ends with "deny everything else" (<strong>default deny</strong>). <strong>Stateful</strong> firewalls track connections, so replies to traffic you started are allowed automatically.</p>
<p>Write rules to pass the test traffic below — let the web through, keep the attackers out.</p>
<div data-widget="firewall"></div>

<h2 id="threats">Common threats</h2>
<ul>
<li><strong>Eavesdropping</strong> on unencrypted traffic → use TLS/VPNs.</li>
<li><strong>Spoofing</strong> (fake source IPs, ARP/DNS poisoning) → validation, DNSSEC, DAI.</li>
<li><strong>DDoS</strong> — floods from many machines → scrubbing services, anycast, rate limits.</li>
<li><strong>Port scanning</strong> to find open services → close what you don't need, default deny.</li>
<li><strong>Lateral movement</strong> after one device is compromised → segmentation (VLANs, zero trust).</li>
</ul>

${deep('NAT types and NAT traversal (STUN, TURN, ICE)', `
<p>Video calls want direct peer‑to‑peer connections, but both peers are often behind NAT. Using a <strong>STUN</strong> server each peer discovers its public <code>IP:port</code> mapping; peers exchange these candidates (via <strong>ICE</strong>) and try to "punch holes" by sending to each other simultaneously. With strict <em>symmetric</em> NATs (a different mapping per destination) hole punching fails, and traffic is relayed through a <strong>TURN</strong> server instead. This is the machinery under WebRTC.</p>`)}
${deep('Zero trust: forget the castle and moat', `
<p>The traditional model trusted everything inside the perimeter firewall. Once an attacker got in (phishing, a vulnerable printer), they could roam freely. <strong>Zero trust</strong> assumes the network is hostile: every request is authenticated and authorised based on user identity, device health and context, regardless of where it comes from. Micro‑segmentation limits what any one machine can reach, and VPN‑less access proxies replace "being on the network" as a credential.</p>`)}
${deep('VPNs: tunnels with encryption', `
<p>A VPN encapsulates your packets inside encrypted packets to a VPN server. <strong>IPsec</strong> works at layer 3 and is common site‑to‑site. <strong>WireGuard</strong> is a modern, minimal design (~4 000 lines) using Curve25519, ChaCha20‑Poly1305 and UDP. To the local network, all traffic looks like one encrypted UDP flow to the VPN server.</p>`)}
`,
    quiz: [
      { q: 'What does PAT/NAPT change in outgoing packets?', a: ['Only destination IP', 'Source IP and source port', 'The TTL', 'The MAC address only'], c: 1, why: 'It rewrites the private source IP:port to the public IP and a unique port, then tracks the mapping.' },
      { q: 'Firewall rules are usually evaluated…', a: ['Randomly', 'Bottom to top', 'Top to bottom, first match wins', 'All at once, majority wins'], c: 2, why: 'Order matters: the first matching rule decides, which is why default-deny goes last.' },
      { q: 'Which technique relays WebRTC media when hole punching fails?', a: ['STUN', 'TURN', 'DHCP', 'ARP'], c: 1, why: 'TURN servers relay the traffic when direct peer-to-peer paths can’t be established.' },
    ],
  },
  /* ============================================================ */
  {
    id: 'troubleshooting', level: 'pro', icon: '🩺', color: '#5cf2c2', minutes: 15,
    title: 'Troubleshooting like a pro',
    summary: 'ping, traceroute, dig, curl and friends: diagnose any network problem in a real terminal.',
    body: `
<h2 id="method">A method, not a guess</h2>
<p>When "the Internet is down", pros don’t reboot things at random. They walk the stack <strong>bottom‑up</strong> and ask one question per layer. The first layer that fails is where the problem is.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>Question</th><th>Layer</th><th>Tool</th></tr>
<tr><td>Am I connected, and do I have an IP address?</td><td>1–3</td><td><code>ip addr</code> / <code>ipconfig</code></td></tr>
<tr><td>Can I reach my gateway?</td><td>2–3</td><td><code>ping 192.168.1.1</code>, <code>arp -a</code></td></tr>
<tr><td>Can I reach the Internet by IP?</td><td>3</td><td><code>ping 1.1.1.1</code>, <code>traceroute</code></td></tr>
<tr><td>Do names resolve?</td><td>7 (DNS)</td><td><code>dig</code>, <code>nslookup</code></td></tr>
<tr><td>Is the service answering?</td><td>4–7</td><td><code>nc -zv host 443</code>, <code>curl -I</code></td></tr>
</table></div>
${analogy('A doctor checks pulse, then breathing, then the specific symptom. "Can ping 1.1.1.1 but not google.com" is a symptom that points straight at DNS.')}

<h2 id="terminal">Your terminal</h2>
<p>This is a simulated Linux laptop on a home network. Try the missions on the right; type <code>help</code> for every command. Use <kbd>↑</kbd> for history and <kbd>Tab</kbd> to autocomplete.</p>
<div data-widget="terminal"></div>

<h2 id="reading">Reading the output</h2>
<ul>
<li><strong>ping</strong>: <code>time=</code> is the round‑trip time and <code>ttl=</code> is the remaining TTL. A starting value of 64 (Linux/macOS) or 128 (Windows) minus the hops tells you roughly how far away the host is.</li>
<li><strong>traceroute</strong>: <code>* * *</code> doesn’t always mean broken; many routers simply don’t answer probes. Worry only if the destination itself doesn’t answer.</li>
<li><strong>dig</strong>: check <code>status: NOERROR</code> vs <code>NXDOMAIN</code> (the name doesn’t exist) vs <code>SERVFAIL</code> (the resolver couldn’t get an answer).</li>
<li><strong>curl -I</strong>: shows HTTP status and headers without downloading the page body.</li>
</ul>

${deep('Packet capture: tcpdump and Wireshark', `
<p>When the tools above aren’t enough, look at the packets themselves. <code>tcpdump</code> captures from the command line:</p>
<pre class="code"><span class="k">$</span> sudo tcpdump -i eth0 -n 'tcp port 443 and host 93.184.215.14'
<span class="c">12:00:01.000 IP 192.168.1.42.51514 > 93.184.215.14.443: Flags [S], seq 1</span>
<span class="c">12:00:01.018 IP 93.184.215.14.443 > 192.168.1.42.51514: Flags [S.], seq 9, ack 2</span>
<span class="c">12:00:01.018 IP 192.168.1.42.51514 > 93.184.215.14.443: Flags [.], ack 10</span></pre>
<p>There’s the three‑way handshake: <code>[S]</code> SYN, <code>[S.]</code> SYN‑ACK, <code>[.]</code> ACK. <strong>Wireshark</strong> opens the same captures in a GUI and decodes hundreds of protocols layer by layer. It’s the single best tool for learning networking.</p>`)}
${deep('MTU problems: when small pages load but big ones hang', `
<p>A classic mystery: SSH logins work, small pages load, but big downloads stall. Often a tunnel (VPN, PPPoE) lowers the path <strong>MTU</strong>, and a firewall blocks the ICMP "Fragmentation Needed" messages that <strong>Path MTU Discovery</strong> relies on. Big packets vanish silently, creating a "black hole". Test it with <code>ping -M do -s 1472 host</code> (1472 + 28 bytes of headers = 1500). The fix is to allow ICMP or clamp the TCP MSS on the router.</p>`)}
`,
    quiz: [
      { q: 'You can ping 1.1.1.1 but not example.com. What is most likely broken?', a: ['The cable', 'DNS', 'TCP', 'The default gateway'], c: 1, why: 'Reaching an IP proves routing works; failing on a name points at name resolution.' },
      { q: 'A Linux host replies with ttl=57. About how many hops away is it?', a: ['57', '7', '64', '121'], c: 1, why: 'Linux starts at 64; 64 − 57 = 7 routers decremented it.' },
      { q: 'What does dig status NXDOMAIN mean?', a: ['Server crashed', 'The domain name does not exist', 'Timeout', 'The answer is cached'], c: 1, why: 'NXDOMAIN = Non-eXistent DOMAIN, an authoritative “no such name”.' },
    ],
  },

  /* ============================================================ */
  {
    id: 'scale', level: 'pro', icon: '⚖️', color: '#ffd166', minutes: 12,
    title: 'Load balancing, CDNs & scale',
    summary: 'How the biggest sites serve billions: load balancers, health checks, caching and edge networks.',
    body: `
<h2 id="one-server">One server is never enough</h2>
<p>A single server is a single point of failure, and it has a capacity limit. Big services spread traffic across many identical servers behind a <strong>load balancer</strong> (LB). Clients connect to one address (a <em>virtual IP</em>), and the LB picks a healthy backend for each connection or request.</p>
${analogy('A load balancer is the host at a busy restaurant. Instead of letting every guest crowd the first waiter, they seat each party with whoever is free, and stop seating anyone at a table whose waiter called in sick.')}

<h2 id="algorithms">Balancing algorithms</h2>
<ul>
<li><strong>Round robin</strong>: 1, 2, 3, 1, 2, 3… Simple, but ignores how busy each server is.</li>
<li><strong>Weighted</strong>: bigger servers get proportionally more.</li>
<li><strong>Least connections</strong>: send to whoever has the fewest active requests, which adapts to slow servers.</li>
<li><strong>Hash (IP or cookie)</strong>: the same client always lands on the same server ("sticky sessions").</li>
</ul>
<p>Run the simulator. Then make server B slow and compare round robin to least connections. Kill a server and watch the <strong>health checks</strong> take it out of rotation.</p>
<div data-widget="loadbalancer"></div>

<h2 id="l4-l7">Layer 4 vs layer 7</h2>
<p>An <strong>L4</strong> load balancer only looks at IPs and ports, so it is blazingly fast and protocol‑agnostic. An <strong>L7</strong> load balancer (reverse proxy) understands HTTP. It can route <code>/api</code> to one pool and <code>/images</code> to another, terminate TLS, add headers and retry failed requests. Most websites use both: L4 at the edge, L7 behind it.</p>

<h2 id="cdn">CDNs: bring the content closer</h2>
<p>Latency is bound by the speed of light. A <strong>Content Delivery Network</strong> keeps copies of content on servers in hundreds of cities. With <strong>anycast</strong> or DNS steering, you hit the nearest <em>edge</em>. If it has the file cached (a <em>hit</em>), the answer comes back in a few milliseconds. On a <em>miss</em>, the edge fetches it from the <strong>origin</strong> once and serves everyone after that.</p>
${note('The <code>Cache-Control</code> header tells caches how long a response may be reused. <code>max-age=31536000, immutable</code> on fingerprinted files like <code>app.3f9a.js</code> lets browsers and CDNs keep them for a year.')}

${deep('Consistent hashing: adding servers without reshuffling everything', `
<p>With naive hashing (<code>server = hash(key) % N</code>), adding one server changes <code>N</code> and remaps almost every key, so caches go cold everywhere at once. <strong>Consistent hashing</strong> places servers and keys on a ring; each key goes to the next server clockwise. Adding or removing a server only moves the keys in its arc, about 1/N of them. <em>Virtual nodes</em> (many points per server) even out the load. This idea powers CDNs, distributed caches and databases like Cassandra and DynamoDB.</p>`)}
${deep('Health checks, failover and the thundering herd', `
<p>LBs probe backends (for example <code>GET /healthz</code> every 2 s) and pull one out after N failures. Careful design matters. If health checks call a shared database and the database slows down, <em>every</em> server fails its check at once and the LB marks the whole fleet dead. When a cache expires, thousands of requests may hit the origin simultaneously (a <strong>thundering herd</strong>). Request coalescing, jittered expiry and "serve stale while revalidating" smooth it out.</p>`)}
${deep('Global traffic: DNS, anycast and BGP working together', `
<p>A request to a global service is steered three times: <strong>GeoDNS</strong> or <strong>anycast</strong> picks a region, an L4 LB in that data centre spreads flows across machines with ECMP and consistent hashing, and an L7 proxy routes the HTTP request to the right microservice. If a whole region fails, DNS or BGP announcements shift users elsewhere within seconds to minutes.</p>`)}
`,
    quiz: [
      { q: 'One backend becomes much slower. Which algorithm adapts automatically?', a: ['Round robin', 'Least connections', 'IP hash', 'Random'], c: 1, why: 'A slow server accumulates open requests, so least-connections sends it fewer new ones.' },
      { q: 'What does a CDN cache “miss” cause?', a: ['An error page', 'The edge fetches from the origin', 'A DNS lookup', 'A TCP reset'], c: 1, why: 'On a miss the edge retrieves the object from the origin, caches it and serves it.' },
      { q: 'Which can route /api and /images to different server pools?', a: ['An L4 load balancer', 'An L7 load balancer', 'A switch', 'ARP'], c: 1, why: 'Only an L7 (HTTP-aware) load balancer can read the URL path.' },
    ],
  },
];

export const moduleById = (id) => MODULES.find((m) => m.id === id);
