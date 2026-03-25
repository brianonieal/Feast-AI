// @version 1.1.0 - Ember
// Generic circuit breaker -- use to wrap any external service call
//
// States:
//   CLOSED    -- normal operation, calls pass through
//   OPEN      -- tripped, calls fail fast without hitting the service
//   HALF_OPEN -- testing recovery, one call allowed through
//
// Usage:
//   const breaker = new CircuitBreaker('resend', { failureThreshold: 3, recoveryTimeout: 60_000 })
//   const result = await breaker.call(() => resend.emails.send(...))

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold: number; // trips after N consecutive failures (default: 3)
  recoveryTimeout: number; // ms before attempting recovery (default: 60_000)
  halfOpenMaxAttempts: number; // test calls in half-open state (default: 1)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeout: 60_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private readonly config: CircuitBreakerConfig;
  readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.recoveryTimeout) {
        this.state = "HALF_OPEN";
        this.halfOpenAttempts = 0;
        console.log(
          `[CircuitBreaker:${this.name}] → HALF_OPEN (testing recovery)`
        );
      } else {
        throw new Error(
          `[CircuitBreaker:${this.name}] OPEN — service unavailable. ` +
            `Retrying in ${Math.round((this.config.recoveryTimeout - elapsed) / 1000)}s`
        );
      }
    }

    if (this.state === "HALF_OPEN") {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        throw new Error(
          `[CircuitBreaker:${this.name}] HALF_OPEN — max test attempts reached`
        );
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      console.log(`[CircuitBreaker:${this.name}] → CLOSED (recovered)`);
    }
    this.state = "CLOSED";
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (
      this.state === "HALF_OPEN" ||
      this.failures >= this.config.failureThreshold
    ) {
      this.state = "OPEN";
      console.error(
        `[CircuitBreaker:${this.name}] → OPEN after ${this.failures} failure(s). ` +
          `Recovery in ${this.config.recoveryTimeout / 1000}s`
      );
    }
  }

  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.halfOpenAttempts = 0;
  }
}

// Registry -- singleton breakers per service name
// Prevents creating multiple breakers for the same service
// NOTE: Module-level state. Resets on cold starts in
// serverless environments. Acceptable for v1.1.0 --
// persistent state via Redis can be added in v1.2.0+
const registry = new Map<string, CircuitBreaker>();

export function getBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker(name, config));
  }
  return registry.get(name)!;
}

export function getAllBreakerStates(): Record<
  string,
  { state: CircuitState; failures: number }
> {
  const result: Record<string, { state: CircuitState; failures: number }> = {};
  registry.forEach((breaker, name) => {
    result[name] = {
      state: breaker.getState(),
      failures: breaker.getFailures(),
    };
  });
  return result;
}
