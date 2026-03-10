"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivatePoolButtonProps {
  poolId: string;
}

export function ActivatePoolButton({ poolId }: ActivatePoolButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/v1/pools/${poolId}/activate`, {
      method: "POST",
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error?.message ?? "Failed to activate pool");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <Button onClick={handleActivate} disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Activating…
          </>
        ) : (
          "Activate Pool"
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Rosters lock and scoring begins.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
