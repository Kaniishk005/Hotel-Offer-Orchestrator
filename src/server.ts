import { createApp } from './app.js';
import { config } from './config.js';
import { closeRedisClient } from './redis/client.js';
import { closeTemporalClient } from './temporal/client.js';

const server = createApp().listen(config.port, () => {
  console.log(`Hotel API listening on http://localhost:${config.port}`);
});

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received; shutting down`);
  server.close((error) => {
    void Promise.allSettled([closeRedisClient(), closeTemporalClient()])
      .then((results) => {
        for (const result of results) {
          if (result.status === 'rejected') {
            console.error('Connection shutdown failed', result.reason);
            process.exitCode = 1;
          }
        }
      })
      .catch((shutdownError: unknown) => {
        console.error('Connection shutdown failed', shutdownError);
        process.exitCode = 1;
      })
      .finally(() => {
        if (error) {
          console.error('HTTP server shutdown failed', error);
          process.exitCode = 1;
        }
      });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
