const { test } = require('tap')

const { getAllRoutesByDocumentUrl, getAllDocumentationUrls } = require('../util')
const getEndpoint = require('../../lib/endpoint/get')

// Add URL(s) below for endpoints that you are currently debugging
// set `cached: false` to update local cache
const routesbByDocumentationUrl = getAllRoutesByDocumentUrl()
const URLS = getAllDocumentationUrls()

URLS.forEach(url => {
  test(`${url} to JSON from index.json`, async t => {
    const expected = routesbByDocumentationUrl[url]
    const actual = await getEndpoint({
      cached: true
    }, url)

    t.deepEquals(actual, expected)
    t.end()
  })
})
