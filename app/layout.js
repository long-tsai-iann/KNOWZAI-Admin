import "./globals.css";

export const metadata = {
  title: "攏災影管理後台",
  description: "攏災影 KNOW ZAI 內部管理後台，非公開頁面",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
