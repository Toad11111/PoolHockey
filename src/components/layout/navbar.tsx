"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  username: string;
}

export function Navbar({ username }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/pools"
          className="text-lg font-bold tracking-tight text-primary transition-opacity hover:opacity-80"
        >
          PoolHockey
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
