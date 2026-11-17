import { cards } from "./cards";
export type Grade = "again" | "hint" | "independent";
export type Review = {
  id: string;
  cardId: string;
  grade: Grade;
  at: string;
  day: string;
};
export type Session = {
  queue: string[];
  index: number;
  flipped: boolean;
  paused: boolean;
  reviewIds: string[];
};
export type State = {
  version: 1;
  reviews: Review[];
  session: Session | null;
  settings: { subject: string; count: number };
};
export const initialState = (): State => ({
  version: 1,
  reviews: [],
  session: null,
  settings: { subject: "全部", count: 10 },
});
export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86400000;
export function mastery(skill: string, reviews: Review[]) {
  const ids = new Set(cards.filter((c) => c.skill === skill).map((c) => c.id));
  const history = reviews
    .filter((r) => ids.has(r.cardId))
    .sort((a, b) => a.at.localeCompare(b.at));
  const successes = history.filter((r) => r.grade === "independent");
  const days = new Set(successes.map((r) => r.day));
  const distinctCards = new Set(successes.map((r) => r.cardId)).size;
  const span = successes.length
    ? Math.max(...successes.map((r) => dayNumber(r.day))) -
      Math.min(...successes.map((r) => dayNumber(r.day)))
    : 0;
  const recent = history.slice(-4);
  const mastered =
    days.size >= 4 &&
    recent.length === 4 &&
    recent.every((r) => r.grade === "independent") &&
    distinctCards >= 2 &&
    span >= 14;
  return {
    status: mastered
      ? "已掌握"
      : history.length === 0
        ? "未开始"
        : history.at(-1)!.grade !== "independent"
          ? "需巩固"
          : "积累中",
    days: days.size,
    distinctCards,
    span,
    recent: recent.filter((r) => r.grade === "independent").length,
    mastered,
  };
}
export function schedule(cardId: string, reviews: Review[]) {
  const history = reviews.filter((r) => r.cardId === cardId);
  let streak = 0,
    due = 0;
  for (const r of history) {
    streak = r.grade === "independent" ? streak + 1 : 0;
    const delay =
      r.grade === "again"
        ? 10 * 60000
        : r.grade === "hint"
          ? 86400000
          : [1, 3, 7, 14, 30][Math.min(streak - 1, 4)] * 86400000;
    due = Date.parse(r.at) + delay;
  }
  return due;
}
export function queueFor(state: State, now: number) {
  return cards
    .filter(
      (c) =>
        state.settings.subject === "全部" ||
        c.subject === state.settings.subject,
    )
    .filter((c) => schedule(c.id, state.reviews) <= now)
    .sort((a, b) => {
      const ad = schedule(a.id, state.reviews),
        bd = schedule(b.id, state.reviews);
      return (
        (ad === 0 ? 1 : 0) - (bd === 0 ? 1 : 0) ||
        ad - bd ||
        a.id.localeCompare(b.id)
      );
    })
    .slice(0, state.settings.count)
    .map((c) => c.id);
}
export function rate(
  state: State,
  grade: Grade,
  date = new Date(),
  id = crypto.randomUUID(),
): State {
  const s = state.session;
  if (!s || s.paused || !s.flipped || s.index >= s.queue.length) return state;
  const review: Review = {
    id,
    cardId: s.queue[s.index],
    grade,
    at: date.toISOString(),
    day: dayKey(date),
  };
  return {
    ...state,
    reviews: [...state.reviews, review],
    session: {
      ...s,
      index: s.index + 1,
      flipped: false,
      reviewIds: [...s.reviewIds, id],
    },
  };
}
export function undo(state: State): State {
  const s = state.session;
  const id = s?.reviewIds.at(-1);
  if (!s || !id) return state;
  return {
    ...state,
    reviews: state.reviews.filter((r) => r.id !== id),
    session: {
      ...s,
      index: s.index - 1,
      flipped: true,
      reviewIds: s.reviewIds.slice(0, -1),
    },
  };
}
export const storageKey = "xiaozhika:v1";
export function decode(raw: string | null): State {
  if (!raw) return initialState();
  const v = JSON.parse(raw) as State;
  const grades = ["again", "hint", "independent"];
  const known = (id: unknown) =>
    typeof id === "string" && cards.some((c) => c.id === id);
  if (
    v.version !== 1 ||
    !Array.isArray(v.reviews) ||
    !v.reviews.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        known(r.cardId) &&
        grades.includes(r.grade) &&
        Number.isFinite(Date.parse(r.at)) &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.day),
    ) ||
    !v.settings ||
    !["全部", "语文", "数学"].includes(v.settings.subject) ||
    ![5, 10, 20].includes(v.settings.count)
  )
    throw Error("记录格式不正确");
  const s = v.session;
  if (
    s &&
    (!Array.isArray(s.queue) ||
      !s.queue.every(known) ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index > s.queue.length ||
      typeof s.paused !== "boolean" ||
      typeof s.flipped !== "boolean" ||
      !Array.isArray(s.reviewIds) ||
      s.reviewIds.length !== s.index ||
      !s.reviewIds.every((id) => v.reviews.some((r) => r.id === id)))
  )
    throw Error("训练记录格式不正确");
  return v;
}
