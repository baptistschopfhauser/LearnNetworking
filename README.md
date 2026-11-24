# PacketCraft — learn networking by playing

An interactive website that teaches computer networking from the very basics ("what is a network?") up to deep dives on BGP, TCP congestion control, QUIC and TLS 1.3. It has 3D games you can play, hands-on labs in every lesson, and XP to track your progress.

## What's inside

**11 modules in 3 tracks.** Each one has plain-language explanations, analogies, live labs, optional *deep dive* panels, and a 3-question quiz.

| Track | Modules |
|---|---|
| Foundations | What is a network? · Layers (OSI & TCP/IP) · Bits on the wire |
| Core mechanics | IP addresses & binary · Subnetting · Ethernet, switches & ARP · Routing · TCP & UDP |
| The Internet you use | DNS · HTTP & TLS · NAT, firewalls & security |

**16 interactive labs:** a topology lab where you cut links, an OSI encapsulation animator, line-code waveforms, an IPv4 bit flipper, a subnet calculator and drills, a switch MAC-learning and ARP simulator, a longest-prefix-match trainer, a Dijkstra/OSPF playground, a TCP sequence tracer with packet loss, a congestion-window chart, a DNS resolution walkthrough, an HTTP client, a TLS 1.3 handshake stepper with a Diffie-Hellman toy, a NAT table simulator, and a firewall rule puzzle.

**3 playable 3D games** (Three.js):
- **Packet Runner**: you are an IP packet flying through a 3D network. Read each router's table, apply longest-prefix match, and arrive before your TTL runs out. There are 5 levels.
- **Encapsulation Elevator**: ride a message down the sender's stack adding headers, cross the wire as bits, then unwrap it on the receiver.
- **Firewall Defender**: an arcade game. Packets swarm your data center, and you zap the ones the policy forbids.

**Also:** a toolkit page with every lab on its own, a searchable glossary of 80+ terms, a timed 12-question challenge, and XP and levels saved in `localStorage`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 (serves site/)
npm run build    # builds into the repo root
npm run preview
```

It's a static site with no backend. It uses Vite, vanilla JS and Three.js. The 3D code is lazy-loaded, so lessons stay light (about 60 KB gzipped).

## Deploy (GitHub Pages)

The source lives in `site/`. `npm run build` writes the ready-to-serve site (`index.html` + `assets/`) to the **repository root**, and the built files are committed. So GitHub Pages works with the default setting:

**Settings → Pages → Source: Deploy from a branch → `<your branch>` / `(root)`**

After changing anything in `site/`, run `npm run build` and commit the updated `index.html` and `assets/`.

## Project layout

```
index.html, assets/  built site (generated, served by GitHub Pages)
site/index.html      source HTML
site/src/
  main.js            hash router
  core.js            helpers, progress/XP store, networking math
  pages.js           home, learn, module, play, toolkit, glossary, challenge
  data/modules.js    all course content
  data/glossary.js
  widgets/           2D interactive labs (canvas/SVG)
  three/             3D hero globe + the three games
  styles.css         design system
```
