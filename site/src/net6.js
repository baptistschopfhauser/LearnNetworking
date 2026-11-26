// Pure IPv6 helpers (no DOM) — used by the IPv6 lesson widget and scripts/selftest.mjs.

/** Expand any valid IPv6 text form to 8 groups of 4 lowercase hex digits, or null if invalid. */
export function expand6(text) {
  const s = String(text).trim().toLowerCase();
  if (!/^[0-9a-f:]+$/.test(s) || s.includes(':::') || (s.match(/::/g) || []).length > 1) return null;
  const [head, tail] = s.includes('::') ? s.split('::') : [s, null];
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  if ([...h, ...t].some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const missing = 8 - h.length - t.length;
  if (tail === null ? missing !== 0 : missing < 1) return null;
  return [...h, ...Array(tail === null ? 0 : missing).fill('0'), ...t].map((g) => g.padStart(4, '0'));
}

/** RFC 5952 canonical form: drop leading zeros, replace the longest run (≥2) of zero groups with ::. */
export function compress6(groups) {
  const g = groups.map((x) => parseInt(x, 16).toString(16));
  let best = -1, bestLen = 1, i = 0;
  while (i < 8) {
    if (g[i] !== '0') { i++; continue; }
    let j = i;
    while (j < 8 && g[j] === '0') j++;
    if (j - i > bestLen) { best = i; bestLen = j - i; } // strictly longer: first run wins ties
    i = j;
  }
  if (best < 0) return g.join(':');
  return `${g.slice(0, best).join(':')}::${g.slice(best + bestLen).join(':')}`;
}

/** Modified EUI-64: MAC aa:bb:cc:dd:ee:ff → interface id (4 groups); flips the universal/local bit. */
export function eui64(mac) {
  const b = String(mac).toLowerCase().split(/[:-]/);
  if (b.length !== 6 || b.some((x) => !/^[0-9a-f]{2}$/.test(x))) return null;
  const bytes = [b[0], b[1], b[2], 'ff', 'fe', b[3], b[4], b[5]].map((x) => parseInt(x, 16));
  bytes[0] ^= 0x02;
  const hex = bytes.map((x) => x.toString(16).padStart(2, '0'));
  return [0, 2, 4, 6].map((k) => hex[k] + hex[k + 1]);
}
