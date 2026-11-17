export type Subject = "语文" | "数学";
export type Card = {
  id: string;
  skill: string;
  subject: Subject;
  question: string;
  answer: string;
  tip: string;
};
export const skills = [
  { id: "addition", name: "10以内加法", subject: "数学" },
  { id: "subtraction", name: "10以内减法", subject: "数学" },
  { id: "compare", name: "数的大小", subject: "数学" },
  { id: "pinyin", name: "基础拼音", subject: "语文" },
  { id: "characters", name: "常用字认读", subject: "语文" },
  { id: "opposites", name: "反义词", subject: "语文" },
] as const;
const make = (skill: string, rows: string[][]): Card[] =>
  rows.map(([question, answer, tip], i) => ({
    id: `${skill}-${i + 1}`,
    skill,
    subject: skills.find((s) => s.id === skill)!.subject,
    question,
    answer,
    tip,
  }));
export const cards: Card[] = [
  ...make(
    "addition",
    Array.from({ length: 10 }, (_, i) => {
      const a = (i % 5) + 1,
        b = Math.floor(i / 5) + 1;
      return [
        `${a} + ${b} = ?`,
        String(a + b),
        "可以用小棒或手指帮助理解合在一起。",
      ];
    }),
  ),
  ...make(
    "subtraction",
    Array.from({ length: 10 }, (_, i) => {
      const a = i + 1,
        b = (i % 3) + 1;
      const n = Math.min(a, b);
      return [
        `${a} − ${n} = ?`,
        String(a - n),
        "从总数里拿走一部分，还剩多少？",
      ];
    }),
  ),
  ...make(
    "compare",
    Array.from({ length: 10 }, (_, i) => [
      `${i} 和 ${10 - i}，哪个大？`,
      i === 5 ? "一样大" : String(Math.max(i, 10 - i)),
      "可以在数轴上比较，越往右的数越大。",
    ]),
  ),
  ...make("pinyin", [
    ["读一读：ā", "ā（第一声）", "第一声平平的。"],
    ["读一读：á", "á（第二声）", "第二声往上扬。"],
    ["读一读：ǎ", "ǎ（第三声）", "第三声先降再升。"],
    ["读一读：à", "à（第四声）", "第四声往下降。"],
    ["读一读：b", "b（声母）", "轻而短地读，可联系“玻”。"],
    ["读一读：p", "p（声母）", "轻而短地读，可联系“坡”。"],
    ["读一读：m", "m（声母）", "轻而短地读，可联系“摸”。"],
    ["读一读：f", "f（声母）", "轻而短地读，可联系“佛”的声母。"],
    ["拼一拼：mā", "mā（妈）", "m 和 ā 连起来。"],
    ["拼一拼：bà", "bà（爸）", "b 和 à 连起来。"],
  ]),
  ...make(
    "characters",
    [
      ["山", "shān", "高高的山。"],
      ["水", "shuǐ", "喝水的水。"],
      ["日", "rì", "日表示太阳，也可以表示一天。"],
      ["月", "yuè", "月亮的月。"],
      ["人", "rén", "人们的人。"],
      ["口", "kǒu", "口可以表示嘴。"],
      ["手", "shǒu", "小手的手。"],
      ["田", "tián", "田地的田。"],
      ["火", "huǒ", "火苗的火。"],
      ["木", "mù", "树木的木。"],
    ].map(([q, a, t]) => [`读一读这个字：${q}`, a, t]),
  ),
  ...make(
    "opposites",
    [
      ["大", "小"],
      ["多", "少"],
      ["上", "下"],
      ["左", "右"],
      ["前", "后"],
      ["高", "矮"],
      ["长", "短"],
      ["开", "关"],
      ["来", "去"],
      ["白", "黑"],
    ].map(([a, b]) => [
      `说出“${a}”的反义词。`,
      b,
      `可以联系生活中“${a}”和“${b}”的情景。`,
    ]),
  ),
];
