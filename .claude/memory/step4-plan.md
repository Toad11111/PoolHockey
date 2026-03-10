# Step 4 Plan — Pool Creation + Invite

## Files to Create (10)
- src/lib/pools/invite.ts — generate unique invite codes (nanoid 8 chars)
- src/lib/pools/classic-rules.ts — classic scoring rule definitions (6 rows)
- src/lib/pools/validation.ts — Zod schemas for pool creation
- src/lib/pools/season.ts — central season helper (DO NOT hardcode season in routes)
- src/app/api/v1/pools/route.ts — GET list, POST create
- src/app/api/v1/pools/[poolId]/route.ts — GET pool details
- src/app/api/v1/pools/[poolId]/join/route.ts — POST join
- src/app/api/v1/pools/[poolId]/members/route.ts — GET members
- src/app/api/v1/pools/[poolId]/activate/route.ts — POST activate
- src/app/(dashboard)/pools/new/page.tsx — create pool form
- src/app/(dashboard)/pools/[poolId]/page.tsx — pool dashboard shell

## Files to Modify (1)
- src/app/(dashboard)/pools/page.tsx — replace placeholder with pool list + New Pool button

## API Endpoints (6)
- GET /api/v1/pools — list user's pools
- POST /api/v1/pools — create pool (host)
- GET /api/v1/pools/:poolId — pool details (member only)
- POST /api/v1/pools/:poolId/join — join via invite code (setup only)
- GET /api/v1/pools/:poolId/members — list members (member only)
- POST /api/v1/pools/:poolId/activate — activate pool (host only)

## Classic Scoring Rules (6 rows per pool)
- goals/forward = 2
- assists/forward = 1
- goals/defenseman = 3
- assists/defenseman = 2
- wins/goalie = 3
- shutouts/goalie = 5

## Key Logic
- Position limits must sum to roster size (maxF + maxD + maxG + maxW === rosterSize)
- Invite code: nanoid(8), retry on collision
- Can only join pools in "setup" status
- Host is auto-added as pool_member with role "host"
- Only host can activate (setup → active)
- Non-members get 403 on pool details/members

## Test Plan (14 tests)
See the approved plan in conversation for full test details.
