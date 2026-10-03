// Stand-in for Node-only modules (fs, path) that browser builds of WASM tools reference in a
// branch they never take in the browser. See turbopack.resolveAlias in next.config.
const empty = {};
export default empty;
