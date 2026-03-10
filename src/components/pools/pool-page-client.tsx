"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { InviteCodeDisplay } from "@/components/pools/invite-code-display";
import { ActivatePoolButton } from "@/components/pools/activate-pool-button";
import { GlobalStandingsCard } from "@/components/pools/global-standings-card";
import { DailyStandingsCard } from "@/components/pools/daily-standings-card";
import { RosterView } from "@/components/pools/roster-view";
import { TopPlayersCard } from "@/components/pools/top-players-card";
import { DateNav } from "@/components/pools/date-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandingsMember } from "@/components/pools/global-standings-card";
import type { RosterEntryData } from "@/components/pools/roster-view";
import type { TopPlayer } from "@/components/pools/top-players-card";

type Settings = {
  rosterSize: number;
  maxForwards: number;
  maxDefensemen: number;
  maxGoalies: number;
  maxWildcards: number;
};

type Pool = {
  id: string;
  name: string;
  season: string;
  status: string;
  inviteCode: string;
};

type Props = {
  pool: Pool;
  settings: Settings | null;
  currentUserId: string;
  isHost: boolean;
  members: StandingsMember[];
  allRosters: Record<string, RosterEntryData[]>;
  selectedDate: string | null;
  selectedDatePoints: Record<string, Record<string, number>>;
  playerStats: Record<string, Record<string, { goals: number; assists: number }>>;
  poolTotalPoints: Record<string, Record<string, number>>;
  activeDateIds: number[];
  availableDates: string[];
  dailyPointsMap: Record<string, string>;
  globalTopPlayers: TopPlayer[];
};

export function PoolPageClient({
  pool,
  settings,
  currentUserId,
  isHost,
  members,
  allRosters,
  selectedDate,
  selectedDatePoints,
  playerStats,
  poolTotalPoints,
  activeDateIds,
  availableDates,
  dailyPointsMap,
  globalTopPlayers,
}: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState(currentUserId);

  const selectedMember = members.find((m) => m.userId === selectedMemberId);
  const selectedMemberName =
    selectedMember?.displayName ?? selectedMember?.username ?? "Member";

  return (
    <div className="space-y-6">
      {/* Full-width header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pool.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pool.season} · {members.length}{" "}
            {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <StatusBadge status={pool.status} />
      </div>

      {/* Setup banner */}
      {pool.status === "setup" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-amber-500/70">
                Invite Code
              </p>
              <InviteCodeDisplay inviteCode={pool.inviteCode} />
              <p className="mt-2 text-xs text-muted-foreground">
                Share this code to invite players to your pool.
              </p>
            </div>
            {isHost && (
              <div className="shrink-0">
                <ActivatePoolButton poolId={pool.id} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-column grid — standings DOM-first (appears above roster on mobile) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_272px]">
        {/* Right: standings */}
        <div className="lg:col-start-2 lg:row-start-1 space-y-4">
          <GlobalStandingsCard
            members={members}
            currentUserId={currentUserId}
            selectedMemberId={selectedMemberId}
            onSelect={setSelectedMemberId}
            poolStatus={pool.status}
          />
          {selectedDate && (
            <DailyStandingsCard
              members={members}
              dailyPointsMap={dailyPointsMap}
              selectedDate={selectedDate}
              currentUserId={currentUserId}
              selectedMemberId={selectedMemberId}
              onSelect={setSelectedMemberId}
            />
          )}
        </div>

        {/* Left: main content */}
        <div className="lg:col-start-1 lg:row-start-1 space-y-6">
          {/* Date navigation — shown only when there are scored dates */}
          {availableDates.length > 0 && selectedDate && (
            <div className="flex items-center justify-between">
              <DateNav
                poolId={pool.id}
                selectedDate={selectedDate}
                availableDates={availableDates}
              />
              <p className="text-xs text-muted-foreground">
                Click a member in Standings to view their roster
              </p>
            </div>
          )}

          {/* Roster */}
          {settings && (
            <RosterView
              poolId={pool.id}
              poolStatus={pool.status}
              currentUserId={currentUserId}
              selectedMemberId={selectedMemberId}
              selectedMemberName={selectedMemberName}
              allRosters={allRosters}
              selectedDatePoints={selectedDatePoints}
              poolTotalPoints={poolTotalPoints}
              playerStats={playerStats}
              selectedDate={selectedDate}
              activeDateIds={activeDateIds}
              settings={settings}
            />
          )}

          {/* Global top NHL players for selected date */}
          {selectedDate && globalTopPlayers.length > 0 && (
            <TopPlayersCard
              players={globalTopPlayers}
              selectedDate={selectedDate}
            />
          )}

          {/* Pool settings */}
          {settings && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Pool Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Roster size</dt>
                    <dd className="mt-0.5 font-semibold">{settings.rosterSize}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Forwards</dt>
                    <dd className="mt-0.5 font-semibold">{settings.maxForwards}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Defensemen</dt>
                    <dd className="mt-0.5 font-semibold">{settings.maxDefensemen}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Goalies</dt>
                    <dd className="mt-0.5 font-semibold">{settings.maxGoalies}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Wildcards</dt>
                    <dd className="mt-0.5 font-semibold">{settings.maxWildcards}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
