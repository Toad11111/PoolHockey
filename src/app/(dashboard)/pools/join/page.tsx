"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function JoinPoolPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/pools/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error?.message ?? "Failed to join pool");
        return;
      }

      router.push(`/pools/${result.data.poolId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <Link href="/pools" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← My Pools
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Join a Pool</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enter invite code</CardTitle>
          <CardDescription>
            Ask the pool host for their 8-character invite code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="e.g. eqxjI6KO"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError(null);
                }}
                required
                maxLength={8}
                className="font-mono tracking-widest"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading || inviteCode.trim().length === 0}>
              {loading ? "Joining..." : "Join Pool"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
