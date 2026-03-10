"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalculateScoresButtonProps {
  poolId: string;
}

export function CalculateScoresButton({ poolId }: CalculateScoresButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCalculate() {
    setLoading(true);
    setResult(null);
    setError(null);

    const res = await fetch(`/api/v1/pools/${poolId}/scores/calculate`, {
      method: "POST",
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error?.message ?? "Failed to calculate scores");
      setLoading(false);
      return;
    }

    setResult(
      `Updated ${json.data.date} — ${json.data.scoresWritten} member(s) processed.`
    );
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handleCalculate} disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Calculating…
          </>
        ) : (
          "Calculate Scores"
        )}
      </Button>
      {result && (
        <p className="text-xs text-emerald-400">{result}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
