const {
  ensureDir,
  pathExists,
  readFile,
  readJson,
  writeFile,
} = require("fs-extra");
const { resolve: resolvePath, dirname } = require("path");

const CACHE_DIR = resolvePath(__dirname, "..", "cache");

module.exports = class Cache {
  constructor(pathPrefix) {
    this.pathPrefix = pathPrefix;
  }

  exists(path) {
    return pathExists(toCachePath(this.pathPrefix, path));
  }

  read(path) {
    return readFile(toCachePath(this.pathPrefix, path), "utf8");
  }

  async write(path, data) {
    const cachePath = toCachePath(this.pathPrefix, path);
    await ensureDir(dirname(cachePath));
    return writeFile(cachePath, data);
  }

  writeHtml(path, data) {
    return this.write(path, data);
  }

  readJson(path) {
    return readJson(toCachePath(this.pathPrefix, path));
  }

  writeJson(path, data) {
    return this.write(path, JSON.stringify(data, null, 2) + "\n");
  }
};

function toCachePath(prefix, path) {
  return resolvePath(CACHE_DIR, `./${prefix}`, `./${path}`);
}
