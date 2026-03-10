import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { poolMembers, pools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/pools/empty-state";

export default async function PoolsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const memberships = await db
    .select({
      role:     poolMembers.role,
      poolId:   pools.id,
      poolName: pools.name,
      status:   pools.status,
      season:   pools.season,
    })
    .from(poolMembers)
    .innerJoin(pools, eq(poolMembers.poolId, pools.id))
    .where(eq(poolMembers.userId, user.id))
    .orderBy(pools.createdAt);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Pools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {memberships.length === 0
              ? "Get started by creating or joining a pool."
              : `${memberships.length} pool${memberships.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/pools/join">Join Pool</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/pools/new">New Pool</Link>
          </Button>
        </div>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          title="No pools yet"
          description="Create your own pool or ask someone for an invite code to join theirs."
          action={{ label: "New Pool", href: "/pools/new" }}
          secondaryAction={{ label: "Join Pool", href: "/pools/join" }}
        />
      ) : (
        <div className="space-y-2">
          {memberships.map((m) => (
            <Link key={m.poolId} href={`/pools/${m.poolId}`} className="block">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate font-semibold leading-tight">
                    {m.poolName}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {m.season} · {m.role === "host" ? "Host" : "Member"}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  <StatusBadge status={m.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
