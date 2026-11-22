import 'dotenv/config';

const parsePort = (value: string | undefined): number => {
  const port = Number(value ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
};

const parsePositiveInteger = (name: string, value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

export const config = {
  port: parsePort(process.env.PORT),
  temporalAddress: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
  temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
  temporalTaskQueue: process.env.TEMPORAL_TASK_QUEUE ?? 'hotel-offers',
  supplierApiBaseUrl: process.env.SUPPLIER_API_BASE_URL ?? 'http://localhost:3000',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  redisTtlSeconds: parsePositiveInteger('REDIS_TTL_SECONDS', process.env.REDIS_TTL_SECONDS, 600),
} as const;
