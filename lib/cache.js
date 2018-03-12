const {existsSync, lstatSync, readFileSync, writeFileSync} = require('fs')
const {resolve: resolvePath, dirname} = require('path')
const mkdirp = require('mkdirp')

const normalizeHtml = require('js-beautify').html

const CACHE_DIR = resolvePath(__dirname, '..', 'cache')

const cache = {
  exists (path) {
    const cachePath = toCachePath(path)
    return existsSync(cachePath) && lstatSync(cachePath).isFile()
  },
  read (path) {
    return readFileSync(toCachePath(path), 'utf8')
  },
  write (path, data) {
    const cachePath = toCachePath(path)
    mkdirp.sync(dirname(cachePath))
    writeFileSync(cachePath, data)
  },
  writeHtml (path, data) {
    cache.write(path, normalizeHtml(data))
  },
  readJson (path) {
    return JSON.parse(cache.read(path))
  },
  writeJson (path, data) {
    cache.write(path, JSON.stringify(data, null, 2) + '\n')
  }
}

function toCachePath (path) {
  return resolvePath(CACHE_DIR, `./${path}`)
}

module.exports = cache
