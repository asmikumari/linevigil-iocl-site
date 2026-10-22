// Single source of truth for how distance to a pipeline maps to risk. Used by permit filing,
// the live collision check and patrol proximity alerts so they can never disagree.

const RISK_THRESHOLDS_M = Object.freeze({ high: 500, medium: 1000 });

// Distance used when no pipeline is known: treated as far away.
const NO_PIPELINE_DISTANCE_M = 5000;

function classifyRisk(distanceMetres) {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    throw new TypeError('distanceMetres must be a non-negative number');
  }
  if (distanceMetres < RISK_THRESHOLDS_M.high) return 'high';
  if (distanceMetres < RISK_THRESHOLDS_M.medium) return 'medium';
  return 'low';
}

// How the contractor's map shows a level.
const COLLISION_STATUS = Object.freeze({ high: 'danger', medium: 'warning', low: 'safe' });

module.exports = { RISK_THRESHOLDS_M, NO_PIPELINE_DISTANCE_M, classifyRisk, COLLISION_STATUS };
