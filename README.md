# PacketCraft — learn networking by playing

An interactive website that teaches computer networking from the very basics ("what is a network?") up to deep dives on BGP, TCP congestion control, QUIC and TLS 1.3. It has playable 3D games, hands-on labs in every lesson, a flashcard system and XP to track your progress. **The whole site is available in German and English** (switch with the DE/EN button; the default follows your browser).

## What's inside

**18 lessons in 4 tracks.** Each has plain-language explanations, analogies, live labs, optional *deep dive* panels and a quiz.

| Track | Lessons |
|---|---|
| Foundations | What is a network? · Layers (OSI & TCP/IP) · Bits on the wire · Wi‑Fi & wireless |
| Core mechanics | IP addresses & binary · Subnetting · IPv6 in depth · Ethernet, switches & ARP · VLANs & Spanning Tree · Routing · TCP & UDP |
| The Internet you use | DNS · HTTP & TLS · E-mail (SMTP, SPF, DKIM, DMARC) · NAT, firewalls & security · VPNs & WireGuard |
| Pro track | Troubleshooting like a pro · Load balancing, CDNs & scale |

**23 interactive labs**, among them a simulated Linux terminal with 10 missions, a Wi‑Fi floor-plan planner, a load balancer simulator, an IPv6 compression drill and EUI-64 builder, a switch loop with a broadcast storm and Spanning Tree, a VPN "who sees what" view, an e-mail delivery trace with SPF/DKIM/DMARC checks, a subnet calculator, a TCP tracer with packet loss, a DNS resolver walkthrough and a firewall rule puzzle. Every lab is also available on its own in the toolkit.

**7 3D experiences** (Three.js), all with sound, touch controls (drag to orbit, pinch to zoom) and layouts that adapt to phones:
- **Journey of a Click**: a guided 3D cinematic of a page load: ARP, DNS recursion, TCP, TLS 1.3, HTTP.
- **Network Builder**: place switches and routers, run cables, solve five missions (first LAN → Internet via NAT → two subnets → no single point of failure → DMZ on a budget).
- **Subnet Blocks**: a /24 as a 3D board; pick the right prefix for each team and fit aligned blocks together.
- **DNS Detective**: seven real-world DNS outages; inspect caches and zone files, accuse the guilty server, pick the fix.
- **Packet Runner**: be an IP packet; longest-prefix match at every router, three difficulty levels, links that fail mid-route.
- **Encapsulation Elevator**: build and unwrap packets layer by layer; 8 scenarios incl. VPN tunnels and HTTP/3.
- **Firewall Defender**: an arcade firewall with growing policies and a DDoS wave.

**Learning system:** a 5-box Leitner flashcard deck (`#/review`) with a daily goal and streak. Every wrong answer in quizzes, the challenge and the games becomes a flashcard automatically. Finishing all lessons unlocks a printable certificate.

**Also:** ⌘K / Ctrl+K search over everything, a profile page with badges and high scores, a glossary of 122 terms, a timed challenge, and progress saved in `localStorage`.

## Run it

```bash
npm install
npm run dev                 # http://localhost:5173 (serves site/)
npm run build               # builds into the repo root
node scripts/selftest.mjs   # checks game rules, IPv6 helpers, flashcards and EN/DE content consistency
```

It's a static site with no backend: Vite, vanilla JS and Three.js. 3D code is lazy-loaded, so lessons stay light.

## Deploy (GitHub Pages)

The source lives in `site/`. `npm run build` writes the ready-to-serve site (`index.html` + `assets/`) to the **repository root**, and the built files are committed. GitHub Pages works with the default setting:

**Settings → Pages → Source: Deploy from a branch → `<your branch>` / `(root)`**

After changing anything in `site/`, run `npm run build` and commit the updated `index.html` and `assets/`.

## Project layout

```
index.html, assets/      built site (generated, served by GitHub Pages)
site/src/
  main.js                hash router + language toggle
  i18n.js                tr('English', 'Deutsch') helper
  core.js                helpers, progress/XP store, networking math
  srs.js                 Leitner flashcards
  gamelogic.js, net6.js  pure game rules and IPv6 helpers (self-tested)
  pages.js               home, learn, lesson, games, toolkit, glossary, challenge, flashcards, profile, certificate
  data/modules.en.js     lessons in English (defines order and ids)
  data/modules.de.js     lessons in German (same ids)
  data/glossary.*.js     glossary in both languages
  widgets/               2D interactive labs
  three/                 3D globe and games
scripts/selftest.mjs     assertions for the logic and course data
```
