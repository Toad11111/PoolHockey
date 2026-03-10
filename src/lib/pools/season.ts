/**
 * Returns the current NHL season string used for roster syncing and pool creation.
 * Format: "YYYYYYYY" for API calls, "YYYY-YYYY" for display.
 *
 * To advance the season, change CURRENT_SEASON_API here only.
 * Nothing else in the codebase hardcodes the season.
 */
export const CURRENT_SEASON_API = "20252026"; // used by NHL API calls
export const CURRENT_SEASON_DISPLAY = "2025-2026"; // stored on pools.season

/**
 * Returns the season string to store on a new pool.
 */
export function getCurrentSeason(): string {
  return CURRENT_SEASON_DISPLAY;
}
