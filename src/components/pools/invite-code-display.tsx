"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteCodeDisplayProps {
  inviteCode: string;
}

export function InviteCodeDisplay({ inviteCode }: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg bg-background/60 px-4 py-2 font-mono text-base tracking-[0.3em]">
        {inviteCode}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        aria-label="Copy invite code"
      >
        {copied ? (
          <Check className="size-4 text-emerald-400" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  );
}
