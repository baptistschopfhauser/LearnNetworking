import { store } from './core.js';

// Leitner box system. A card id is 'g:<english glossary term>' or 'q:<moduleId>:<question index>'.
// Box 1 = review again today, box 5 = long-term memory.
export const INTERVAL_DAYS = [0, 0, 1, 3, 7, 16]; // index = box
const DAY = 86400000;
export const DAILY_GOAL = 20;
export const NEW_PER_DAY = 10;

/** Pure: next card state after an answer. */
export function grade(card, ok, now = Date.now()) {
  const box = ok ? Math.min(5, (card?.box || 1) + 1) : 1; // a new card known at once skips to box 2
  return { box, due: now + INTERVAL_DAYS[box] * DAY };
}
/** Pure: is this card due at `now`? */
export const isDue = (card, now = Date.now()) => !!card && card.due <= now;
export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

const cards = () => store.get().cards;

/** Put a card back to box 1, due now (used for every mistake in quizzes and games). */
export function flag(id) {
  cards()[id] = { box: 1, due: Date.now() };
  store.save();
}

export function answer(id, ok) {
  const st = store.get();
  st.cards[id] = grade(st.cards[id], ok);
  const d = today();
  if (st.daily.date !== d) st.daily = { date: d, count: 0, fresh: 0 };
  st.daily.count++;
  // streak: consecutive calendar days with at least one review
  if (st.streak.last !== d) {
    const yesterday = today(Date.now() - DAY);
    st.streak = { days: st.streak.last === yesterday ? st.streak.days + 1 : 1, last: d };
  }
  store.save();
}

export const dueIds = (now = Date.now()) => Object.entries(cards()).filter(([, c]) => isDue(c, now)).map(([id]) => id);

/** New cards allowed today (from a candidate list of ids not yet in the deck). */
export function freshIds(candidates) {
  const st = store.get();
  const used = st.daily.date === today() ? st.daily.fresh || 0 : 0;
  return candidates.filter((id) => !st.cards[id]).slice(0, Math.max(0, NEW_PER_DAY - used));
}
export function markFresh() {
  const st = store.get();
  if (st.daily.date !== today()) st.daily = { date: today(), count: 0, fresh: 0 };
  st.daily.fresh = (st.daily.fresh || 0) + 1;
}
export const learnedCount = () => Object.values(cards()).filter((c) => c.box >= 3).length;
