import test from './testHarness.mjs';
import assert from 'assert';
import net from 'node:net';

import { StatusServer } from '../dist/server.js';

const getFreePort = async () =>
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(port);
        });
      } else {
        server.close();
        reject(new Error('Failed to acquire free port'));
      }
    });
  });

const occupyPort = async () =>
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve({ server, port: address.port });
      } else {
        server.close();
        reject(new Error('Failed to occupy port'));
      }
    });
  });

test('StatusServer.start uses the preferred port when it is free', async () => {
  const preferredPort = await getFreePort();
  const server = new StatusServer();
  try {
    const port = await server.start(preferredPort);
    assert.equal(port, preferredPort);
  } finally {
    await server.stop();
  }
});

test('StatusServer.start skips a port that is already in use', async () => {
  const { server: blocker, port: preferredPort } = await occupyPort();
  const server = new StatusServer();
  try {
    const port = await server.start(preferredPort);
    assert.notEqual(port, preferredPort);
  } finally {
    await server.stop();
    await new Promise((resolve) => blocker.close(resolve));
  }
});
