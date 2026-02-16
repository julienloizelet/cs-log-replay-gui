export type WizardStep = 'log-input' | 'executing' | 'results';

export interface CommandOutput {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data: string;
  code?: number;
}

export interface AlertDecision {
  duration: string;
  id: number;
  origin: string;
  scenario: string;
  scope: string;
  simulated: boolean;
  type: string;
  value: string;
}

export interface AlertSource {
  as_name: string;
  as_number: string;
  cn: string;
  ip: string;
  latitude: number;
  longitude: number;
  range: string;
  scope: string;
  value: string;
}

export interface Alert {
  capacity: number;
  created_at: string;
  decisions: AlertDecision[] | null;
  events: unknown[];
  events_count: number;
  id: number;
  leakspeed: string;
  machine_id: string;
  message: string;
  scenario: string;
  scenario_hash: string;
  scenario_version: string;
  simulated: boolean;
  source: AlertSource;
  start_at: string;
  stop_at: string;
}

export interface ReplayResult {
  alerts: Alert[];
  explainOutput: string;
}
