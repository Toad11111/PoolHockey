# PoolHockey Architecture Notes

## Folder Structure
- src/app/ - Next.js App Router pages + API routes
- src/lib/ - Business logic (db, auth, nhl, scoring, pools, utils)
- src/components/ - UI components organized by feature
- src/hooks/ - React hooks
- src/types/ - Shared types
- scripts/ - CLI scripts for NHL sync + score calc
- drizzle/ - DB migrations

## API Design
- 15 MVP endpoints under /api/v1/
- Stateless REST with JWT auth
- Consistent response envelope: { data, error }
- Mobile-ready from day one

## NHL Data Strategy
- Source: https://api-web.nhle.com (no API key needed)
- Player sync: daily at 6 AM ET
- Stat sync: every 15 min during game hours
- Score calc: runs after stat sync
- Stats normalized to consistent keys (goals, assists, wins, shutouts, etc.)
- Idempotent upserts (ON CONFLICT)

## Salary Cap (V2)
- Schema columns exist but are nullable/disabled
- Needs separate ingestion pipeline (PuckPedia or similar)
- Will NOT use NHL API for salary data
- Manual CSV upload as first implementation, automate later

## V2 Features
- Advanced scoring mode
- Live draft (snake, lottery)
- Trades + swaps
- Salary cap enforcement
- Notifications
- OAuth (Google, Apple)

## V3 Features
- Mobile app (React Native / Expo)
- Push notifications
- Playoff pools
- Chat per pool
- Public pool directory
- Premium tier
