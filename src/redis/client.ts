import { createClient, type RedisClientType } from 'redis';
import { config } from '../config.js';

let client: RedisClientType | undefined;
let connectionPromise: Promise<RedisClientType> | undefined;

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (client?.isReady === true) return client;
  if (connectionPromise !== undefined) return connectionPromise;

  client = createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: false,
    },
  });
  client.on('error', (error: Error) => {
    console.error('Redis client error', { message: error.message, stack: error.stack });
  });

  const connectingClient = client;
  connectionPromise = connectingClient.connect()
    .then(() => connectingClient)
    .catch((error: unknown) => {
      client = undefined;
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
};

export const closeRedisClient = async (): Promise<void> => {
  const activeClient = client;
  client = undefined;
  connectionPromise = undefined;

  if (activeClient?.isOpen === true) {
    await activeClient.close();
  }
};
