const { test } = require('tap')

const { getScopeRoutesByDocumentUrl, getAllDocumentationUrls } = require('../util')
const getEndpoint = require('../../lib/endpoint/get')
const Cache = require('../../lib/cache')

getAllDocumentationUrls().forEach(url => {
  const [, scope] = url.match(/\/v3\/([^/#]+)/)
  const routesByDocumentUrl = getScopeRoutesByDocumentUrl(scope)

  test(`${url} to JSON from routes/${scope}.json`, async t => {
    const expected = routesByDocumentUrl[url]
    const actual = await getEndpoint({
      cached: true,
      cache: new Cache('api.github.com'),
      baseUrl: 'https://developer.github.com/v3/',
      folderName: 'api.github.com'
    }, url)

    t.deepEquals(actual, expected)
    t.end()
  })
})
