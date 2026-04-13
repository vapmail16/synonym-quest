/**
 * Node 22+ can enable experimental Web Storage; CRA's html-webpack-plugin then throws unless
 * --no-experimental-webstorage is set. That flag must be propagated to child Node processes
 * (webpack workers), so it belongs in NODE_OPTIONS for the react-scripts process.
 *
 * Node 18 (e.g. Docker / dcdeploy) rejects this flag inside NODE_OPTIONS, so we must not set
 * it there when major < 22. Node 18 also does not need it for the build.
 */
const WEB_STORAGE_FLAG = '--no-experimental-webstorage';

function buildEnvForReactScripts(baseEnv, versionString) {
  const env = { ...baseEnv };
  const v = versionString || process.version;
  const major = parseInt(v.slice(1).split('.')[0], 10) || 0;

  if (major >= 22) {
    const existing = (env.NODE_OPTIONS || '').trim();
    env.NODE_OPTIONS = [existing, WEB_STORAGE_FLAG].filter(Boolean).join(' ').trim();
  }

  return env;
}

module.exports = { buildEnvForReactScripts, WEB_STORAGE_FLAG };
