/**
 * Classic scoring rules inserted into scoring_rules when a pool is created
 * with scoring_mode = 'classic'.
 *
 * 6 rows per pool. To change defaults, edit here only.
 */
export const CLASSIC_RULES = [
  { statKey: "goals",    positionGroup: "forward",    pointsValue: "2" },
  { statKey: "assists",  positionGroup: "forward",    pointsValue: "1" },
  { statKey: "goals",    positionGroup: "defenseman", pointsValue: "3" },
  { statKey: "assists",  positionGroup: "defenseman", pointsValue: "2" },
  { statKey: "wins",     positionGroup: "goalie",     pointsValue: "3" },
  { statKey: "shutouts", positionGroup: "goalie",     pointsValue: "5" },
] as const;
