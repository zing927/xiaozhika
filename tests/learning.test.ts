import { test } from "node:test";
import assert from "node:assert/strict";
import { cards, skills } from "../lib/cards";
import {
  decode,
  dayKey,
  initialState,
  mastery,
  queueFor,
  rate,
  schedule,
  undo,
  type Review,
} from "../lib/learning";
const review = (
  day: number,
  cardId = "addition-1",
  grade: Review["grade"] = "independent",
): Review => ({
  id: `${day}-${cardId}`,
  cardId,
  grade,
  at: new Date(Date.UTC(2026, 0, day, 12)).toISOString(),
  day: `2026-01-${String(day).padStart(2, "0")}`,
});
test("60 unique complete demo cards, ten per knowledge point", () => {
  assert.equal(cards.length, 60);
  assert.equal(new Set(cards.map((c) => c.id)).size, 60);
  for (const s of skills)
    assert.equal(cards.filter((c) => c.skill === s.id).length, 10);
  for (const c of cards) {
    assert.ok(c.question && c.answer && c.tip);
    if (c.skill === "addition" || c.skill === "subtraction") {
      const m = c.question.match(/(\d+) ([+−]) (\d+)/)!;
      const a = Number(m[1]),
        b = Number(m[3]);
      assert.equal(Number(c.answer), m[2] === "+" ? a + b : a - b);
      assert.ok(Number(c.answer) >= 0 && Number(c.answer) <= 10);
    }
    if (c.skill === "compare") {
      const m = c.question.match(/(\d+) 和 (\d+)/)!;
      assert.equal(
        c.answer,
        m[1] === m[2] ? "一样大" : String(Math.max(Number(m[1]), Number(m[2]))),
      );
    }
  }
});
test("Chinese card answers match checked reference tables", () => {
  const expected: Record<string, string[]> = {
    pinyin: [
      "ā（第一声）",
      "á（第二声）",
      "ǎ（第三声）",
      "à（第四声）",
      "b（声母）",
      "p（声母）",
      "m（声母）",
      "f（声母）",
      "mā（妈）",
      "bà（爸）",
    ],
    characters: [
      "shān",
      "shuǐ",
      "rì",
      "yuè",
      "rén",
      "kǒu",
      "shǒu",
      "tián",
      "huǒ",
      "mù",
    ],
    opposites: ["小", "少", "下", "右", "后", "矮", "短", "关", "去", "黑"],
  };
  for (const [skill, answers] of Object.entries(expected))
    assert.deepEqual(
      cards.filter((c) => c.skill === skill).map((c) => c.answer),
      answers,
    );
});
test("one success and repeated same-day successes cannot master", () => {
  assert.equal(mastery("addition", [review(1)]).mastered, false);
  assert.equal(
    mastery("addition", [
      review(1),
      review(1, "addition-2"),
      review(1),
      review(1),
    ]).mastered,
    false,
  );
});
test("all four requirements, including exact 14-day boundary", () => {
  const r = [review(1), review(3, "addition-2"), review(7), review(15)];
  assert.equal(mastery("addition", r).mastered, true);
  assert.equal(
    mastery("addition", [...r.slice(0, 3), review(14)]).mastered,
    false,
  );
  assert.equal(
    mastery("addition", [review(1), review(3), review(7), review(15)]).mastered,
    false,
  );
  assert.equal(mastery("subtraction", r).mastered, false);
});
test("last four include failures and hinted answers, and revoke mastered status", () => {
  const r = [review(1), review(3, "addition-2"), review(7), review(15)];
  for (const grade of ["again", "hint"] as const)
    assert.equal(
      mastery("addition", [...r, review(16, "addition-2", grade)]).status,
      "需巩固",
    );
});
test("intervals progress and reset; exact due boundary; overdue before new", () => {
  const start = Date.parse(review(1).at);
  assert.equal(schedule("addition-1", [review(1)]), start + 86400000);
  assert.equal(
    schedule("addition-1", [review(1), review(2)]),
    Date.parse(review(2).at) + 3 * 86400000,
  );
  assert.equal(
    schedule("addition-1", [review(1), review(2, "addition-1", "again")]),
    Date.parse(review(2).at) + 600000,
  );
  const s = initialState();
  s.reviews = [review(1)];
  assert.equal(queueFor(s, start + 86400000)[0], "addition-1");
  assert.ok(!queueFor(s, start).includes("addition-1"));
});
test("grade requires flip, is single use, supports pause and exact undo", () => {
  let s = initialState();
  s.session = {
    queue: ["addition-1", "addition-2"],
    index: 0,
    flipped: false,
    paused: false,
    reviewIds: [],
  };
  assert.deepEqual(rate(s, "again"), s);
  s.session.flipped = true;
  const before = structuredClone(s);
  const rated = rate(s, "independent", new Date("2026-01-01T12:00:00Z"), "r1");
  assert.equal(rated.session?.index, 1);
  assert.equal(rated.reviews.length, 1);
  assert.deepEqual(rate(rated, "again"), rated);
  assert.deepEqual(undo(rated), before);
  s.session.paused = true;
  assert.deepEqual(rate(s, "again"), s);
});
test("roundtrip persists active session, rejects corrupt storage", () => {
  const s = initialState();
  s.session = {
    queue: ["addition-1"],
    index: 0,
    flipped: true,
    paused: true,
    reviewIds: [],
  };
  assert.deepEqual(decode(JSON.stringify(s)), s);
  assert.deepEqual(decode(null), initialState());
  for (const value of [
    "{",
    "null",
    "{}",
    JSON.stringify({ ...s, version: 2 }),
    JSON.stringify({ ...s, session: { ...s.session, queue: ["missing"] } }),
  ])
    assert.throws(() => decode(value));
});
test("natural day uses local calendar", () => {
  const d = new Date(2026, 0, 2, 0, 1);
  assert.equal(dayKey(d), "2026-01-02");
});
