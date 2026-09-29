export const QUALIFICATION_EXECUTION_FLOOR = 4;
export const QUALIFICATION_LOGIC_FLOOR = 32;

function positiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

export type CapacityConfig = {
  executionPerDevice: number;
  logic: number;
};

export function capacityConfig(env: NodeJS.ProcessEnv = process.env): CapacityConfig {
  return {
    executionPerDevice: positiveInt("WORKBRIDGE_EXECUTION_CAPACITY", env.WORKBRIDGE_EXECUTION_CAPACITY, QUALIFICATION_EXECUTION_FLOOR),
    logic: positiveInt("WORKBRIDGE_LOGIC_CAPACITY", env.WORKBRIDGE_LOGIC_CAPACITY, QUALIFICATION_LOGIC_FLOOR)
  };
}

export function qualificationStatus(config: CapacityConfig) {
  return {
    executionFloor: QUALIFICATION_EXECUTION_FLOOR,
    logicFloor: QUALIFICATION_LOGIC_FLOOR,
    executionMeetsFloor: config.executionPerDevice >= QUALIFICATION_EXECUTION_FLOOR,
    logicMeetsFloor: config.logic >= QUALIFICATION_LOGIC_FLOOR
  };
}
