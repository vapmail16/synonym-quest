const test = require('node:test');
const assert = require('node:assert');
const { buildEnvForReactScripts, WEB_STORAGE_FLAG } = require('./cra-node-env.cjs');

test('Node 18: do not touch NODE_OPTIONS (Docker / dcdeploy)', () => {
  const env = buildEnvForReactScripts({}, 'v18.20.0');
  assert.strictEqual(env.NODE_OPTIONS, undefined);
});

test('Node 20: do not touch NODE_OPTIONS', () => {
  const env = buildEnvForReactScripts({ FOO: '1' }, 'v20.10.0');
  assert.strictEqual(env.NODE_OPTIONS, undefined);
  assert.strictEqual(env.FOO, '1');
});

test('Node 22+: append web storage flag for webpack children', () => {
  const env = buildEnvForReactScripts({}, 'v25.2.0');
  assert.strictEqual(env.NODE_OPTIONS, WEB_STORAGE_FLAG);
});

test('Node 22+: merge with existing NODE_OPTIONS', () => {
  const env = buildEnvForReactScripts({ NODE_OPTIONS: '--max-old-space-size=4096' }, 'v22.0.0');
  assert.ok(env.NODE_OPTIONS.includes('--max-old-space-size=4096'));
  assert.ok(env.NODE_OPTIONS.includes(WEB_STORAGE_FLAG));
});
