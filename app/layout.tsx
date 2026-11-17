import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "小知卡 · 每天一点，慢慢掌握",
  description: "一年级家长陪练工具，语文数学原创演示卡片与间隔复习。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
