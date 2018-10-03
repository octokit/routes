const { test } = require('tap')

const { getScopeRoutesByDocumentUrl, getAllDocumentationUrls } = require('../util')
const getEndpoint = require('../../lib/endpoint/get')

getAllDocumentationUrls().forEach(url => {
  const [, scope] = url.match(/\/v3\/([^/#]+)/)
  const routesByDocumentUrl = getScopeRoutesByDocumentUrl(scope)

  test(`${url} to JSON from routes/${scope}.json`, async t => {
    const expected = routesByDocumentUrl[url]
    const actual = await getEndpoint({
      cached: true
    }, url)

    t.deepEquals(actual, expected)
    t.end()
  })
})
