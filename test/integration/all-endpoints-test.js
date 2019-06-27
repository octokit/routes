const { test } = require('tap')

const {
  getAllRoutesByDocumentUrl,
  getAllDocumentationUrls,
  getGheVersion,
  getBaseUrl,
  getCacheDir,
  getRoutesDir
} = require('../util')
const getEndpoint = require('../../lib/endpoint/get')
const Cache = require('../../lib/cache')

// Add URL(s) below for endpoints that you are currently debugging
// set `cached: false` to update local cache
const routesbByDocumentationUrl = getAllRoutesByDocumentUrl()
const URLS = getAllDocumentationUrls()

URLS.forEach(url => {
  test(`${url} to JSON from index.json`, async t => {
    const expected = routesbByDocumentationUrl[url]
    const actual = await getEndpoint({
      cached: true,
      cache: new Cache(getCacheDir()),
      baseUrl: getBaseUrl(),
      folderName: getRoutesDir(),
      gheVersion: getGheVersion(),
      memoryCache: {}
    }, url)

    t.deepEquals(actual, expected)
    t.end()
  })
})
