import { randomUUID } from 'node:crypto';
import { Client, Connection } from '@temporalio/client';
import { config } from '../config.js';
import type { HotelResult } from '../types/hotel.js';
import { hotelOrchestrationWorkflow } from './workflows.js';

let clientPromise: Promise<Client> | undefined;
let connection: Connection | undefined;

const createClient = async (): Promise<Client> => {
  const connected = await Connection.connect({ address: config.temporalAddress });
  connection = connected;
  return new Client({ connection: connected, namespace: config.temporalNamespace });
};

export const closeTemporalClient = async (): Promise<void> => {
  const activeConnection = connection;
  connection = undefined;
  clientPromise = undefined;
  await activeConnection?.close();
};

const getClient = (): Promise<Client> => {
  clientPromise ??= createClient().catch((error: unknown) => {
    clientPromise = undefined;
    throw error;
  });
  return clientPromise;
};

export const getHotelOffers = async (city: string): Promise<HotelResult[]> => {
  const client = await getClient();
  return client.workflow.execute(hotelOrchestrationWorkflow, {
    args: [{ city }],
    taskQueue: config.temporalTaskQueue,
    workflowId: `hotel-offers-${randomUUID()}`,
  });
};
