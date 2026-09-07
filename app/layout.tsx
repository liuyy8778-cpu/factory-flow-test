import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "廠務帳｜工廠進出貨請款",
  description: "車床來料、客戶加工圖面、派工、出貨與加工費請款管理。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
