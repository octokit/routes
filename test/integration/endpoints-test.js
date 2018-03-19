const {test} = require('tap')

const DEFINITIONS = require('../..')
const getEndpoint = require('../../lib/endpoint/get')

const endpointsByDocumentationUrl = Object.keys(DEFINITIONS).reduce((map, scope) => {
  const endpoints = DEFINITIONS[scope]
  endpoints.forEach(endpoint => {
    const documentationUrl = endpoint.documentationUrl
    if (!map[documentationUrl]) {
      map[documentationUrl] = []
    }
    map[documentationUrl].push(endpoint)
  })

  return map
}, {})

// Add URL(s) below for endpoints that you are currently debugging
// set `cached: false` to update local cache
const URLS = [
  'https://developer.github.com/v3/repos/#get'
]

URLS.forEach(url => {
  test(`${url} to JSON`, async t => {
    const expected = endpointsByDocumentationUrl[url]
    const actual = await getEndpoint({
      cached: true
    }, url)

    t.deepEquals(actual, expected)
    t.end()
  })
})
