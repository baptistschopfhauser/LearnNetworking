// Pure game rules (no DOM, no three.js) — used by the 3D games and scripts/selftest.mjs.

/* ---------------- Subnet Blocks ---------------- */
/** Smallest prefix (within a /24) whose usable hosts cover `hosts`. */
export function prefixFor(hosts) {
  for (let p = 30; p >= 24; p--) if (2 ** (32 - p) - 2 >= hosts) return p;
  return null;
}
export const blockSize = (prefix) => 2 ** (32 - prefix);
/** A block of `size` addresses must start at a multiple of its size. */
export const alignedStart = (cell, size) => Math.floor(cell / size) * size;
/** used: array of [start, size]; true if [start, start+size) is free and inside the /24. */
export function fits(used, start, size) {
  if (start < 0 || start + size > 256 || start % size !== 0) return false;
  return used.every(([s, n]) => start + size <= s || s + n <= start);
}
/** Lowest free aligned start for a block, or -1 if it doesn't fit anywhere. */
export function firstFit(used, size) {
  for (let s = 0; s + size <= 256; s += size) if (fits(used, s, size)) return s;
  return -1;
}

/* ---------------- Network Builder ---------------- */
// devices: [{ id, type: 'pc'|'server'|'switch'|'router'|'internet' }], cables: [[idA, idB], ...]
export const PORTS = { pc: 1, server: 1, switch: 8, router: 4, internet: 2 };
export const COST = { switch: 30, router: 80, cable: 5 };

/** Why a cable can't be added, or null if it's allowed. */
export function cableError(devices, cables, a, b) {
  if (a === b) return 'self';
  const A = devices.find((d) => d.id === a), B = devices.find((d) => d.id === b);
  if (!A || !B) return 'missing';
  if (cables.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 'duplicate';
  const used = (id) => cables.filter(([x, y]) => x === id || y === id).length;
  if (used(a) >= PORTS[A.type] || used(b) >= PORTS[B.type]) return 'ports';
  if ((A.type === 'internet' && B.type !== 'router') || (B.type === 'internet' && A.type !== 'router')) return 'internet-needs-router';
  const end = (t) => t === 'pc' || t === 'server';
  if (end(A.type) && end(B.type)) return 'need-switch';
  return null;
}

function adjacency(devices, cables, skip = -1) {
  const adj = new Map(devices.map((d) => [d.id, []]));
  cables.forEach(([a, b], i) => { if (i !== skip) { adj.get(a)?.push(b); adj.get(b)?.push(a); } });
  return adj;
}
/** Set of device ids reachable from `from` (all layers). */
export function reachable(devices, cables, from, skip = -1) {
  const adj = adjacency(devices, cables, skip);
  const seen = new Set([from]), q = [from];
  while (q.length) for (const n of adj.get(q.shift()) || []) if (!seen.has(n)) { seen.add(n); q.push(n); }
  return seen;
}
/** Layer-2 segments: groups of pc/server/switch connected without crossing a router. */
export function segments(devices, cables) {
  const l2 = (id) => { const t = devices.find((d) => d.id === id)?.type; return t === 'pc' || t === 'server' || t === 'switch'; };
  const seen = new Set(), out = [];
  for (const d of devices) {
    if (!l2(d.id) || seen.has(d.id)) continue;
    const seg = [], q = [d.id]; seen.add(d.id);
    while (q.length) {
      const u = q.shift(); seg.push(u);
      for (const [a, b] of cables) {
        const v = a === u ? b : b === u ? a : null;
        if (v != null && l2(v) && !seen.has(v)) { seen.add(v); q.push(v); }
      }
    }
    out.push(seg);
  }
  return out;
}
/** Segment index of a device (pc/server/switch), or -1. */
export const segmentOf = (segs, id) => segs.findIndex((s) => s.includes(id));
/** A segment gets addresses (DHCP from a router) only if a router is cabled into it. */
export function segmentHasRouter(devices, cables, seg) {
  return cables.some(([a, b]) => (seg.includes(a) && devices.find((d) => d.id === b)?.type === 'router') || (seg.includes(b) && devices.find((d) => d.id === a)?.type === 'router'));
}
/** True if every device in `ids` can reach `target`, even after any single infrastructure cable fails. */
export function survivesAnyCableCut(devices, cables, ids, target) {
  const infra = (id) => ['switch', 'router', 'internet'].includes(devices.find((d) => d.id === id)?.type);
  return cables.every(([a, b], i) => !(infra(a) && infra(b)) || ids.every((id) => reachable(devices, cables, id, i).has(target)));
}
export const cost = (devices, cables) => devices.reduce((s, d) => s + (d.placed ? COST[d.type] || 0 : 0), 0) + cables.length * COST.cable;
