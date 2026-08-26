import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "誠創科技網站與內容管理後台",
  description: "POS 系統、電子發票、網站建置與設備整合服務",
  other:{"codex-preview":"development"},
  icons:{icon:"/logo.svg",shortcut:"/logo.svg"},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
