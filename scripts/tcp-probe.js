#!/usr/bin/env node
/**
 * Standalone TCP probe.
 *
 * Node has no synchronous socket API, and `doctor --deep` needs a sync answer
 * to report reachability inline. This used to be a JS string passed to
 * `node -e`, which is indistinguishable from generated-code execution to a
 * supply-chain scanner. Running a real file with argv keeps the same behaviour
 * without building and executing source at runtime.
 *
 * Exit codes: 0 = connected, 1 = refused/error, 2 = timeout, 3 = bad usage.
 */
const net = require('net');

const port = Number(process.argv[2]);
const host = process.argv[3] || '127.0.0.1';
const timeout = Number(process.argv[4]) || 1000;

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  process.exit(3);
}

const socket = net.connect(port, host);

function done(code) {
  try {
    socket.destroy();
  } catch {}
  process.exit(code);
}

socket.setTimeout(timeout, () => done(2));
socket.on('connect', () => done(0));
socket.on('error', () => done(1));
