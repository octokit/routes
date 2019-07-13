const { test } = require('tap')

const {
  getAllDocumentationUrls,
  getRoutesForUrl,
  getGheVersion,
  getBaseUrl,
  getCacheDir,
  getRoutesDir,
  wrapOperation
} = require('../util')
const getEndpoint = require('../../lib/endpoint/get')
const Cache = require('../../lib/cache')

const URLS = getAllDocumentationUrls()

URLS.forEach(url => {
  test(`${url} to JSON separate route files in routes/**/*.json`, async t => {
    const expected = getRoutesForUrl(url)

    let actual = await getEndpoint({
      cached: true,
      cache: new Cache(getCacheDir()),
      baseUrl: getBaseUrl(),
      folderName: getRoutesDir(),
      gheVersion: getGheVersion(),
      memoryCache: {}
    }, url)
    actual = actual.map(wrapOperation)

    t.deepEquals(actual, expected)
    t.end()
  })
})
