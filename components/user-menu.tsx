"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, Settings, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2"
          aria-label="アカウントメニューを開く"
        >
          <User size={16} className="text-muted-foreground shrink-0" />
          <span className="hidden sm:inline max-w-[160px] truncate">
            {email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard size={16} />
            ダッシュボード
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2">
            <Settings size={16} />
            アカウント設定
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/support" className="flex items-center gap-2">
            <Heart size={16} />
            応援する
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 cursor-pointer"
        >
          <LogOut size={16} />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
