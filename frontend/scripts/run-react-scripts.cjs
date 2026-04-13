#!/usr/bin/env node
/**
 * Runs react-scripts with env tuned for Node 18 (Docker) vs Node 22+ (local webpack).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { buildEnvForReactScripts } = require('./cra-node-env.cjs');

const command = process.argv[2];
if (!command) {
  console.error('Usage: node run-react-scripts.cjs <start|build|test> [...args]');
  process.exit(1);
}

const extraArgs = process.argv.slice(3);
const reactScriptsBin = require.resolve('react-scripts/bin/react-scripts.js');
const env = buildEnvForReactScripts(process.env);

const result = spawnSync(process.execPath, [reactScriptsBin, command, ...extraArgs], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env,
  shell: false,
});

process.exit(result.status === null ? 1 : result.status);
