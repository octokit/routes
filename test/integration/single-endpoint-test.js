const { test } = require('tap')

const {
  getAllDocumentationUrls,
  getRoutesForUrl
} = require('../util')
const getEndpoint = require('../../lib/endpoint/get')
const Cache = require('../../lib/cache')

const URLS = getAllDocumentationUrls()

URLS.forEach(url => {
  test(`${url} to JSON separate route files in routes/**/*.json`, async t => {
    const expected = getRoutesForUrl(url)

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
