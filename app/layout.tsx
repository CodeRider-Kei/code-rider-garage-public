import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SERVICE_NAME } from "@/lib/site-config";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// URL(本番の安定ドメイン)→ DEPLOY_PRIME_URL → ローカルの順に解決した
// アプリ自身のURL(next.config.ts / lib/site-url.ts 参照)。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SERVICE_NAME,
  description: "オートバイの整備履歴を記録・管理するアプリ",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <div className="pt-8 pb-16">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
