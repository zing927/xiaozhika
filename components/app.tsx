"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cards, skills } from "@/lib/cards";
import {
  decode,
  dayKey,
  initialState,
  mastery,
  queueFor,
  rate,
  storageKey,
  undo,
  type Grade,
  type State,
} from "@/lib/learning";
const navigation = [
  ["/", "首页", "⌂"],
  ["/train", "抽卡训练", "▱"],
  ["/map", "知识地图", "◈"],
  ["/report", "学习报告", "▥"],
  ["/settings", "设置", "⚙"],
];
export default function App({
  page,
}: {
  page: "home" | "train" | "map" | "report" | "settings";
}) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(true);
  const [clock, setClock] = useState(() => Date.now());
  const guard = useRef(false);
  useEffect(() => {
    try {
      setState(decode(localStorage.getItem(storageKey)));
    } catch {
      setError(
        "无法读取本机记录。原数据已保留，请先在设置中导出原始记录，再清除重置。",
      );
      setSaved(false);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  function update(next: State) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setState(next);
      setSaved(true);
      setError("");
    } catch {
      setSaved(false);
      setError("保存失败，记录未变更。请检查浏览器存储空间或隐私设置后重试。");
    }
  }
  const today = dayKey(new Date(clock));
  const todayReviews = state.reviews.filter((r) => r.day === today);
  const mastered = skills.filter(
    (s) => mastery(s.id, state.reviews).mastered,
  ).length;
  const due = queueFor(
    { ...state, settings: { ...state.settings, count: 20 } },
    clock,
  );
  const session = state.session;
  const card = session
    ? cards.find((c) => c.id === session.queue[session.index])
    : undefined;
  function start() {
    const queue = queueFor(state, Date.now());
    if (queue.length)
      update({
        ...state,
        session: {
          queue,
          index: 0,
          paused: false,
          flipped: false,
          reviewIds: [],
        },
      });
  }
  function grade(g: Grade) {
    if (guard.current) return;
    guard.current = true;
    update(rate(state, g));
    setTimeout(() => {
      guard.current = false;
    }, 250);
  }
  function exportData(raw = false) {
    const data = raw
      ? localStorage.getItem(storageKey) || "{}"
      : JSON.stringify(state, null, 2);
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `xiaozhika-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="logo">知</span>
          <span>
            小知卡<small>每天一点，慢慢掌握</small>
          </span>
        </Link>
        <div className="sidebar-label">陪伴孩子的每一小步</div>
        <nav aria-label="主导航">
          {navigation.map(([href, label, icon], i) => (
            <Link
              key={href}
              href={href}
              aria-current={
                ["home", "train", "map", "report", "settings"][i] === page
                  ? "page"
                  : undefined
              }
            >
              <span aria-hidden>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="parent-note">
          <span>✦</span>
          <strong>陪伴，比进度更重要</strong>
          <p>不急着答对，给孩子一点思考的时间。</p>
          <small>一年级 · 家长陪练版</small>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            一年级成长手册{" "}
            <span className="subtle">
              /{" "}
              {
                navigation[
                  ["home", "train", "map", "report", "settings"].indexOf(page)
                ][1]
              }
            </span>
          </span>
          <span className="local-badge">
            ● {saved ? "本机保存" : "存储异常"}
          </span>
        </header>
        {!ready ? (
          <div className="panel">正在读取学习记录…</div>
        ) : (
          <>
            {error && (
              <div role="alert" className="alert">
                {error}
              </div>
            )}
            {page === "home" && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">LITTLE STEPS, BIG GROWTH</div>
                    <h1>
                      每天一小步，知识更牢固<span className="sun">✺</span>
                    </h1>
                    <p>给孩子一点时间，让每一次「我会了」都有迹可循。</p>
                  </div>
                  <span className="date">
                    {new Date(clock).toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </span>
                </div>
                <section className="hero">
                  <div>
                    <span className="pill">✦ 今天，陪孩子练一练</span>
                    <h2>
                      一张小卡片，
                      <br />
                      一个新的「我会了」。
                    </h2>
                    <p>
                      你来展示卡片，孩子想一想、说一说。
                      <br />
                      翻卡核对答案，再记录真实的掌握情况。
                    </p>
                    <Link className="button primary" href="/train">
                      {session && session.index < session.queue.length
                        ? "继续上次训练"
                        : "开始今日陪练"}{" "}
                      <span>→</span>
                    </Link>
                    <small>
                      每次 {state.settings.count} 张 · 不计时，不排名
                    </small>
                  </div>
                  <div className="hero-art" aria-hidden>
                    <span className="spark spark-one">✧</span>
                    <div className="art-card behind">a o e</div>
                    <div className="art-card front">
                      <span>想一想 · 数学</span>
                      <strong>3 + 2 = ?</strong>
                      <i>每一点进步，都值得看见</i>
                    </div>
                    <span className="spark spark-two">✺</span>
                    <span className="art-sticker">
                      慢慢来
                      <br />
                      你可以的！
                    </span>
                  </div>
                </section>
                <section className="stats" aria-label="学习概览">
                  <Stat
                    label="今日已练"
                    value={todayReviews.length}
                    unit="张"
                    note="每一次练习，都是积累"
                  />
                  <Stat
                    label="当前可练"
                    value={due.length}
                    unit="张"
                    note="优先复习，再认识新知识"
                  />
                  <Stat
                    label="已掌握知识点"
                    value={mastered}
                    unit={`/ ${skills.length}`}
                    note="多次、多日答对才算掌握"
                  />
                </section>
                <div className="section-title">
                  <h2>知识的小树，慢慢长大</h2>
                  <Link href="/map">查看知识地图 →</Link>
                </div>
                <div className="subject-grid">
                  {(["语文", "数学"] as const).map((subject, i) => (
                    <section className="panel subject" key={subject}>
                      <span className={`subject-icon color-${i}`}>
                        {i ? "＋" : "文"}
                      </span>
                      <div>
                        <h3>{subject}探索</h3>
                        <p>
                          {i
                            ? "从数字出发，发现思考的乐趣"
                            : "从读音到字词，积累表达的力量"}
                        </p>
                        <div className="tags">
                          {skills
                            .filter((s) => s.subject === subject)
                            .map((s) => (
                              <span key={s.id}>{s.name}</span>
                            ))}
                        </div>
                      </div>
                      <Link aria-label={`查看${subject}知识地图`} href="/map">
                        ↗
                      </Link>
                    </section>
                  ))}
                </div>
                <div className="gentle-note">
                  ♡{" "}
                  <span>
                    <strong>一次答对，是好的开始。</strong>{" "}
                    我们更关心孩子能否在不同日子、不同题目里独立答对。
                  </span>
                </div>
              </>
            )}
            {page === "train" && (
              <>
                <Heading
                  title="抽一张，想一想"
                  text="家长展示题目 → 孩子回答 → 翻卡核对 → 家长评分"
                />
                <div className="training-wrap">
                  {!session ? (
                    <section className="panel empty">
                      <span className="big-icon">▱</span>
                      <h2>准备好今天的小练习了吗？</h2>
                      <p>
                        {state.settings.subject} · 最多 {state.settings.count}{" "}
                        张 · 到期复习优先
                      </p>
                      <p>演示题卡，无计时压力。请让孩子先回答再翻卡。</p>
                      <button
                        className="button primary"
                        onClick={start}
                        disabled={!due.length || !saved}
                      >
                        {due.length ? "开始抽卡" : "暂时没有到期卡片，稍后再来"}
                      </button>
                      <Link href="/settings">调整科目和数量 →</Link>
                    </section>
                  ) : (
                    <>
                      <div className="training-meta">
                        <span>
                          {session.index >= session.queue.length
                            ? "本次已完成"
                            : `第 ${session.index + 1} / ${session.queue.length} 张`}
                        </span>
                        <button
                          className="text-button"
                          disabled={session.index >= session.queue.length}
                          onClick={() =>
                            update({
                              ...state,
                              session: { ...session, paused: !session.paused },
                            })
                          }
                        >
                          {session.paused ? "恢复训练" : "暂停训练"}
                        </button>
                      </div>
                      <progress
                        aria-label="本次训练进度"
                        value={session.index}
                        max={session.queue.length}
                      />
                      {session.index >= session.queue.length ? (
                        <section className="panel empty">
                          <span className="big-icon">✦</span>
                          <h2>今天的这一小步，完成了！</h2>
                          <p>
                            已练 {session.queue.length}{" "}
                            张。休息一下，明天再巩固。
                          </p>
                          <Link href="/report" className="button primary">
                            查看学习报告 →
                          </Link>
                          <button
                            className="text-button"
                            onClick={() => update({ ...state, session: null })}
                          >
                            结束本次训练
                          </button>
                        </section>
                      ) : session.paused ? (
                        <section className="panel empty">
                          <span className="big-icon">Ⅱ</span>
                          <h2>休息一下，随时回来</h2>
                          <p>进度已保存在本机，刷新或离开页面也可以继续。</p>
                          <button
                            className="button primary"
                            onClick={() =>
                              update({
                                ...state,
                                session: { ...session, paused: false },
                              })
                            }
                          >
                            恢复训练
                          </button>
                        </section>
                      ) : (
                        card && (
                          <>
                            <section
                              className={`question-card ${session.flipped ? "answer" : ""}`}
                              aria-live="polite"
                            >
                              <div className="card-meta">
                                <span>
                                  {card.subject} ·{" "}
                                  {
                                    skills.find((s) => s.id === card.skill)
                                      ?.name
                                  }
                                </span>
                                <span>
                                  {session.flipped ? "答案面" : "题目面"}
                                </span>
                              </div>
                              <p className="card-instruction">
                                {session.flipped
                                  ? "一起核对答案"
                                  : "请孩子想一想，再说出答案"}
                              </p>
                              <h2>
                                {session.flipped ? card.answer : card.question}
                              </h2>
                              {session.flipped ? (
                                <p className="tip">陪练提示：{card.tip}</p>
                              ) : (
                                <button
                                  className="button primary"
                                  onClick={() =>
                                    update({
                                      ...state,
                                      session: { ...session, flipped: true },
                                    })
                                  }
                                >
                                  翻卡看答案 ↻
                                </button>
                              )}
                            </section>
                            {session.flipped ? (
                              <div className="grading">
                                <p>
                                  孩子刚才的回答是？
                                  <small>
                                    请按翻卡前的表现评分，选择后自动下一张
                                  </small>
                                </p>
                                <div>
                                  <button
                                    onClick={() => grade("again")}
                                    className="grade again"
                                  >
                                    还不会<small>10 分钟后复习</small>
                                  </button>
                                  <button
                                    onClick={() => grade("hint")}
                                    className="grade hint"
                                  >
                                    提示后会<small>1 天后复习</small>
                                  </button>
                                  <button
                                    onClick={() => grade("independent")}
                                    className="grade independent"
                                  >
                                    独立会<small>按间隔安排复习</small>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="center subtle">
                                先让孩子回答，翻卡后才能记录表现。
                              </p>
                            )}
                          </>
                        )
                      )}
                      <div className="session-actions">
                        <button
                          className="text-button"
                          disabled={!session.reviewIds.length}
                          onClick={() => update(undo(state))}
                        >
                          ↶ 撤销上次评分
                        </button>
                        <span className="subtle">进度自动保存在此浏览器</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {page === "map" && (
              <>
                <Heading
                  title="看见知识慢慢扎根"
                  text="六个演示知识点，每一次练习都在积累。掌握不是一次答对。"
                />
                <div className="legend">
                  ○ 未开始　◐ 积累中　↻ 需巩固　✦ 已掌握
                </div>
                <div className="knowledge-grid">
                  {skills.map((s) => {
                    const m = mastery(s.id, state.reviews);
                    return (
                      <section key={s.id} className="panel knowledge">
                        <div className="card-meta">
                          <span>{s.subject} · 10 张卡片</span>
                          <span
                            className={`status ${m.mastered ? "mastered" : ""}`}
                          >
                            {m.status}
                          </span>
                        </div>
                        <h2>{s.name}</h2>
                        <div className="mini-progress">
                          <span
                            style={{
                              width: `${Math.min(m.days / 4, 1) * 100}%`,
                            }}
                          />
                        </div>
                        <ul className="criteria">
                          <li>
                            独立成功自然日 <b>{m.days} / 4</b>
                          </li>
                          <li>
                            最近四次独立正确 <b>{m.recent} / 4</b>
                          </li>
                          <li>
                            独立正确不同题卡 <b>{m.distinctCards} / 2</b>
                          </li>
                          <li>
                            首次至最后成功跨度 <b>{m.span} / 14 天</b>
                          </li>
                        </ul>
                      </section>
                    );
                  })}
                </div>
                <Rule />
              </>
            )}
            {page === "report" && (
              <>
                <Heading
                  title="小小进步，值得被看见"
                  text="根据家长评分记录，了解孩子当前需要怎样的陪伴。"
                />
                <section className="stats">
                  <Stat
                    label="累计练习"
                    value={state.reviews.length}
                    unit="次"
                    note="含复习与重复练习"
                  />
                  <Stat
                    label="练习自然日"
                    value={new Set(state.reviews.map((r) => r.day)).size}
                    unit="天"
                    note="同一天练多次只计一天"
                  />
                  <Stat
                    label="独立正确"
                    value={
                      state.reviews.filter((r) => r.grade === "independent")
                        .length
                    }
                    unit="次"
                    note="提示后会不计为独立正确"
                  />
                </section>
                <section className="panel">
                  <h2>接下来，重点陪伴</h2>
                  <div className="report-skills">
                    {skills.map((s) => (
                      <div key={s.id}>
                        <span>{s.name}</span>
                        <span className="status">
                          {mastery(s.id, state.reviews).status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="subtle">
                    优先复习「需巩固」的知识点。独立会也会继续安排间隔复习。
                  </p>
                </section>
                <section className="panel history">
                  <h2>最近的练习</h2>
                  {!state.reviews.length ? (
                    <p className="subtle">
                      还没有练习记录，和孩子从第一张卡片开始吧。
                    </p>
                  ) : (
                    <ol>
                      {state.reviews
                        .slice(-20)
                        .reverse()
                        .map((r) => (
                          <li key={r.id}>
                            <div>
                              <strong>
                                {cards.find((c) => c.id === r.cardId)?.question}
                              </strong>
                              <small>
                                {new Date(r.at).toLocaleString("zh-CN")}
                              </small>
                            </div>
                            <span
                              className={`status ${r.grade === "independent" ? "mastered" : ""}`}
                            >
                              {
                                {
                                  again: "还不会",
                                  hint: "提示后会",
                                  independent: "独立会",
                                }[r.grade]
                              }
                            </span>
                          </li>
                        ))}
                    </ol>
                  )}
                </section>
                <Rule />
              </>
            )}
            {page === "settings" && (
              <>
                <Heading
                  title="让陪练适合你们"
                  text="少量、持续的练习，比一次练很多更有帮助。"
                />
                <section className="panel settings">
                  <h2>训练偏好</h2>
                  <label>
                    练习科目
                    <select
                      value={state.settings.subject}
                      onChange={(e) =>
                        update({
                          ...state,
                          settings: {
                            ...state.settings,
                            subject: e.target.value,
                          },
                        })
                      }
                    >
                      {["全部", "语文", "数学"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    每次卡片数量
                    <select
                      value={state.settings.count}
                      onChange={(e) =>
                        update({
                          ...state,
                          settings: {
                            ...state.settings,
                            count: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[5, 10, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} 张
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="subtle">
                    设置在下一次新训练生效；正在进行的训练会保留。
                  </p>
                </section>
                <section className="panel settings">
                  <h2>本机数据</h2>
                  <p>
                    无需登录。学习记录只保存在当前浏览器，不会自动跨设备同步。请定期导出备份。
                  </p>
                  <div className="settings-actions">
                    <button className="button" onClick={() => exportData()}>
                      导出学习记录
                    </button>
                    <button className="button" onClick={() => exportData(true)}>
                      导出原始记录
                    </button>
                    <button
                      className="button danger"
                      onClick={() => {
                        if (
                          confirm(
                            "确定清除本机全部学习记录和训练进度？此操作无法撤销，请先导出备份。",
                          )
                        )
                          update(initialState());
                      }}
                    >
                      清除全部记录
                    </button>
                  </div>
                </section>
                <section className="panel">
                  <h2>关于小知卡 · 第一阶段 MVP</h2>
                  <p>
                    面向一年级家长的陪练工具。当前包含 60
                    张原创演示题卡，覆盖语文、数学各 30
                    张，供功能体验与家庭练习参考。
                  </p>
                  <p>
                    <strong>
                      这不是官方完整教材，也不代表任何教材版本的完整知识范围。
                    </strong>{" "}
                    请结合孩子实际学情与学校教学选择内容。
                  </p>
                  <p className="subtle">
                    演示题库校验：算术结果与边界自动测试；拼音、字音、反义词逐条核对，详见
                    README。
                  </p>
                </section>
                <Rule />
              </>
            )}
            <footer>
              小知卡 · 陪孩子，把知识一点点变成自己的{" "}
              <span>原创演示题库 · 非官方完整教材</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">GROW A LITTLE EVERY DAY</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: number;
  unit: string;
  note: string;
}) {
  return (
    <section className="panel stat">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <b>{unit}</b>
      </div>
      <small>{note}</small>
    </section>
  );
}
function Rule() {
  return (
    <div className="gentle-note">
      ✦{" "}
      <span>
        <strong>怎样才算已掌握？</strong> 至少 4 个不同自然日独立正确、最近 4
        次均独立正确、至少 2 张不同题卡独立正确，且首次与最后一次成功相隔至少 14
        天。四项同时满足才标记；后续不会或需提示会回到需巩固。
      </span>
    </div>
  );
}
