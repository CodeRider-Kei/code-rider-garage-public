import Link from "next/link";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { ExternalLink } from "@/components/external-link";
import { BLOG_NAME, BLOG_URL, X_HANDLE, X_URL } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="w-full flex flex-col items-center justify-center gap-3 border-t mx-auto text-center text-xs py-8 px-4">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/privacy" className="hover:underline">
          プライバシーポリシー
        </Link>
        <Link href="/terms" className="hover:underline">
          利用規約
        </Link>
        <ExternalLink href={BLOG_URL}>運営ブログ {BLOG_NAME}</ExternalLink>
        <ExternalLink href={X_URL}>X: {X_HANDLE}</ExternalLink>
      </div>
      <ThemeSwitcher />
    </footer>
  );
}
