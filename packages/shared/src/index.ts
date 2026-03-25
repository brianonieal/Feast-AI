// @version 0.1.0 - Foundation scaffold
// Barrel export for @feast-ai/shared

export * from "./types";
export * from "./schemas";
export * from "./constants";
export {
  colors, typography, spacing, radius, shadows, theme,
  FEAST_COLORS, FEAST_TYPOGRAPHY, FEAST_RADIUS, FEAST_SHADOW,
} from "./theme";

// @version 1.1.0 - Ember: circuit breaker
export { CircuitBreaker, getBreaker, getAllBreakerStates } from "./lib/circuitBreaker";
export type { CircuitState, CircuitBreakerConfig } from "./lib/circuitBreaker";
