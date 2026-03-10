# PoolHockey Project Memory

## Project Overview
Hockey pool platform - web app (Next.js) with future mobile support.
Users create pools, invite friends, draft/assign NHL players, compete on leaderboards.

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (radix-nova style, neutral base color)
- PostgreSQL via Supabase
- Drizzle ORM (drizzle.config.ts uses DATABASE_URL)
- db/index.ts uses lazy Proxy pattern (fixes env load order for CLI scripts)
- **Supabase Auth** (NOT custom JWT/bcrypt)
- Zod v4 (import from "zod/v4")
- tsconfig-paths for CLI scripts (register path aliases)

## Database Connection
- Uses session-mode pooler: port 5432 at pooler.supabase.com
- Transaction pooler (port 6543) does NOT work for schema introspection
- Direct host (db.xxx.supabase.co) has DNS resolution issues on this machine
- prepare: false is set on postgres client (required for pooler)

## Auth Approach
- Supabase Auth handles all auth
- App `users` table is profile table linked to `auth.users.id`
- Profile creation via POST /api/v1/auth/profile (server session, never client ID)
- Username lowercase, 3-20 chars, alphanumeric + hyphens/underscores
- Email confirmation disabled for development

## NHL Data
- nhl_teams uses TEXT PK (team abbreviation like "EDM", "TOR")
- nhl_players.teamId is TEXT FK → nhl_teams.id
- NHL API at api-web.nhle.com, no API key needed
- Season: do NOT hardcode in route logic, use a central helper/constant
- Scripts in scripts/ use tsconfig-paths register() for @/ alias
- Stat keys: goals, assists, points, plus_minus, pim, shots, hits, blocked_shots, pp_goals, wins, losses, saves, goals_against, save_pct, shutouts

## Database: 11 tables
users, pools, pool_settings, scoring_rules, pool_members,
nhl_teams (TEXT PK), nhl_players, nhl_game_stats, roster_entries,
daily_scores, total_scores

## Build Progress
1. Project setup + DB schema — DONE
2. Auth (Supabase Auth) — DONE
3. NHL data pipeline — DONE (32 teams, ~750 players, stats syncing)
4. Pool creation + invite — DONE
5. Roster management — NEXT
6. Scoring + leaderboards
7. Polish + deploy

## Key Files
- src/lib/supabase/client.ts, server.ts, middleware.ts — Supabase clients
- src/lib/db/index.ts — lazy Proxy db client
- src/lib/auth/session.ts — getUser() and getAuthUser()
- src/lib/auth/validation.ts — Zod schemas
- src/lib/utils/api-response.ts — success() and error()
- src/lib/nhl/client.ts — fetchNHL() wrapper
- src/lib/nhl/sync-teams.ts, sync-players.ts, sync-stats.ts
- src/lib/nhl/stat-keys.ts — stat normalization constants
- src/lib/pools/season.ts — CURRENT_SEASON_API + CURRENT_SEASON_DISPLAY + getCurrentSeason()
- src/lib/pools/classic-rules.ts — 6 classic scoring rule definitions
- src/lib/pools/invite.ts — generateInviteCode() using nanoid(8)
- src/lib/pools/validation.ts — createPoolSchema, joinPoolSchema
- src/lib/db/schema/relations.ts — all Drizzle relations (required for with: queries)
- scripts/sync-nhl-players.ts, sync-nhl-stats.ts — CLI scripts

## Architecture Details
See: architecture.md
