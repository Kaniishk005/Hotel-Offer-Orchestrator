import { fileURLToPath } from 'node:url';
import { NativeConnection, Worker } from '@temporalio/worker';
import { config } from '../config.js';
import * as activities from './activities.js';

const run = async (): Promise<void> => {
  const connection = await NativeConnection.connect({ address: config.temporalAddress });
  const workflowExtension = new URL(import.meta.url).pathname.endsWith('.ts') ? 'ts' : 'js';
  const worker = await Worker.create({
    connection,
    namespace: config.temporalNamespace,
    taskQueue: config.temporalTaskQueue,
    workflowsPath: fileURLToPath(new URL(`./workflows.${workflowExtension}`, import.meta.url)),
    activities,
    interceptors: {
      activity: [() => ({
        outbound: {
          getLogAttributes(input, next) {
            const attributes = { ...next(input) };
            delete attributes.taskToken;
            return attributes;
          },
        },
      })],
    },
  });

  console.log(`Temporal worker listening on task queue "${config.temporalTaskQueue}"`);
  try {
    await worker.run();
  } finally {
    await connection.close();
  }
};

run().catch((error: unknown) => {
  console.error('Temporal worker failed', error);
  process.exitCode = 1;
});
