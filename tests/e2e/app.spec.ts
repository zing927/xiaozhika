import { test, expect } from "@playwright/test";
test("parent training, persistence, undo, navigation and settings", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /每天一小步/ })).toBeVisible();
  await page.getByRole("link", { name: /开始今日陪练/ }).click();
  await page.getByRole("button", { name: "开始抽卡", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "独立会", exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /翻卡看答案/ }).click();
  await page.getByRole("button", { name: /独立会/ }).click();
  await expect(page.getByText("第 2 / 10 张")).toBeVisible();
  await page.getByRole("button", { name: "暂停训练" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "休息一下，随时回来" }),
  ).toBeVisible();
  await page
    .locator("section")
    .getByRole("button", { name: "恢复训练" })
    .click();
  await page.getByRole("button", { name: /撤销上次评分/ }).click();
  await expect(page.getByText("第 1 / 10 张")).toBeVisible();
  await expect(page.getByRole("button", { name: /独立会/ })).toBeVisible();
  await page.getByRole("button", { name: /提示后会/ }).click();
  await page.getByRole("link", { name: "学习报告", exact: true }).click();
  await expect(page.getByText("提示后会", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "知识地图", exact: true }).click();
  await expect(page.getByText("已掌握", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "设置", exact: true }).click();
  await page.getByLabel("练习科目").selectOption("数学");
  await page.reload();
  await expect(page.getByLabel("练习科目")).toHaveValue("数学");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("finishing a session keeps undo available and does not claim mastery", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("每次卡片数量").selectOption("5");
  await page.getByRole("link", { name: "抽卡训练", exact: true }).click();
  await page.getByRole("button", { name: "开始抽卡", exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: /翻卡看答案/ }).click();
    await page.getByRole("button", { name: /独立会/ }).click();
    await page.waitForTimeout(280);
  }
  await expect(
    page.getByRole("heading", { name: "今天的这一小步，完成了！" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /撤销上次评分/ }).click();
  await expect(page.getByText("第 5 / 5 张")).toBeVisible();
});
test("corrupt storage is preserved and reported", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("xiaozhika:v1", "broken"));
  await page.reload();
  await expect(page.locator("main [role=alert]")).toContainText("原数据已保留");
  expect(await page.evaluate(() => localStorage.getItem("xiaozhika:v1"))).toBe(
    "broken",
  );
});
test("storage failure never advances a grade", async ({ page }) => {
  await page.goto("/train");
  await page.getByRole("button", { name: "开始抽卡", exact: true }).click();
  await page.getByRole("button", { name: /翻卡看答案/ }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: /独立会/ }).click();
  await expect(page.locator("main [role=alert]")).toContainText("保存失败");
  await expect(page.getByText("第 1 / 10 张")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("xiaozhika:v1")!).reviews.length,
    ),
  ).toBe(0);
});
test("map renders all mastery criteria and revokes after failure", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const reviews = [1, 3, 7, 15].map((d, i) => ({
      id: String(i),
      cardId: i === 1 ? "addition-2" : "addition-1",
      grade: "independent",
      at: `2026-01-${String(d).padStart(2, "0")}T12:00:00.000Z`,
      day: `2026-01-${String(d).padStart(2, "0")}`,
    }));
    localStorage.setItem(
      "xiaozhika:v1",
      JSON.stringify({
        version: 1,
        reviews,
        session: null,
        settings: { subject: "全部", count: 10 },
      }),
    );
  });
  await page.goto("/map");
  const knowledge = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "10以内加法" }) });
  await expect(knowledge.getByText("已掌握", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("xiaozhika:v1")!);
    s.reviews.push({
      id: "failure",
      cardId: "addition-1",
      grade: "hint",
      at: "2026-01-16T12:00:00.000Z",
      day: "2026-01-16",
    });
    localStorage.setItem("xiaozhika:v1", JSON.stringify(s));
  });
  await page.reload();
  await expect(knowledge.getByText("需巩固", { exact: true })).toBeVisible();
});
