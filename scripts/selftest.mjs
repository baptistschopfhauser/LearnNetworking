// Self-checks for pure logic: node scripts/selftest.mjs
import assert from 'node:assert/strict';
import { grade, isDue, INTERVAL_DAYS } from '../site/src/srs.js';

const DAY = 86400000, t = 1_700_000_000_000;
// Leitner: correct answers climb boxes, a miss drops to box 1 and is due immediately
let c = grade(undefined, true, t); assert.equal(c.box, 2); assert.ok(!isDue(c, t));
c = grade(undefined, false, t); assert.equal(c.box, 1); assert.ok(isDue(c, t));
c = grade(c, true, t); assert.equal(c.box, 2); assert.equal(c.due, t + INTERVAL_DAYS[2] * DAY);
c = grade(grade(grade(grade(c, true, t), true, t), true, t), true, t); assert.equal(c.box, 5);
assert.ok(!isDue(c, t + 15 * DAY)); assert.ok(isDue(c, t + 16 * DAY));
c = grade(c, false, t); assert.equal(c.box, 1); assert.ok(isDue(c, t));
console.log('selftest: srs ok');

import { expand6, compress6, eui64 } from '../site/src/net6.js';
assert.deepEqual(expand6('2001:db8::1'), ['2001', '0db8', '0000', '0000', '0000', '0000', '0000', '0001']);
assert.deepEqual(expand6('::'), Array(8).fill('0000'));
assert.equal(expand6('2001:db8::1::2'), null);           // two ::
assert.equal(expand6('2001:db8:0:0:0:0:0:0:1'), null);   // 9 groups
assert.equal(expand6('12345::1'), null);                 // 5 hex digits
assert.equal(expand6('1:2:3:4:5:6:7::8'), null);         // :: must replace at least one group
assert.equal(compress6(expand6('2001:0db8:0000:0000:0000:ff00:0042:8329')), '2001:db8::ff00:42:8329');
assert.equal(compress6(expand6('2001:db8:0:1:0:0:0:1')), '2001:db8:0:1::1');   // longest run wins
assert.equal(compress6(expand6('2001:0:0:1:0:0:1:1')), '2001::1:0:0:1:1');      // tie → first run
assert.equal(compress6(expand6('2001:db8:1:1:1:1:0:1')), '2001:db8:1:1:1:1:0:1'); // single 0 stays
assert.equal(compress6(expand6('::1')), '::1');
assert.equal(compress6(expand6('fe80::')), 'fe80::');
assert.deepEqual(eui64('00:1a:2b:3c:4d:5e'), ['021a', '2bff', 'fe3c', '4d5e']);
assert.equal(eui64('00:1a:2b'), null);
console.log('selftest: ipv6 ok');

// course data: German lessons mirror English ones; every embedded widget exists
import { MODULES_EN } from '../site/src/data/modules.en.js';
import { MODULES_DE } from '../site/src/data/modules.de.js';
import { WIDGETS } from '../site/src/widgets/index.js';
const enById = Object.fromEntries(MODULES_EN.map((m) => [m.id, m]));
for (const m of [...MODULES_EN, ...MODULES_DE]) {
  for (const [, w] of m.body.matchAll(/data-widget="([\w-]+)"/g)) assert.ok(WIDGETS[w], `${m.id}: unknown widget ${w}`);
  m.quiz.forEach((q) => assert.ok(q.c >= 0 && q.c < q.a.length, `${m.id}: bad answer index`));
}
for (const de of MODULES_DE) {
  const en = enById[de.id];
  assert.ok(en, `German lesson ${de.id} has no English twin`);
  assert.equal(de.level, en.level, `${de.id}: level differs`);
  assert.equal(de.quiz.length, en.quiz.length, `${de.id}: quiz length differs`);
  de.quiz.forEach((q, i) => assert.equal(q.c, en.quiz[i].c, `${de.id}: answer ${i} differs`));
  assert.equal((de.body.match(/data-widget/g) || []).length, (en.body.match(/data-widget/g) || []).length, `${de.id}: widget count differs`);
}
console.log(`selftest: course ok (${MODULES_EN.length} lessons, ${MODULES_DE.length} in German)`);

import * as G from '../site/src/gamelogic.js';
// subnet blocks
assert.equal(G.prefixFor(100), 25); assert.equal(G.prefixFor(126), 25); assert.equal(G.prefixFor(127), 24);
assert.equal(G.prefixFor(50), 26); assert.equal(G.prefixFor(2), 30); assert.equal(G.prefixFor(14), 28); assert.equal(G.prefixFor(15), 27);
assert.equal(G.alignedStart(77, 32), 64);
assert.ok(G.fits([], 64, 64)); assert.ok(!G.fits([], 32, 64));          // misaligned
assert.ok(!G.fits([[0, 128]], 64, 64)); assert.ok(G.fits([[0, 128]], 128, 64));
assert.ok(!G.fits([], 224, 64));                                          // past the end
assert.equal(G.firstFit([[0, 128], [128, 64]], 64), 192); assert.equal(G.firstFit([[0, 128], [128, 128]], 4), -1);
// network builder
const dev = [{ id: 1, type: 'pc' }, { id: 2, type: 'pc' }, { id: 3, type: 'switch' }, { id: 4, type: 'router' }, { id: 5, type: 'internet' }, { id: 6, type: 'server' }];
assert.equal(G.cableError(dev, [], 1, 2), 'need-switch');
assert.equal(G.cableError(dev, [], 3, 5), 'internet-needs-router');
assert.equal(G.cableError(dev, [[1, 3]], 1, 4), 'ports');                // a PC has one port
assert.equal(G.cableError(dev, [[1, 3]], 3, 1), 'duplicate');
assert.equal(G.cableError(dev, [], 1, 3), null);
const cab = [[1, 3], [2, 3], [3, 4], [4, 5], [6, 4]];
assert.ok(G.reachable(dev, cab, 1).has(5));
const segs = G.segments(dev, cab);
assert.equal(segs.length, 2);                                              // LAN behind the switch, server alone
assert.notEqual(G.segmentOf(segs, 1), G.segmentOf(segs, 6));
assert.ok(G.segmentHasRouter(dev, cab, segs[G.segmentOf(segs, 1)]));
assert.ok(!G.survivesAnyCableCut(dev, cab, [1, 2], 5));                    // single uplink
const dev2 = [...dev, { id: 7, type: 'router' }];
assert.ok(G.survivesAnyCableCut(dev2, [...cab, [3, 7], [7, 5]], [1, 2], 5)); // second router + uplink
console.log('selftest: game logic ok');
