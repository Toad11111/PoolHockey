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

interface FormState {
  name: string;
  rosterSize: string;
  maxForwards: string;
  maxDefensemen: string;
  maxGoalies: string;
  maxWildcards: string;
}

const DEFAULTS: FormState = {
  name:          "",
  rosterSize:    "15",
  maxForwards:   "8",
  maxDefensemen: "4",
  maxGoalies:    "2",
  maxWildcards:  "1",
};

export default function NewPoolPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const n = (val: string) => parseInt(val || "0", 10) || 0;

  const slotTotal =
    n(form.maxForwards) + n(form.maxDefensemen) + n(form.maxGoalies) + n(form.maxWildcards);

  const slotMismatch = form.rosterSize !== "" && slotTotal !== n(form.rosterSize);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slotMismatch) {
      setError("Position limits must add up to roster size.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name,
          rosterSize:    n(form.rosterSize),
          maxForwards:   n(form.maxForwards),
          maxDefensemen: n(form.maxDefensemen),
          maxGoalies:    n(form.maxGoalies),
          maxWildcards:  n(form.maxWildcards),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error?.message ?? "Failed to create pool");
        return;
      }

      router.push(`/pools/${result.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/pools" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← My Pools
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Create a Pool</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pool name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pool Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. Office Pool 2026"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              maxLength={50}
            />
          </CardContent>
        </Card>

        {/* Roster settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roster Settings</CardTitle>
            <CardDescription>
              Position limits must add up to roster size.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Roster Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.rosterSize}
                  onChange={(e) => set("rosterSize", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Forwards</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxForwards}
                  onChange={(e) => set("maxForwards", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Defensemen</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxDefensemen}
                  onChange={(e) => set("maxDefensemen", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Goalies</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxGoalies}
                  onChange={(e) => set("maxGoalies", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Wildcards</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxWildcards}
                  onChange={(e) => set("maxWildcards", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Live slot counter */}
            <div className={`text-sm ${slotMismatch ? "text-destructive" : "text-muted-foreground"}`}>
              Slots filled: {slotTotal} / {n(form.rosterSize)}
              {slotMismatch && " — must match roster size"}
            </div>
          </CardContent>
        </Card>

        {/* Scoring mode (display only — classic is the only MVP option) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring</CardTitle>
            <CardDescription>
              Classic scoring is applied automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Goals (F: 2pt, D: 3pt) · Assists (F: 1pt, D: 2pt) · Win (3pt) · Shutout (5pt)
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || slotMismatch}>
          {loading ? "Creating..." : "Create Pool"}
        </Button>
      </form>
    </div>
  );
}
