import { ExternalLink as ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("hover:underline", className)}
    >
      {children}
      <ExternalLinkIcon
        size={12}
        className="ms-1 inline-block align-[-1px]"
        aria-hidden="true"
      />
      <span className="sr-only">(外部サイトが新しいタブで開きます)</span>
    </a>
  );
}
