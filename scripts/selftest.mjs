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
