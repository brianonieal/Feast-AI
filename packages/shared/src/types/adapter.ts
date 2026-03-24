// @version 0.2.0 - Conduit: adapter types for external integrations

/** Health check result for an external integration */
export interface AdapterHealthResult {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

/** Status of all integrations */
export interface IntegrationStatus {
  circle: AdapterHealthResult;
  hubspot: AdapterHealthResult;
  deepgram: AdapterHealthResult;
  wordpress: AdapterHealthResult;
  timestamp: string;
}

/** Base interface all adapters must implement */
export interface BaseAdapter {
  name: string;
  healthCheck(): Promise<AdapterHealthResult>;
}
