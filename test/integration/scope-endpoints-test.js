const { test } = require('tap')

const {
  getScopeRoutesByDocumentUrl,
  getAllDocumentationUrls,
  getGheVersion,
  getBaseUrl,
  getCacheDir,
  getRoutesDir
} = require('../util')
const getEndpoint = require('../../lib/endpoint/get')
const Cache = require('../../lib/cache')

getAllDocumentationUrls().forEach(url => {
  const [, scope] = url.match(/\/v3\/([^/#]+)/)
  const routesByDocumentUrl = getScopeRoutesByDocumentUrl(scope)

  test(`${url} to JSON from routes/${scope}.json`, async t => {
    const expected = routesByDocumentUrl[url]
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
