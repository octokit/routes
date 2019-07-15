const { test } = require('tap')

const UTIL = require('../util')
const Cache = require('../../lib/cache')

const [
  gheVersion,
  baseUrl,
  cacheDir,
  routesRoot,
  routesDir
] = [
  UTIL.getGheVersion(),
  UTIL.getBaseUrl(),
  UTIL.getCacheDir(),
  UTIL.getRoutesRoot(),
  UTIL.getRoutesDir()
]

testEndpoints(UTIL.getAllDocumentationUrls())

async function testEndpoints (urls) {
  const state = {
    cached: true,
    cache: new Cache(cacheDir),
    baseUrl: baseUrl,
    folderName: routesDir,
    gheVersion: gheVersion,
    memoryCache: {}
  }
  const routeMap = await UTIL.getRouteMap(urls, state)
  urls.forEach(url => {
    const jsonFile = `./${routesRoot}/${routesDir}/index.json`
    test(`${url} to JSON from ${jsonFile}`, async t => {
      const expected = UTIL.getRoutesForUrl(url)
      const actual = routeMap.get(url)
      t.deepEquals(actual, expected)
      t.end()
    })
  })
}
